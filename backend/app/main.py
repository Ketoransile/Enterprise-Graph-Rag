from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.db.session import engine
from app.db.neo4j_driver import close_neo4j_driver
from app.core.config import settings

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    await engine.dispose()
    await close_neo4j_driver()


app = FastAPI(title="GraphRAG Backend", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_origins = list({
    origin.rstrip("/")
    for origin in [
        settings.frontend_app_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    if origin
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


def configure_routers() -> None:
    app.include_router(api_router, prefix="/api/v1")


configure_routers()
