"""
Neo4j async driver singleton.

Uses the official ``neo4j`` Python driver configured from application settings.
The driver is thread-safe and connection-pooled, so a single instance is shared
across the entire FastAPI process.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from neo4j import AsyncGraphDatabase, AsyncDriver, AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


def get_neo4j_driver() -> AsyncDriver:
    """Return (and lazily create) the global Neo4j async driver."""
    global _driver
    if _driver is None:
        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        logger.info(f"Neo4j driver created → {settings.neo4j_uri}")
    return _driver


@asynccontextmanager
async def get_neo4j_session() -> AsyncGenerator[AsyncSession, None]:
    """Convenience context-manager that yields an AsyncSession."""
    driver = get_neo4j_driver()
    async with driver.session() as session:
        yield session


async def close_neo4j_driver() -> None:
    """Shut down the driver cleanly (call during app shutdown)."""
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
        logger.info("Neo4j driver closed.")
