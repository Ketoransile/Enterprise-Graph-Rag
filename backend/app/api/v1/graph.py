from fastapi import APIRouter, Depends

from app.auth.dependencies import AuthContext, get_default_tenant_id, require_roles
from app.auth.roles import RoleName
from app.schemas.graph import GraphExploreRequest, GraphExploreResponse
from app.services.graph_service import GraphService

router = APIRouter()


@router.post("/explore", response_model=GraphExploreResponse, tags=["graph"])
async def explore_graph(
    payload: GraphExploreRequest,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
) -> GraphExploreResponse:
    service = GraphService()
    return await service.explore(payload, tenant_id=str(get_default_tenant_id()), user_id=auth.user_id)
