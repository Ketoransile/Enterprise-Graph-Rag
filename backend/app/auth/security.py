import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(
    subject: str, expires_in_seconds: Optional[int] = None, extra: Optional[dict[str, Any]] = None
) -> str:
    lifetime = expires_in_seconds or settings.token_expires_in
    to_encode: dict[str, Any] = {"sub": subject}
    if extra:
        to_encode.update(extra)
    expire = datetime.now(timezone.utc) + timedelta(seconds=lifetime)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError as exc:  # surface a controlled error upstream
        raise ValueError("Invalid token") from exc
