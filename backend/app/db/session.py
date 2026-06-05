from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.event_loop import configure_asyncio_event_loop_policy

configure_asyncio_event_loop_policy()

engine = create_async_engine(settings.postgres_dsn, echo=False, future=True)
SessionLocal = async_sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
