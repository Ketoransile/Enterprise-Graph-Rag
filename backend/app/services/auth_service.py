import uuid
import secrets
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import create_access_token, get_password_hash, verify_password
from app.repositories.role import RoleRepository
from app.repositories.user import UserRepository
from app.repositories.user_role import UserRoleRepository
from app.core.config import settings


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserRepository(session)
        self.roles = RoleRepository(session)
        self.user_roles = UserRoleRepository(session)

    async def login(self, *, email: str, password: str, tenant_id: uuid.UUID) -> str:
        user = await self.users.get_by_email_and_tenant(email=email, tenant_id=tenant_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token(
            subject=str(user.id),
            extra={"tenant_id": str(tenant_id), "email": user.email},
        )
        return token

    async def register(self, *, email: str, password: str, full_name: str | None, tenant_id: uuid.UUID) -> str:
        """Register a new user (only when self-signup is enabled)."""
        existing = await self.users.get_by_email_and_tenant(email=email, tenant_id=tenant_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        hashed = get_password_hash(password)
        user = await self.users.create_user(
            email=email,
            full_name=full_name,
            hashed_password=hashed,
            tenant_id=tenant_id,
        )

        wants_admin = settings.admin_email and settings.admin_email.lower() == email.lower()
        await self._ensure_roles(
            user_id=user.id,
            tenant_id=tenant_id,
            roles=["USER", "ADMIN"] if wants_admin else ["USER"],
        )

        token = create_access_token(
            subject=str(user.id),
            extra={"tenant_id": str(tenant_id), "email": user.email},
        )
        return token

    async def get_user(self, *, user_id: uuid.UUID, tenant_id: uuid.UUID):
        return await self.users.get_by_id_and_tenant(user_id=user_id, tenant_id=tenant_id)

    async def invite_user(
        self,
        *,
        email: str,
        full_name: str | None,
        role: str,
        tenant_id: uuid.UUID,
    ) -> dict:
        """Admin invites a new user. Creates with a temporary password."""
        existing = await self.users.get_by_email_and_tenant(email=email, tenant_id=tenant_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

        temp_password = secrets.token_urlsafe(12)
        hashed = get_password_hash(temp_password)
        user = await self.users.create_user(
            email=email,
            full_name=full_name,
            hashed_password=hashed,
            tenant_id=tenant_id,
        )

        assigned_roles = ["USER"]
        if role and role.upper() != "USER":
            assigned_roles.append(role.upper())

        wants_admin = settings.admin_email and settings.admin_email.lower() == email.lower()
        if wants_admin and "ADMIN" not in assigned_roles:
            assigned_roles.append("ADMIN")

        await self._ensure_roles(user_id=user.id, tenant_id=tenant_id, roles=assigned_roles)

        return {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "roles": assigned_roles,
            "temporary_password": temp_password,
        }

    async def list_users(self, *, tenant_id: uuid.UUID) -> List[dict]:
        """List all users with their roles."""
        users = await self.users.list_all_users(tenant_id=tenant_id)
        result = []
        for u in users:
            roles = await self.roles.list_roles_for_user(tenant_id=tenant_id, user_id=u.id)
            role_names = [r.name for r in roles]
            result.append({
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "is_active": u.is_active,
                "roles": role_names,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            })
        return result

    async def _ensure_roles(
        self, *, user_id: uuid.UUID, tenant_id: uuid.UUID, roles: list[str]
    ) -> None:
        for name in roles:
            role = await self.roles.get_role_by_name(tenant_id=tenant_id, name=name)
            if not role:
                role = await self.roles.create_role(tenant_id=tenant_id, name=name, description=f"{name} role")
            try:
                await self.user_roles.add_role(user_id=user_id, role_id=role.id, tenant_id=tenant_id)
            except Exception:
                pass

    async def get_or_create_oauth_user(
        self,
        *,
        email: str,
        full_name: str | None,
        tenant_id: uuid.UUID,
    ) -> str:
        user = await self.users.get_by_email_and_tenant(email=email, tenant_id=tenant_id)
        if not user:
            wants_admin = settings.admin_email and settings.admin_email.lower() == email.lower()
            
            # If self signup is disabled, and this isn't the bootstrap admin, reject
            if not settings.allow_self_signup and not wants_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Account not found. Please ask an admin for an invite."
                )
                
            # Create with a random hash (no password login).
            random_secret = uuid.uuid4().hex
            hashed = get_password_hash(random_secret)
            user = await self.users.create_user(
                email=email,
                full_name=full_name,
                hashed_password=hashed,
                tenant_id=tenant_id,
            )

            await self._ensure_roles(
                user_id=user.id,
                tenant_id=tenant_id,
                roles=["USER", "ADMIN"] if wants_admin else ["USER"],
            )

        token = create_access_token(
            subject=str(user.id),
            extra={"tenant_id": str(tenant_id), "email": user.email},
        )
        return token
