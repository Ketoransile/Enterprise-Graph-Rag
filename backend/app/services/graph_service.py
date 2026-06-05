"""Graph exploration service powered by Neo4j with a Postgres document fallback."""

import logging

from sqlalchemy import or_, select

from app.db.session import SessionLocal
from app.models.core import Chunk, Document
from app.schemas.graph import GraphEdge, GraphExploreRequest, GraphExploreResponse, GraphNode
from app.services.knowledge_graph_service import KnowledgeGraphService

logger = logging.getLogger(__name__)


class GraphService:
    def __init__(self) -> None:
        self.kg = KnowledgeGraphService()

    async def explore(
        self,
        request: GraphExploreRequest,
        *,
        tenant_id: str,
        user_id: str,
    ) -> GraphExploreResponse:
        """Query Neo4j first, then fall back to documents/chunks if no graph exists yet."""
        try:
            data = await self.kg.get_subgraph(
                tenant_id=tenant_id,
                query=request.query,
                limit=request.limit,
            )
        except Exception:
            logger.exception("Neo4j graph exploration failed; using document fallback graph.")
            data = {"nodes": [], "edges": []}

        if not data.get("nodes"):
            data = await self._document_fallback_graph(
                tenant_id=tenant_id,
                query=request.query,
                limit=request.limit,
            )

        nodes = [GraphNode(**n) for n in data.get("nodes", [])]
        edges = [GraphEdge(**e) for e in data.get("edges", [])]
        return GraphExploreResponse(nodes=nodes, edges=edges)

    async def _document_fallback_graph(
        self,
        *,
        tenant_id: str,
        query: str | None = None,
        limit: int = 100,
    ) -> dict[str, list[dict[str, str]]]:
        """Build a useful graph from Postgres documents/chunks when Neo4j is empty."""
        node_limit = max(1, min(limit, 250))
        doc_limit = max(1, min(node_limit, 50))
        chunk_limit = max(1, node_limit - doc_limit)
        normalized_query = (query or "").strip()

        async with SessionLocal() as session:
            doc_stmt = (
                select(Document)
                .where(Document.tenant_id == tenant_id)
                .order_by(Document.created_at.desc())
                .limit(doc_limit)
            )

            if normalized_query:
                like_query = f"%{normalized_query}%"
                doc_stmt = doc_stmt.where(
                    or_(
                        Document.title.ilike(like_query),
                        Document.file_name.ilike(like_query),
                    )
                )

            doc_result = await session.execute(doc_stmt)
            documents = list(doc_result.scalars().all())

            if normalized_query and not documents:
                chunk_doc_stmt = (
                    select(Document)
                    .join(Chunk, Chunk.document_id == Document.id)
                    .where(Document.tenant_id == tenant_id)
                    .where(Chunk.tenant_id == tenant_id)
                    .where(Chunk.chunk_text.ilike(f"%{normalized_query}%"))
                    .order_by(Document.created_at.desc())
                    .limit(doc_limit)
                )
                chunk_doc_result = await session.execute(chunk_doc_stmt)
                documents = list(chunk_doc_result.scalars().unique().all())

            if not documents:
                return {"nodes": [], "edges": []}

            document_ids = [document.id for document in documents]
            chunk_stmt = (
                select(Chunk)
                .where(Chunk.tenant_id == tenant_id)
                .where(Chunk.document_id.in_(document_ids))
                .order_by(Chunk.document_id.asc(), Chunk.chunk_index.asc())
                .limit(chunk_limit)
            )
            if normalized_query:
                chunk_stmt = chunk_stmt.where(Chunk.chunk_text.ilike(f"%{normalized_query}%"))

            chunk_result = await session.execute(chunk_stmt)
            chunks = list(chunk_result.scalars().all())

        nodes: list[dict[str, str]] = []
        edges: list[dict[str, str]] = []

        for document in documents:
            doc_node_id = f"document:{document.id}"
            nodes.append(
                {
                    "id": doc_node_id,
                    "label": document.title or document.file_name,
                    "type": "DOCUMENT",
                }
            )

        for chunk in chunks:
            chunk_node_id = f"chunk:{chunk.id}"
            doc_node_id = f"document:{chunk.document_id}"
            label = (chunk.chunk_text or "").strip().replace("\n", " ")
            nodes.append(
                {
                    "id": chunk_node_id,
                    "label": label[:96] or f"Chunk {chunk.chunk_index}",
                    "type": "CONCEPT",
                }
            )
            edges.append(
                {
                    "id": f"{doc_node_id}__contains__{chunk_node_id}",
                    "source": doc_node_id,
                    "target": chunk_node_id,
                    "type": "CONTAINS",
                }
            )

        return {"nodes": nodes, "edges": edges}
