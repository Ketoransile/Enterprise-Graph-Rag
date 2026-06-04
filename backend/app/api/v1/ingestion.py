import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthContext, require_roles, get_default_tenant_id
from app.auth.roles import RoleName
from app.db.session import get_db
from app.repositories.document import DocumentRepository
from app.schemas.document import DocumentCreate, DocumentRead
from app.services.document_service import DocumentService

router = APIRouter()


@router.post("/register", response_model=DocumentRead, status_code=status.HTTP_201_CREATED, tags=["ingestion"])
async def register_document(
    payload: DocumentCreate,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN, RoleName.MANAGER)),
    db: AsyncSession = Depends(get_db),
) -> DocumentRead:
    service = DocumentService(DocumentRepository(db))
    doc = await service.create_document(
        tenant_id=get_default_tenant_id(),
        data=payload,
        uploaded_by=uuid.UUID(auth.user_id),
    )
    return DocumentRead.model_validate(doc)
