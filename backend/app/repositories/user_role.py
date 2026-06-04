import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserRole


class UserRoleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def add_role(self, *, user_id: uuid.UUID, role_id: uuid.UUID, tenant_id: uuid.UUID) -> UserRole:
        link = UserRole(user_id=user_id, role_id=role_id, tenant_id=tenant_id)
        self.session.add(link)
        await self.session.flush()
        return link
