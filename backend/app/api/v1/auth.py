import uuid
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt

from app.auth.dependencies import AuthContext, get_current_user, require_roles, get_default_tenant_id
from app.auth.google import GoogleOAuthClient, require_google_configured
from app.auth.roles import RoleName
from app.core.config import settings
from app.db.session import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import (
    InviteRequest,
    InviteResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserListItem,
    UserRead,
)

router = APIRouter()


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


@router.get("/google", tags=["auth"])
async def google_start():
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
    return {"auth_url": url, "state": signed_state}


@router.get("/google/callback", response_model=TokenResponse, tags=["auth"])
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    require_google_configured()
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code")
    if not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing state")

    client = GoogleOAuthClient()
    try:
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
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google profile missing email")

        service = AuthService(db)
        token = await service.get_or_create_oauth_user(
            email=email,
            full_name=full_name,
            tenant_id=get_default_tenant_id(),
        )
        await db.commit()

        redirect_target = f"{settings.frontend_app_url}/login?token={token}"
        return RedirectResponse(url=redirect_target)
    except HTTPException as exc:
        import urllib.parse
        err_msg = urllib.parse.quote(exc.detail)
        return RedirectResponse(url=f"{settings.frontend_app_url}/login?error={err_msg}")
    except Exception as exc:  # defensive: hide internals
        import urllib.parse
        logger.exception("Google login callback failed:")
        return RedirectResponse(url=f"{settings.frontend_app_url}/login?error=Google%20login%20failed")
