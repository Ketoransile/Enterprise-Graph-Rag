"""Audit service – thin business-logic layer around audit logging."""

import logging
import uuid
from typing import List, Optional

from app.repositories.audit_log import AuditLogRepository

logger = logging.getLogger(__name__)


class AuditService:
    def __init__(self, repo: AuditLogRepository) -> None:
        self.repo = repo

    async def log(
        self,
        *,
        tenant_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        action: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[uuid.UUID] = None,
        query_text: Optional[str] = None,
        response_status: Optional[str] = None,
    ) -> None:
        """Fire-and-forget audit entry.  Exceptions are caught so auditing
        failures never break the main request path."""
        try:
            await self.repo.create(
                tenant_id=tenant_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                query_text=query_text,
                response_status=response_status,
            )
        except Exception as exc:
            logger.error(f"Failed to write audit log: {exc}", exc_info=True)

    async def list_logs(
        self,
        *,
        tenant_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
        action_filter: Optional[str] = None,
    ) -> list:
        return await self.repo.list_logs(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            action_filter=action_filter,
        )
