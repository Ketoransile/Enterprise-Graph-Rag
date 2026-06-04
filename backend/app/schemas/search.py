from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SearchHit(BaseModel):
    document_id: str
    chunk_id: Optional[str] = None
    text: str = ""
    score: float = Field(0.0, ge=0)
    source_type: str = Field("vector", description="vector|bm25|hybrid|graph|rerank")
    metadata: Optional[Dict[str, Any]] = None


class HybridSearchRequest(BaseModel):
    query: str
    limit: int = Field(5, ge=1, le=50)
    top_k: int = Field(10, ge=1, le=50)
    document_ids: Optional[List[str]] = None


class HybridSearchResponse(BaseModel):
    hits: List[SearchHit]


class GraphSearchRequest(BaseModel):
    query: str
    top_k: int = Field(10, ge=1, le=50)


class GraphSearchResponse(BaseModel):
    hits: List[SearchHit]
