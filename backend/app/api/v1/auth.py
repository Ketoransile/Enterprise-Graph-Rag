import logging
import secrets
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
from typing import List

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt

from app.auth.dependencies import AuthContext, get_current_user, require_roles, get_default_tenant_id
from app.auth.google import GoogleOAuthClient, require_google_configured
from app.auth.roles import RoleName
from app.auth.security import decode_access_token
from app.core.config import settings
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import (
    InviteRequest,
    InviteResponse,
    LoginRequest,
    RegisterRequest,
    RoleCreate,
    RoleRead,
    RoleUpdate,
    TokenResponse,
    UserListItem,
    UserRolesUpdate,
    UserRead,
    UserStatusUpdate,
)

router = APIRouter()

GOOGLE_STATE_COOKIE = "graphrag_oauth_state"
GOOGLE_HANDOFF_COOKIE = "graphrag_oauth_handoff"
GOOGLE_STATE_MAX_AGE = 10 * 60
GOOGLE_HANDOFF_MAX_AGE = 60
GOOGLE_COOKIE_PATH = "/api/v1/auth/google"


def _cookie_secure() -> bool:
    return settings.frontend_app_url.startswith("https://")


def _cookie_samesite() -> str:
    return "none" if _cookie_secure() else "lax"


def _set_cookie(response: Response, key: str, value: str, max_age: int) -> None:
    response.set_cookie(
        key=key,
        value=value,
        max_age=max_age,
        httponly=True,
        secure=_cookie_secure(),
        samesite=_cookie_samesite(),
        path=GOOGLE_COOKIE_PATH,
    )


def _delete_cookie(response: Response, key: str) -> None:
    response.delete_cookie(
        key=key,
        path=GOOGLE_COOKIE_PATH,
        secure=_cookie_secure(),
        samesite=_cookie_samesite(),
    )


def _redirect_login(params: dict[str, str] | None = None) -> RedirectResponse:
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    return RedirectResponse(url=f"{settings.frontend_app_url}/login{query}")


@router.post("/login", response_model=TokenResponse, tags=["auth"])
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)
    try:
        token = await service.login(
            email=payload.email,
            password=payload.password,
            tenant_id=get_default_tenant_id(),
        )
    except HTTPException:
        raise
    except Exception as exc:  # defensive: hide internals
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed") from exc

    return TokenResponse(access_token=token)


