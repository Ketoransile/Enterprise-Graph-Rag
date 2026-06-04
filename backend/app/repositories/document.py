import uuid
from typing import Iterable, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_by_tenant(self, tenant_id: uuid.UUID, *, skip: int = 0, limit: int = 50) -> Iterable[Document]:
        stmt = (
            select(Document)
            .where(Document.tenant_id == tenant_id)
            .order_by(Document.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> Optional[Document]:
        stmt = (
            select(Document)
            .where(Document.tenant_id == tenant_id)
            .where(Document.id == document_id)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        tenant_id: uuid.UUID,
        title: str,
        description: Optional[str],
        file_name: str,
        file_type: str,
        storage_path: str,
        security_level,
        page_count: Optional[int],
        uploaded_by: Optional[uuid.UUID],
    ) -> Document:
        doc = Document(
            tenant_id=tenant_id,
            title=title,
            description=description,
            file_name=file_name,
            file_type=file_type,
            storage_path=storage_path,
            security_level=security_level,
            page_count=page_count,
            uploaded_by=uploaded_by,
        )
        self.session.add(doc)
        await self.session.commit()
        await self.session.refresh(doc)
        return doc

    async def update(
        self,
        *,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        fields: dict,
    ) -> Optional[Document]:
        stmt = (
            update(Document)
            .where(Document.tenant_id == tenant_id)
            .where(Document.id == document_id)
            .values(**fields)
            .returning(Document)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.scalar_one_or_none()

    async def delete(self, tenant_id: uuid.UUID, document_id: uuid.UUID) -> bool:
        doc = await self.get(tenant_id=tenant_id, document_id=document_id)
        if not doc:
            return False
        await self.session.delete(doc)  # type: ignore[arg-type]
        await self.session.commit()
        return True
