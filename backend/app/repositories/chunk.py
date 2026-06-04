import uuid
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Chunk


class ChunkRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_document(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> Iterable[Chunk]:
        stmt = (
            select(Chunk)
            .where(Chunk.tenant_id == tenant_id)
            .where(Chunk.document_id == document_id)
            .order_by(Chunk.chunk_index.asc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_many(self, chunks_data: list[dict]):
        self.session.add_all([Chunk(**data) for data in chunks_data])
        await self.session.flush()
