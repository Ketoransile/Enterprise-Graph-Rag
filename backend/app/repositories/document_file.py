import uuid
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DocumentFile


class DocumentFileRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(
        self,
        *,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
    ) -> Optional[DocumentFile]:
        stmt = (
            select(DocumentFile)
            .where(DocumentFile.tenant_id == tenant_id)
            .where(DocumentFile.document_id == document_id)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert(
        self,
        *,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        file_name: str,
        content_type: Optional[str],
        file_bytes: bytes,
    ) -> DocumentFile:
        existing = await self.get(tenant_id=tenant_id, document_id=document_id)
        fields = {
            "file_name": file_name,
            "content_type": content_type,
            "file_size": len(file_bytes),
            "file_bytes": file_bytes,
        }

        if existing:
            stmt = (
                update(DocumentFile)
                .where(DocumentFile.tenant_id == tenant_id)
                .where(DocumentFile.document_id == document_id)
                .values(**fields)
                .returning(DocumentFile)
            )
            result = await self.session.execute(stmt)
            await self.session.commit()
            return result.scalar_one()

        doc_file = DocumentFile(
            tenant_id=tenant_id,
            document_id=document_id,
            **fields,
        )
        self.session.add(doc_file)
        await self.session.commit()
        await self.session.refresh(doc_file)
        return doc_file
