"""
Retrieval service implementing:
  1. Vector search (pgvector cosine similarity)
  2. BM25 keyword search (PostgreSQL full-text search via ts_vector/ts_query)
  3. Reciprocal Rank Fusion (RRF) to merge both result sets
  4. Pre-LLM RBAC security filtering based on user roles and document security level
"""

import logging
import uuid
from typing import Dict, List, Optional

from google import genai
from google.genai import types
from sqlalchemy import cast, func, select, text, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.core import Chunk, Document, Embedding, SecurityLevel
from app.repositories.role import RoleRepository
from app.schemas.search import (
    GraphSearchRequest,
    GraphSearchResponse,
    HybridSearchRequest,
    HybridSearchResponse,
    SearchHit,
)

logger = logging.getLogger(__name__)

# ── Security Level Hierarchy ──────────────────────────────────────────────
# A user with a given max security clearance may access documents at or below
# that level. Order: PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED
SECURITY_HIERARCHY: Dict[str, int] = {
    "PUBLIC": 0,
    "INTERNAL": 1,
    "CONFIDENTIAL": 2,
    "RESTRICTED": 3,
}

# Role → maximum security level the role is allowed to access
ROLE_MAX_SECURITY: Dict[str, str] = {
    "ADMIN": "RESTRICTED",
    "MANAGER": "CONFIDENTIAL",
    "HR": "CONFIDENTIAL",
    "FINANCE": "CONFIDENTIAL",
    "USER": "INTERNAL",
    "VIEWER": "PUBLIC",
}

RRF_K = 60  # Reciprocal Rank Fusion constant


