from typing import List, Optional

from pydantic import BaseModel, EmailStr

from app.models import ProcessingStatus, SecurityLevel



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserRead(BaseModel):
    id: str
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    is_active: bool
    roles: List[str] = []

    class Config:
        from_attributes = True


class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: str = "USER"


class InviteResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    roles: List[str]
    temporary_password: str


class UserListItem(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    is_active: bool
    roles: List[str] = []
    created_at: str | None = None

    class Config:
        from_attributes = True


class RoleRead(BaseModel):
    id: str
    name: str
    description: str | None = None
    user_count: int = 0
    created_at: str | None = None


class RoleCreate(BaseModel):
    name: str
    description: str | None = None


class RoleUpdate(BaseModel):
    description: str | None = None


class UserRolesUpdate(BaseModel):
    roles: List[str]


class UserStatusUpdate(BaseModel):
    is_active: bool


class DocumentStatus(BaseModel):
    id: str
    processing_status: ProcessingStatus
    security_level: SecurityLevel
