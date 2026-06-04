from fastapi import APIRouter, Depends

from app.auth.dependencies import AuthContext, get_current_user, get_default_tenant_id
from app.schemas.search import GraphSearchRequest, GraphSearchResponse, HybridSearchRequest, HybridSearchResponse
from app.services.retrieval_service import RetrievalService

router = APIRouter()


@router.post("/hybrid", response_model=HybridSearchResponse, tags=["search"])
async def hybrid_search(
    payload: HybridSearchRequest,
    auth: AuthContext = Depends(get_current_user),
) -> HybridSearchResponse:
    service = RetrievalService()
    return await service.hybrid_search(payload, tenant_id=str(get_default_tenant_id()), user_id=auth.user_id)


@router.post("/graph", response_model=GraphSearchResponse, tags=["search"])
async def graph_search(
    payload: GraphSearchRequest,
    auth: AuthContext = Depends(get_current_user),
) -> GraphSearchResponse:
    service = RetrievalService()
    return await service.graph_search(payload, tenant_id=str(get_default_tenant_id()), user_id=auth.user_id)