@router.post("/register", response_model=TokenResponse, tags=["auth"])
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    if not settings.allow_self_signup:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Self signup is disabled. Contact your admin for an invite.")

    service = AuthService(db)
    try:
        token = await service.register(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            tenant_id=get_default_tenant_id(),
        )
        return TokenResponse(access_token=token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed") from exc


@router.get("/me", response_model=UserRead, tags=["auth"])
async def me(
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    service = AuthService(db)
    user = await service.get_user(user_id=uuid.UUID(auth.user_id), tenant_id=get_default_tenant_id())
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    from app.repositories.role import RoleRepository
    role_repo = RoleRepository(db)
    roles = await role_repo.list_roles_for_user(tenant_id=get_default_tenant_id(), user_id=uuid.UUID(auth.user_id))
    role_names = [r.name for r in roles]
    
    return UserRead(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        roles=role_names,
    )


@router.post("/invite", response_model=InviteResponse, tags=["auth"])
async def invite_user(
    payload: InviteRequest,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> InviteResponse:
    """Admin-only: invite a new user with a temporary password."""
    service = AuthService(db)
    try:
        result = await service.invite_user(
            email=payload.email,
            full_name=payload.full_name,
            role=payload.role,
            tenant_id=get_default_tenant_id(),
        )
        await db.commit()
        return InviteResponse(**result)
    except HTTPException:
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invite failed: {exc}") from exc


@router.get("/users", response_model=List[UserListItem], tags=["auth"])
async def list_users(
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> List[UserListItem]:
    """Admin-only: list all users in the company."""
    service = AuthService(db)
    users = await service.list_users(tenant_id=get_default_tenant_id())
    return [UserListItem(**u) for u in users]


@router.patch("/users/{user_id}/status", response_model=UserListItem, tags=["auth"])
async def update_user_status(
    user_id: uuid.UUID,
    payload: UserStatusUpdate,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> UserListItem:
    if user_id == uuid.UUID(auth.user_id) and not payload.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")

    service = AuthService(db)
    try:
        user = await service.set_user_status(
            tenant_id=get_default_tenant_id(),
            user_id=user_id,
            is_active=payload.is_active,
        )
        await db.commit()
        return UserListItem(**user)
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User status update failed") from exc


@router.patch("/users/{user_id}/roles", response_model=UserListItem, tags=["auth"])
async def update_user_roles(
    user_id: uuid.UUID,
    payload: UserRolesUpdate,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> UserListItem:
    normalized_roles = {role.strip().upper() for role in payload.roles if role.strip()}
    if user_id == uuid.UUID(auth.user_id) and RoleName.ADMIN.value not in normalized_roles:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot remove your own admin role")

    service = AuthService(db)
    try:
        user = await service.replace_user_roles(
            tenant_id=get_default_tenant_id(),
            user_id=user_id,
            roles=list(normalized_roles),
        )
        await db.commit()
        return UserListItem(**user)
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role assignment failed") from exc


@router.get("/roles", response_model=List[RoleRead], tags=["auth"])
async def list_roles(
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> List[RoleRead]:
    service = AuthService(db)
    roles = await service.list_roles(tenant_id=get_default_tenant_id())
    return [RoleRead(**role) for role in roles]


@router.post("/roles", response_model=RoleRead, tags=["auth"])
async def create_role(
    payload: RoleCreate,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> RoleRead:
    service = AuthService(db)
    try:
        role = await service.create_role(
            tenant_id=get_default_tenant_id(),
            name=payload.name,
            description=payload.description,
        )
        await db.commit()
        return RoleRead(**role)
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role creation failed") from exc


@router.patch("/roles/{name}", response_model=RoleRead, tags=["auth"])
async def update_role(
    name: str,
    payload: RoleUpdate,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> RoleRead:
    service = AuthService(db)
    try:
        role = await service.update_role(
            tenant_id=get_default_tenant_id(),
            name=name,
            description=payload.description,
        )
        await db.commit()
        return RoleRead(**role)
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role update failed") from exc


@router.get("/google", tags=["auth"])
async def google_start(response: Response):
    require_google_configured()
    client = GoogleOAuthClient()
    now = datetime.now(timezone.utc)
    state_payload = {
        "tenant_id": str(get_default_tenant_id()),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
        "nonce": str(uuid.uuid4()),
    }
    signed_state = jwt.encode(state_payload, settings.jwt_secret, algorithm="HS256")
    url = client.build_auth_url(state=signed_state)
    _set_cookie(response, GOOGLE_STATE_COOKIE, signed_state, GOOGLE_STATE_MAX_AGE)
    return {"auth_url": url}


@router.get("/google/callback", tags=["auth"])
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    state_cookie: str | None = Cookie(default=None, alias=GOOGLE_STATE_COOKIE),
    db: AsyncSession = Depends(get_db),
):
    require_google_configured()
    try:
        if not code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code")
        if not state or not state_cookie:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing state")
        if not secrets.compare_digest(state, state_cookie):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state")

        client = GoogleOAuthClient()
        try:
            state_payload = jwt.decode(state, settings.jwt_secret, algorithms=["HS256"])
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid state")

        token_tenant = state_payload.get("tenant_id")
        if not token_tenant or str(token_tenant) != str(get_default_tenant_id()):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant mismatch")

        token_data = await client.exchange_code(code)
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Google access token")
        profile = await client.fetch_userinfo(access_token)
        email = profile.get("email")
        full_name = profile.get("name")
        avatar_url = profile.get("picture")
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google profile missing email")

        service = AuthService(db)
        token = await service.get_or_create_oauth_user(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            tenant_id=get_default_tenant_id(),
        )
        await db.commit()

        redirect = _redirect_login({"oauth": "success"})
        _delete_cookie(redirect, GOOGLE_STATE_COOKIE)
        _set_cookie(redirect, GOOGLE_HANDOFF_COOKIE, token, GOOGLE_HANDOFF_MAX_AGE)
        return redirect
    except HTTPException as exc:
        redirect = _redirect_login({"error": str(exc.detail)})
        _delete_cookie(redirect, GOOGLE_STATE_COOKIE)
        _delete_cookie(redirect, GOOGLE_HANDOFF_COOKIE)
        return redirect
    except Exception as exc:  # defensive: hide internals
        logger.exception("Google login callback failed:")
        redirect = _redirect_login({"error": "Google login failed"})
        _delete_cookie(redirect, GOOGLE_STATE_COOKIE)
        _delete_cookie(redirect, GOOGLE_HANDOFF_COOKIE)
        return redirect


@router.post("/google/complete", response_model=TokenResponse, tags=["auth"])
async def google_complete(
    response: Response,
    handoff_token: str | None = Cookie(default=None, alias=GOOGLE_HANDOFF_COOKIE),
) -> TokenResponse:
    if not handoff_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing OAuth handoff")

    try:
        payload = decode_access_token(handoff_token)
        if not payload.get("sub"):
            raise ValueError("Invalid token payload")
    except ValueError:
        _delete_cookie(response, GOOGLE_HANDOFF_COOKIE)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OAuth handoff")

    _delete_cookie(response, GOOGLE_HANDOFF_COOKIE)
    return TokenResponse(access_token=handoff_token)
