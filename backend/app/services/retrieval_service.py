"""
Retrieval service implementing:
  1. Vector search (pgvector cosine similarity)
  2. BM25 keyword search (PostgreSQL full-text search via ts_vector/ts_query)
  3. Reciprocal Rank Fusion (RRF) to merge both result sets
  4. Pre-LLM RBAC security filtering based on user roles and document security level
"""

import logging
import math
import re
import uuid
from typing import Dict, List, Optional

from sqlalchemy import String, cast, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.core import Chunk, Document, Embedding, ProcessingStatus, SecurityLevel
from app.repositories.role import RoleRepository
from app.schemas.search import (
    GraphSearchRequest,
    GraphSearchResponse,
    HybridSearchRequest,
    HybridSearchResponse,
    SearchHit,
)
from app.services.ai_model_client import AIModelClient

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
        if settings.openai_api_key:
            self.models = AIModelClient()
        else:
            self.models = None

    # ── Public API ────────────────────────────────────────────────────────

    async def hybrid_search(
        self,
        request: HybridSearchRequest,
        *,
        tenant_id: str,
        user_id: str,
    ) -> HybridSearchResponse:
        """Run vector + BM25 search, fuse with RRF, then apply RBAC filter."""

        top_k = request.top_k or 10
        final_limit = request.limit or 5

        try:
            # 1. Get user's max allowed security level
            max_security = await self._resolve_max_security(tenant_id, user_id)

            async with SessionLocal() as session:
                # 2. BM25 keyword search does not depend on model-provider embeddings.
                bm25_hits = await self._bm25_search(
                    session,
                    query=request.query,
                    tenant_id=tenant_id,
                    top_k=top_k,
                    document_ids=request.document_ids,
                )
                if not bm25_hits:
                    bm25_hits = await self._keyword_search(
                        session,
                        query=request.query,
                        tenant_id=tenant_id,
                        top_k=top_k,
                        document_ids=request.document_ids,
                    )

                # 3. Vector search is best-effort because some OpenAI-compatible
                # providers expose /v1/responses but not /v1/embeddings.
                vector_hits: List[SearchHit] = []
                if self.models and settings.openai_embeddings_enabled:
                    try:
                        query_embedding = (await self.models.embed(request.query))[0]
                        vector_hits = await self._vector_search(
                            session,
                            query_embedding=query_embedding,
                            tenant_id=tenant_id,
                            top_k=top_k,
                            document_ids=request.document_ids,
                        )
                    except Exception as embed_err:
                        logger.warning(
                            "Vector search skipped because embeddings are unavailable: %s",
                            embed_err,
                        )
                else:
                    logger.info("Embeddings disabled or unavailable - using BM25 retrieval only.")

            # 4. Reciprocal Rank Fusion when vector results exist; otherwise keep BM25 ranking.
            fused = (
                self._reciprocal_rank_fusion(vector_hits, bm25_hits)
                if vector_hits
                else bm25_hits
            )
            if not fused:
                async with SessionLocal() as session:
                    fused = await self._recent_document_chunks(
                        session,
                        tenant_id=tenant_id,
                        top_k=top_k,
                        document_ids=request.document_ids,
                    )

            # 5. RBAC security filter (drop chunks the user cannot see)
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
                Document,
                Embedding.embedding.cosine_distance(query_embedding).label("distance"),
            )
            .join(Embedding, Chunk.id == Embedding.chunk_id)
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.tenant_id == tenant_id)
            .where(Document.tenant_id == tenant_id)
            .where(Document.processing_status == ProcessingStatus.COMPLETED)
            .order_by("distance")
            .limit(top_k)
        )
        if document_ids:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))

        result = await session.execute(stmt)
        hits: List[SearchHit] = []
        for chunk, document, distance in result:
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
                        "document_title": document.title,
                        "file_name": document.file_name,
                    },
                )
            )
        return hits

    async def _keyword_search(
        self,
        session: AsyncSession,
        *,
        query: str,
        tenant_id: str,
        top_k: int,
        document_ids: Optional[List[str]] = None,
    ) -> List[SearchHit]:
        """Fallback lexical search using OR matching when PostgreSQL FTS is too strict."""
        terms = self._query_terms(query)
        if not terms:
            return []

        conditions = [Chunk.chunk_text.ilike(f"%{term}%") for term in terms]
        stmt = (
            select(Chunk, Document)
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.tenant_id == tenant_id)
            .where(Document.tenant_id == tenant_id)
            .where(Document.processing_status == ProcessingStatus.COMPLETED)
            .where(or_(*conditions))
            .order_by(Chunk.updated_at.desc())
            .limit(top_k * 3)
        )
        if document_ids:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))

        result = await session.execute(stmt)
        rows = result.all()
        scored: List[SearchHit] = []
        for chunk, document in rows:
            chunk_text = chunk.chunk_text or ""
            lower_text = chunk_text.lower()
            matches = sum(1 for term in terms if term in lower_text)
            if matches == 0:
                continue
            scored.append(
                SearchHit(
                    chunk_id=str(chunk.id),
                    document_id=str(chunk.document_id),
                    text=chunk_text,
                    score=matches / len(terms),
                    source_type="keyword",
                    metadata={
                        "page_number": chunk.page_number,
                        "security_level": chunk.security_level.value
                        if chunk.security_level
                        else "INTERNAL",
                        "document_title": document.title,
                        "file_name": document.file_name,
                    },
                )
            )

        return sorted(scored, key=lambda hit: hit.score, reverse=True)[:top_k]

    async def _recent_document_chunks(
        self,
        session: AsyncSession,
        *,
        tenant_id: str,
        top_k: int,
        document_ids: Optional[List[str]] = None,
    ) -> List[SearchHit]:
        """Last-resort context for broad prompts like "summarize my uploaded PDFs"."""
        doc_stmt = (
            select(Document)
            .where(Document.tenant_id == tenant_id)
            .where(Document.processing_status == ProcessingStatus.COMPLETED)
            .order_by(Document.created_at.desc())
            .limit(top_k)
        )
        if document_ids:
            doc_stmt = doc_stmt.where(Document.id.in_(document_ids))

        doc_result = await session.execute(doc_stmt)
        documents = doc_result.scalars().all()
        if not documents:
            return []

        per_document_limit = max(1, math.ceil(top_k / len(documents)))
        chunks_by_document: List[tuple[Document, list[Chunk]]] = []

        for document in documents:
            chunk_stmt = (
                select(Chunk)
                .where(Chunk.tenant_id == tenant_id)
                .where(Chunk.document_id == document.id)
                .order_by(Chunk.chunk_index.asc())
                .limit(per_document_limit)
            )
            chunk_result = await session.execute(chunk_stmt)
            chunks_by_document.append((document, list(chunk_result.scalars().all())))

        hits: List[SearchHit] = []
        for chunk_index in range(per_document_limit):
            for document, chunks in chunks_by_document:
                if chunk_index >= len(chunks):
                    continue
                chunk = chunks[chunk_index]
                hits.append(
                    SearchHit(
                        chunk_id=str(chunk.id),
                        document_id=str(chunk.document_id),
                        text=chunk.chunk_text,
                        score=max(0.01, 1.0 - (len(hits) * 0.01)),
                        source_type="recent",
                        metadata={
                            "page_number": chunk.page_number,
                            "security_level": chunk.security_level.value
                            if chunk.security_level
                            else "INTERNAL",
                            "document_title": document.title,
                            "file_name": document.file_name,
                        },
                    )
                )
                if len(hits) >= top_k:
                    return hits

        return hits

    @staticmethod
    def _query_terms(query: str) -> List[str]:
        stop_words = {
            "about",
            "answer",
            "document",
            "documents",
            "file",
            "files",
            "from",
            "give",
            "have",
            "just",
            "know",
            "latest",
            "more",
            "tell",
            "this",
            "that",
            "what",
            "when",
            "where",
            "which",
            "with",
            "uploaded",
            "summarize",
            "summary",
        }
        terms = [
            term
            for term in re.findall(r"[a-zA-Z0-9]{3,}", query.lower())
            if term not in stop_words
        ]
        return terms[:8]

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
            select(Chunk, Document, rank.label("bm25_score"))
            .join(Document, Chunk.document_id == Document.id)
            .where(Chunk.tenant_id == tenant_id)
            .where(Document.tenant_id == tenant_id)
            .where(Document.processing_status == ProcessingStatus.COMPLETED)
            .where(ts_vector.op("@@")(ts_query))
            .order_by(rank.desc())
            .limit(top_k)
        )
        if document_ids:
            stmt = stmt.where(Chunk.document_id.in_(document_ids))

        result = await session.execute(stmt)
        hits: List[SearchHit] = []
        for chunk, document, bm25_score in result:
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
                        "document_title": document.title,
                        "file_name": document.file_name,
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
            t_id = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
            u_id = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))

            roles = await repo.list_roles_for_user(
                tenant_id=t_id,
                user_id=u_id,
            )
            role_names = [r.name for r in roles]

        if not role_names:
            logger.info(
                "User %s has no assigned roles; defaulting retrieval clearance to USER/INTERNAL.",
                user_id,
            )
            return ROLE_MAX_SECURITY["USER"]

        max_level = "PUBLIC"
        for rn in role_names:
            allowed = ROLE_MAX_SECURITY.get(rn, "PUBLIC")
            if SECURITY_HIERARCHY.get(allowed, 0) > SECURITY_HIERARCHY.get(max_level, 0):
                max_level = allowed

        return max_level
