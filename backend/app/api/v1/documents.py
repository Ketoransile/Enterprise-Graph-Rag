import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthContext, get_current_user, require_roles, get_default_tenant_id
from app.auth.roles import RoleName
from app.db.session import get_db
from app.repositories.chunk import ChunkRepository
from app.repositories.document import DocumentRepository
from app.repositories.document_file import DocumentFileRepository
from app.schemas.chunk import ChunkRead
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate
from app.services.chunk_service import ChunkService
from app.services.document_service import DocumentService

router = APIRouter()


@router.get("/", response_model=List[DocumentRead], tags=["documents"])
async def list_documents(
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    service = DocumentService(DocumentRepository(db))
    docs = await service.list_documents(tenant_id=get_default_tenant_id(), skip=skip, limit=limit)
    return [DocumentRead.model_validate(d) for d in docs]


@router.post("/", response_model=DocumentRead, status_code=status.HTTP_201_CREATED, tags=["documents"])
async def create_document(
    payload: DocumentCreate,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(DocumentRepository(db))
    doc = await service.create_document(
        tenant_id=get_default_tenant_id(),
        data=payload,
        uploaded_by=uuid.UUID(auth.user_id),
    )
    return DocumentRead.model_validate(doc)


@router.get("/{document_id}", response_model=DocumentRead, tags=["documents"])
async def get_document(
    document_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(DocumentRepository(db))
    doc = await service.get_document(tenant_id=get_default_tenant_id(), document_id=document_id)
    return DocumentRead.model_validate(doc)


@router.patch("/{document_id}", response_model=DocumentRead, tags=["documents"])
async def update_document(
    document_id: uuid.UUID,
    payload: DocumentUpdate,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(DocumentRepository(db))
    doc = await service.update_document(
        tenant_id=get_default_tenant_id(),
        document_id=document_id,
        data=payload,
    )
    return DocumentRead.model_validate(doc)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["documents"])
async def delete_document(
    document_id: uuid.UUID,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(DocumentRepository(db))
    await service.delete_document(tenant_id=get_default_tenant_id(), document_id=document_id)
    return None


@router.post("/{document_id}/reprocess", response_model=DocumentRead, tags=["documents"])
async def reprocess_document(
    document_id: uuid.UUID,
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN, RoleName.MANAGER)),
    db: AsyncSession = Depends(get_db),
):
    tenant_id = get_default_tenant_id()
    service = DocumentService(DocumentRepository(db))
    doc = await service.get_document(tenant_id=tenant_id, document_id=document_id)
    if not doc.storage_path:
        raise HTTPException(status_code=400, detail="Document has no uploaded file to process")

    file_repo = DocumentFileRepository(db)
    doc_file = await file_repo.get(tenant_id=tenant_id, document_id=document_id)
    storage_path = doc.storage_path

    if not doc_file:
        legacy_path = Path(doc.storage_path)
        if legacy_path.is_file():
            await file_repo.upsert(
                tenant_id=tenant_id,
                document_id=document_id,
                file_name=doc.file_name,
                content_type=None,
                file_bytes=legacy_path.read_bytes(),
            )
            storage_path = f"db://document-files/{document_id}"
        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The uploaded file is no longer available to the deployed worker. "
                    "Upload or replace the file before reprocessing this document."
                ),
            )

    updated = await service.update_document(
        tenant_id=tenant_id,
        document_id=document_id,
        data=DocumentUpdate(
            storage_path=storage_path,
            processing_status="PENDING",
        ),
    )

    from app.workers.tasks.document_tasks import process_document_task

    process_document_task.delay(str(document_id))
    return DocumentRead.model_validate(updated)


@router.get("/{document_id}/chunks", response_model=List[ChunkRead], tags=["documents"])
async def list_document_chunks(
    document_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Ensure document exists first
    doc_service = DocumentService(DocumentRepository(db))
    await doc_service.get_document(tenant_id=get_default_tenant_id(), document_id=document_id)

    chunk_service = ChunkService(ChunkRepository(db))
    chunks = await chunk_service.list_for_document(
        tenant_id=get_default_tenant_id(),
        document_id=document_id,
    )
    return [ChunkRead.model_validate(c) for c in chunks]


@router.post("/{document_id}/upload", response_model=DocumentRead, tags=["documents"])
async def upload_document_file(
    document_id: uuid.UUID,
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_roles(RoleName.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    service = DocumentService(DocumentRepository(db))
    doc = await service.get_document(tenant_id=get_default_tenant_id(), document_id=document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    tenant_id = get_default_tenant_id()
    await DocumentFileRepository(db).upsert(
        tenant_id=tenant_id,
        document_id=document_id,
        file_name=file.filename or doc.file_name,
        content_type=file.content_type,
        file_bytes=file_bytes,
    )

    storage_path = f"db://document-files/{document_id}"
    updated = await service.update_document(
        tenant_id=get_default_tenant_id(),
        document_id=document_id,
        data=DocumentUpdate(
            storage_path=storage_path,
            processing_status="PENDING",
        )
    )

    from app.workers.tasks.document_tasks import process_document_task
    process_document_task.delay(str(document_id))

    return DocumentRead.model_validate(updated)
