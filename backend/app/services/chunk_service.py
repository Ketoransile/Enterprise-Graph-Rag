import uuid

from fastapi import HTTPException, status

from app.repositories.chunk import ChunkRepository


class ChunkService:
    def __init__(self, repo: ChunkRepository):
        self.repo = repo

    async def list_for_document(self, tenant_id: uuid.UUID, document_id: uuid.UUID):
        chunks = await self.repo.list_by_document(tenant_id=tenant_id, document_id=document_id)
        if chunks is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found or no chunks")
        return chunks
