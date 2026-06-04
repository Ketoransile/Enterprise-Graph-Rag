import uuid
from typing import List

from sqlalchemy import select
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

    async def create_user(self, *, email: str, full_name: str | None, hashed_password: str, tenant_id: uuid.UUID) -> User:
        user = User(email=email, full_name=full_name, hashed_password=hashed_password, tenant_id=tenant_id)
        self.session.add(user)
        await self.session.flush()
        return user
