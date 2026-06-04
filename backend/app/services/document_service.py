import uuid
from typing import Iterable, Optional

from fastapi import HTTPException, status

from app.models import ProcessingStatus, SecurityLevel
from app.repositories.document import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentUpdate


class DocumentService:
    def __init__(self, repo: DocumentRepository):
        self.repo = repo

    async def list_documents(self, tenant_id: uuid.UUID, *, skip: int = 0, limit: int = 50):
        return await self.repo.list_by_tenant(tenant_id=tenant_id, skip=skip, limit=limit)

    async def get_document(self, tenant_id: uuid.UUID, document_id: uuid.UUID):
        doc = await self.repo.get(tenant_id=tenant_id, document_id=document_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        return doc

    async def create_document(
        self,
        tenant_id: uuid.UUID,
        data: DocumentCreate,
        uploaded_by: Optional[uuid.UUID],
    ):
        return await self.repo.create(
            tenant_id=tenant_id,
            title=data.title,
            description=data.description,
            file_name=data.file_name,
            file_type=data.file_type,
            storage_path=data.storage_path,
            security_level=data.security_level or SecurityLevel.INTERNAL,
            page_count=data.page_count,
            uploaded_by=uploaded_by,
        )

    async def update_document(self, tenant_id: uuid.UUID, document_id: uuid.UUID, data: DocumentUpdate):
        fields = data.model_dump(exclude_unset=True)
        if not fields:
            return await self.get_document(tenant_id, document_id)
        if "processing_status" in fields:
            # validate enum
            ProcessingStatus(fields["processing_status"])
        updated = await self.repo.update(tenant_id=tenant_id, document_id=document_id, fields=fields)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        return updated

    async def delete_document(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> None:
        deleted = await self.repo.delete(tenant_id=tenant_id, document_id=document_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
