"""Admin-only audit log endpoints."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthContext, require_roles, get_default_tenant_id
from app.auth.roles import RoleName
from app.db.session import get_db
from app.repositories.audit_log import AuditLogRepository
from app.schemas.audit import AuditLogRead
from app.services.audit_service import AuditService

router = APIRouter()


@router.get("/", response_model=List[AuditLogRead], tags=["admin"])
async def list_audit_logs(
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
):
    service = AuditService(AuditLogRepository(db))
    logs = await service.list_logs(
        tenant_id=get_default_tenant_id(),
        skip=skip,
        limit=limit,
        action_filter=action,
    )
    return [AuditLogRead.model_validate(log) for log in logs]
