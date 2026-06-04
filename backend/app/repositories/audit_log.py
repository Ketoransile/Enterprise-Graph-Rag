"""Audit log repository – thin wrapper around the AuditLog ORM model."""

import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import AuditLog


class AuditLogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        tenant_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[uuid.UUID] = None,
        query_text: Optional[str] = None,
        response_status: Optional[str] = None,
    ) -> AuditLog:
        entry = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            query_text=query_text,
            response_status=response_status,
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def list_logs(
        self,
        *,
        tenant_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
        action_filter: Optional[str] = None,
    ) -> List[AuditLog]:
        stmt = (
            select(AuditLog)
            .where(AuditLog.tenant_id == tenant_id)
            .order_by(AuditLog.created_at.desc())
        )
        if action_filter:
            stmt = stmt.where(AuditLog.action == action_filter)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
