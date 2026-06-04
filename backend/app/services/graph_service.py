"""Graph exploration service – powered by Neo4j via KnowledgeGraphService."""

from app.schemas.graph import GraphExploreRequest, GraphExploreResponse, GraphNode, GraphEdge
from app.services.knowledge_graph_service import KnowledgeGraphService


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
        """Query Neo4j for a tenant-scoped subgraph."""
        data = await self.kg.get_subgraph(
            tenant_id=tenant_id,
            query=request.query,
            limit=request.limit,
        )

        nodes = [GraphNode(**n) for n in data.get("nodes", [])]
        edges = [GraphEdge(**e) for e in data.get("edges", [])]
        return GraphExploreResponse(nodes=nodes, edges=edges)
