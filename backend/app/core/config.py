from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    app_name: str = "GraphRAG Backend"
    app_env: str = "local"

    default_tenant_id: str = "00000000-0000-0000-0000-000000000001"

    postgres_dsn: str = (
        "postgresql+psycopg://graphrag_user:change_me@postgres:5432/graphrag"
    )
    redis_url: str = "redis://redis:6379/0"

    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "change_me"

    jwt_secret: str = "replace_me"
    token_expires_in: int = 3600
    refresh_expires_in: int = 60 * 60 * 24 * 14

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    gemini_api_key: str = ""

    frontend_app_url: str = "http://localhost:3000"

    allow_self_signup: bool = False
    admin_email: str = ""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[3] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def check_jwt_secret(self) -> "Settings":
        if self.app_env.lower() == "production" and self.jwt_secret == "replace_me":
            raise ValueError("JWT_SECRET must be set in production to something other than 'replace_me'")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
