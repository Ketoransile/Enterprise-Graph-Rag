from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import TenantContext, get_tenant_context
from app.api.v1 import admin, analytics, auth, documents, graph, ingestion, search, chat
from app.db.session import get_db

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["ingestion"])
api_router.include_router(admin.router, prefix="/admin/audit-logs", tags=["admin"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])


@api_router.get("/ready", tags=["health"])
async def ready(
    _: TenantContext = Depends(get_tenant_context),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    # Touch the session to ensure connection is available
    _ = db
    return {"status": "ready"}
