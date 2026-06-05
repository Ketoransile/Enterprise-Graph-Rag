import uuid
from typing import List

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Role, UserRole


class RoleRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_roles_for_user(self, tenant_id: uuid.UUID, user_id: uuid.UUID) -> List[Role]:
        stmt = (
            select(Role)
            .join(UserRole, Role.id == UserRole.role_id)
            .where(Role.tenant_id == tenant_id)
            .where(UserRole.tenant_id == tenant_id)
            .where(UserRole.user_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_role_by_name(self, *, tenant_id: uuid.UUID, name: str) -> Role | None:
        stmt = select(Role).where(Role.tenant_id == tenant_id).where(Role.name == name).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_roles(self, *, tenant_id: uuid.UUID) -> List[Role]:
        stmt = select(Role).where(Role.tenant_id == tenant_id).order_by(Role.name.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_users_by_role(self, *, tenant_id: uuid.UUID) -> dict[uuid.UUID, int]:
        stmt = (
            select(UserRole.role_id, func.count(UserRole.user_id))
            .where(UserRole.tenant_id == tenant_id)
            .group_by(UserRole.role_id)
        )
        result = await self.session.execute(stmt)
        return {role_id: count for role_id, count in result.all()}

    async def create_role(self, *, tenant_id: uuid.UUID, name: str, description: str | None = None) -> Role:
        role = Role(tenant_id=tenant_id, name=name, description=description)
        self.session.add(role)
        await self.session.flush()
        return role

    async def update_role(
        self, *, tenant_id: uuid.UUID, name: str, description: str | None
    ) -> Role | None:
        stmt = (
            update(Role)
            .where(Role.tenant_id == tenant_id)
            .where(Role.name == name)
            .values(description=description)
            .returning(Role)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
