import asyncio
import uuid

from sqlalchemy import select

from app.auth.security import get_password_hash
from app.core.config import settings
from app.db.session import SessionLocal
from app.models import Role, Tenant, User, UserRole

TENANT_NAME = "dev-tenant"
DEFAULT_ADMIN_EMAIL = "admin@example.com"
ADMIN_EMAILS = sorted({DEFAULT_ADMIN_EMAIL, settings.admin_email} - {""})
ADMIN_PASSWORD = "ChangeMe123!"
ADMIN_ROLE = "ADMIN"
USER_ROLE = "USER"


async def seed() -> None:
    async with SessionLocal() as session:
        tenant_id = uuid.UUID(settings.default_tenant_id)
        tenant = await session.scalar(select(Tenant).where(Tenant.id == tenant_id))
        existing_named_tenant = await session.scalar(select(Tenant).where(Tenant.name == TENANT_NAME))
        if not tenant:
            tenant_name = TENANT_NAME if not existing_named_tenant else f"{TENANT_NAME}-{tenant_id}"
            tenant = Tenant(id=tenant_id, name=tenant_name, description="Default tenant")
            session.add(tenant)
            await session.flush()
        elif existing_named_tenant and existing_named_tenant.id != tenant.id:
            tenant.name = f"{TENANT_NAME}-{tenant_id}"
            await session.flush()

        role = await session.scalar(
            select(Role).where(Role.tenant_id == tenant.id).where(Role.name == ADMIN_ROLE)
        )
        if not role:
            role = Role(id=uuid.uuid4(), tenant_id=tenant.id, name=ADMIN_ROLE)
            session.add(role)
            await session.flush()

        user_role = await session.scalar(
            select(Role).where(Role.tenant_id == tenant.id).where(Role.name == USER_ROLE)
        )
        if not user_role:
            user_role = Role(id=uuid.uuid4(), tenant_id=tenant.id, name=USER_ROLE)
            session.add(user_role)
            await session.flush()

        seeded_users: list[User] = []
        for email in ADMIN_EMAILS:
            user = await session.scalar(
                select(User).where(User.tenant_id == tenant.id).where(User.email == email)
            )
            if not user:
                user = User(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    email=email,
                    full_name="Admin",
                    hashed_password=get_password_hash(ADMIN_PASSWORD),
                    is_active=True,
                )
                session.add(user)
                await session.flush()
            else:
                user.full_name = user.full_name or "Admin"
                user.hashed_password = get_password_hash(ADMIN_PASSWORD)
                user.is_active = True
                await session.flush()

            admin_assignment = await session.scalar(
                select(UserRole)
                .where(UserRole.tenant_id == tenant.id)
                .where(UserRole.user_id == user.id)
                .where(UserRole.role_id == role.id)
            )
            if not admin_assignment:
                session.add(
                    UserRole(
                        id=uuid.uuid4(),
                        tenant_id=tenant.id,
                        user_id=user.id,
                        role_id=role.id,
                    )
                )

            user_assignment = await session.scalar(
                select(UserRole)
                .where(UserRole.tenant_id == tenant.id)
                .where(UserRole.user_id == user.id)
                .where(UserRole.role_id == user_role.id)
            )
            if not user_assignment:
                session.add(
                    UserRole(
                        id=uuid.uuid4(),
                        tenant_id=tenant.id,
                        user_id=user.id,
                        role_id=user_role.id,
                    )
                )
            seeded_users.append(user)

        await session.commit()

    seeded_emails = ", ".join(user.email for user in seeded_users)
    print("Seed complete: tenant=%s users=%s password=%s" % (tenant.name, seeded_emails, ADMIN_PASSWORD))


import sys

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed())