class RetrievalService:
    def __init__(self) -> None:
        if settings.gemini_api_key:
            self.gemini = genai.Client(api_key=settings.gemini_api_key)
        else:
            self.gemini = None

    # ── Public API ────────────────────────────────────────────────────────

    async def hybrid_search(
        self,
        request: HybridSearchRequest,
        *,
        tenant_id: str,
        user_id: str,
    ) -> HybridSearchResponse:
        """Run vector + BM25 search, fuse with RRF, then apply RBAC filter."""
        if not self.gemini:
            logger.warning("No Gemini API key – returning empty results.")
            return HybridSearchResponse(hits=[])

        top_k = request.top_k or 10
        final_limit = request.limit or 5

        try:
            # 1. Get user's max allowed security level
            max_security = await self._resolve_max_security(tenant_id, user_id)

            # 2. Embed the query
            embed_resp = self.gemini.models.embed_content(
                model="gemini-embedding-2",
                contents=request.query,
                config=types.EmbedContentConfig(output_dimensionality=768),
            )
            query_embedding = embed_resp.embeddings[0].values

            async with SessionLocal() as session:
                # 3. Vector search
                vector_hits = await self._vector_search(
                    session,
                    query_embedding=query_embedding,
                    tenant_id=tenant_id,
                    top_k=top_k,
                    document_ids=request.document_ids,
                )

                # 4. BM25 keyword search
                bm25_hits = await self._bm25_search(
                    session,
                    query=request.query,
                    tenant_id=tenant_id,
                    top_k=top_k,
                    document_ids=request.document_ids,
                )

            # 5. Reciprocal Rank Fusion
            fused = self._reciprocal_rank_fusion(vector_hits, bm25_hits)

            # 6. RBAC security filter (drop chunks the user cannot see)
            filtered = self._security_filter(fused, max_security)

            return HybridSearchResponse(hits=filtered[:final_limit])

        except Exception as e:
            logger.error(f"Hybrid search failed: {e}", exc_info=True)
            return HybridSearchResponse(hits=[])

    async def graph_search(
        self,
        request: GraphSearchRequest,
        *,
        tenant_id: str,
        user_id: str,
    ) -> GraphSearchResponse:
        # Phase 3 placeholder
        return GraphSearchResponse(hits=[])

    # ── Vector Search ─────────────────────────────────────────────────────

    async def _vector_search(
        self,
        session: AsyncSession,
        *,
        query_embedding: list,
        tenant_id: str,
        top_k: int,
        document_ids: Optional[List[str]] = None,
    ) -> List[SearchHit]:
        stmt = (
            select(
                Chunk,
                Embedding.embedding.cosine_distance(query_embedding).label("distance"),
            )
            .join(Embedding, Chunk.id == Embedding.chunk_id)
            .where(Chunk.tenant_id == tenant_id)
            .order_by("distance")
            .limit(top_k)
        )
        if document_ids:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))

        result = await session.execute(stmt)
        hits: List[SearchHit] = []
        for chunk, distance in result:
            hits.append(
                SearchHit(
                    chunk_id=str(chunk.id),
                    document_id=str(chunk.document_id),
                    text=chunk.chunk_text,
                    score=max(0.0, 1.0 - distance),
                    source_type="vector",
                    metadata={
                        "page_number": chunk.page_number,
                        "security_level": chunk.security_level.value
                        if chunk.security_level
                        else "INTERNAL",
                    },
                )
            )
        return hits

    # ── BM25 Full-Text Search ─────────────────────────────────────────────

    async def _bm25_search(
        self,
        session: AsyncSession,
        *,
        query: str,
        tenant_id: str,
        top_k: int,
        document_ids: Optional[List[str]] = None,
    ) -> List[SearchHit]:
        """
        Use PostgreSQL's built-in full-text search (ts_vector / ts_query)
        as a BM25-equivalent lexical retrieval pass.
        """
        # plainto_tsquery handles user input safely (no special operators)
        ts_query = func.plainto_tsquery("english", query)
        ts_vector = func.to_tsvector("english", Chunk.chunk_text)
        rank = func.ts_rank_cd(ts_vector, ts_query)

        stmt = (
            select(Chunk, rank.label("bm25_score"))
            .where(Chunk.tenant_id == tenant_id)
            .where(ts_vector.op("@@")(ts_query))
            .order_by(rank.desc())
            .limit(top_k)
        )
        if document_ids:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))

        result = await session.execute(stmt)
        hits: List[SearchHit] = []
        for chunk, bm25_score in result:
            hits.append(
                SearchHit(
                    chunk_id=str(chunk.id),
                    document_id=str(chunk.document_id),
                    text=chunk.chunk_text,
                    score=float(bm25_score),
                    source_type="bm25",
                    metadata={
                        "page_number": chunk.page_number,
                        "security_level": chunk.security_level.value
                        if chunk.security_level
                        else "INTERNAL",
                    },
                )
            )
        return hits

    # ── Reciprocal Rank Fusion ────────────────────────────────────────────

    @staticmethod
    def _reciprocal_rank_fusion(
        *result_lists: List[SearchHit],
        k: int = RRF_K,
    ) -> List[SearchHit]:
        """
        Merge multiple ranked lists using RRF.
        score = Σ 1 / (k + rank_i)   for each list the chunk appears in.
        """
        scores: Dict[str, float] = {}
        best_hit: Dict[str, SearchHit] = {}

        for result_list in result_lists:
            for rank, hit in enumerate(result_list, start=1):
                key = hit.chunk_id or f"{hit.document_id}:{hit.text[:80]}"
                scores[key] = scores.get(key, 0.0) + 1.0 / (k + rank)
                # Keep the hit object with the richest data
                if key not in best_hit or hit.score > best_hit[key].score:
                    best_hit[key] = hit

        # Build final list sorted by fused score
        fused: List[SearchHit] = []
        for key, fused_score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
            hit = best_hit[key].model_copy()
            hit.score = fused_score
            hit.source_type = "hybrid"
            fused.append(hit)

        return fused

    # ── RBAC Security Filter ──────────────────────────────────────────────

    @staticmethod
    def _security_filter(hits: List[SearchHit], max_security: str) -> List[SearchHit]:
        """
        Drop any chunks whose security_level exceeds the user's max clearance.
        This runs *before* the context is assembled into the LLM prompt, ensuring
        no restricted data leaks into generated answers.
        """
        max_rank = SECURITY_HIERARCHY.get(max_security, 1)
        filtered: List[SearchHit] = []
        for hit in hits:
            chunk_level = (hit.metadata or {}).get("security_level", "INTERNAL")
            chunk_rank = SECURITY_HIERARCHY.get(chunk_level, 1)
            if chunk_rank <= max_rank:
                filtered.append(hit)
            else:
                logger.info(
                    f"RBAC filter: dropped chunk {hit.chunk_id} "
                    f"(level={chunk_level}) for user with max={max_security}"
                )
        return filtered

    # ── Resolve User Security Clearance ───────────────────────────────────

    @staticmethod
    async def _resolve_max_security(tenant_id: str, user_id: str) -> str:
        """
        Look up the user's roles and return the highest security level
        they are allowed to access.
        """
        async with SessionLocal() as session:
            repo = RoleRepository(session)
            roles = await repo.list_roles_for_user(
                tenant_id=uuid.UUID(tenant_id),
                user_id=uuid.UUID(user_id),
            )
            role_names = [r.name for r in roles]

        if not role_names:
            return "PUBLIC"  # safest default

        max_level = "PUBLIC"
        for rn in role_names:
            allowed = ROLE_MAX_SECURITY.get(rn, "PUBLIC")
            if SECURITY_HIERARCHY.get(allowed, 0) > SECURITY_HIERARCHY.get(max_level, 0):
                max_level = allowed

        return max_level
