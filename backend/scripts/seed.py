import asyncio
import uuid

from sqlalchemy import select

from app.auth.security import get_password_hash
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Role, Tenant, User, UserRole

TENANT_NAME = "dev-tenant"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "ChangeMe123!"
ADMIN_ROLE = "ADMIN"


async def seed() -> None:
    async with SessionLocal() as session:
        tenant = await session.scalar(select(Tenant).where(Tenant.name == TENANT_NAME))
        if not tenant:
            tenant = Tenant(id=uuid.uuid4(), name=TENANT_NAME, description="Default tenant")
            session.add(tenant)
            await session.flush()

        role = await session.scalar(
            select(Role).where(Role.tenant_id == tenant.id).where(Role.name == ADMIN_ROLE)
        )
        if not role:
            role = Role(id=uuid.uuid4(), tenant_id=tenant.id, name=ADMIN_ROLE)
            session.add(role)
            await session.flush()

        user = await session.scalar(
            select(User).where(User.tenant_id == tenant.id).where(User.email == ADMIN_EMAIL)
        )
        if not user:
            user = User(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                email=ADMIN_EMAIL,
                full_name="Admin",
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                is_active=True,
            )
            session.add(user)
            await session.flush()

        user_role = await session.scalar(
            select(UserRole)
            .where(UserRole.tenant_id == tenant.id)
            .where(UserRole.user_id == user.id)
            .where(UserRole.role_id == role.id)
        )
        if not user_role:
            session.add(
                UserRole(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    user_id=user.id,
                    role_id=role.id,
                )
            )

        await session.commit()

    print("Seed complete: tenant=%s user=%s" % (tenant.name, user.email))


import sys

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
