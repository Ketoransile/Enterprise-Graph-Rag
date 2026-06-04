import uuid

from sqlalchemy.ext.asyncio import AsyncSession


class BaseRepository:
    def __init__(self, session: AsyncSession, tenant_id: uuid.UUID):
        self.session = session
        self.tenant_id = tenant_id

    def require_tenant(self, tenant_id: uuid.UUID | str) -> uuid.UUID:
        parsed = uuid.UUID(str(tenant_id))
        if parsed != self.tenant_id:
            raise ValueError("Tenant mismatch for repository operation")
        return parsed
