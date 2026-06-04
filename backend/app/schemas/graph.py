from typing import List, Optional

from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    label: str
    type: str


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str


class GraphExploreRequest(BaseModel):
    query: Optional[str] = None
    limit: int = 50


class GraphExploreResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
