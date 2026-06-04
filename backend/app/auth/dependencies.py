import uuid

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from pydantic import BaseModel

from app.auth.roles import RoleName
from app.auth.security import decode_access_token
from app.core.config import settings
from app.db.session import get_db
from app.repositories.role import RoleRepository


_DEFAULT_TENANT_ID = uuid.UUID(settings.default_tenant_id)


def get_default_tenant_id() -> uuid.UUID:
    return _DEFAULT_TENANT_ID


class TenantContext(BaseModel):
    tenant_id: uuid.UUID


def get_tenant_context() -> TenantContext:
    return TenantContext(tenant_id=_DEFAULT_TENANT_ID)


class AuthContext(BaseModel):
    user_id: str
    token: str


async def get_current_user(
    authorization: str | None = Header(default=None, convert_underscores=False),
) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    return AuthContext(user_id=str(user_id), token=token)


def require_roles(*allowed_roles: str):
    async def dependency(
        auth: AuthContext = Depends(get_current_user),
        session=Depends(get_db),
    ) -> AuthContext:
        repo = RoleRepository(session)
        roles = await repo.list_roles_for_user(tenant_id=get_default_tenant_id(), user_id=uuid.UUID(auth.user_id))
        role_names = {r.name for r in roles}
        enum_allowed = {RoleName(r).value if isinstance(r, str) else str(r) for r in allowed_roles}
        if not role_names.intersection(enum_allowed):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return auth

    return dependency
