import uuid
from typing import List

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_email_and_tenant(self, email: str, tenant_id: uuid.UUID) -> User | None:
        stmt = (
            select(User)
            .where(User.email == email)
            .where(User.tenant_id == tenant_id)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_and_tenant(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> User | None:
        stmt = (
            select(User)
            .where(User.id == user_id)
            .where(User.tenant_id == tenant_id)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all_users(self, tenant_id: uuid.UUID) -> List[User]:
        stmt = (
            select(User)
            .where(User.tenant_id == tenant_id)
            .order_by(User.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_user(
        self,
        *,
        email: str,
        full_name: str | None,
        hashed_password: str,
        tenant_id: uuid.UUID,
        avatar_url: str | None = None,
    ) -> User:
        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            hashed_password=hashed_password,
            tenant_id=tenant_id,
        )
        self.session.add(user)
        await self.session.flush()
        return user

    async def update_profile(
        self,
        *,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        full_name: str | None = None,
        avatar_url: str | None = None,
    ) -> User | None:
        values: dict[str, str] = {}
        if full_name:
            values["full_name"] = full_name
        if avatar_url:
            values["avatar_url"] = avatar_url
        if not values:
            return await self.get_by_id_and_tenant(user_id=user_id, tenant_id=tenant_id)

        stmt = (
            update(User)
            .where(User.id == user_id)
            .where(User.tenant_id == tenant_id)
            .values(**values)
            .returning(User)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_status(self, *, user_id: uuid.UUID, tenant_id: uuid.UUID, is_active: bool) -> User | None:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .where(User.tenant_id == tenant_id)
            .values(is_active=is_active)
            .returning(User)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
