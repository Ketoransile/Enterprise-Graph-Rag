import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uuid
import logging
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.workers.celery_app import celery_app
from app.ingestion.pipeline import IngestionPipeline
from app.db.session import SessionLocal
from app.repositories.document import DocumentRepository
from app.repositories.document_file import DocumentFileRepository
from app.services.document_service import DocumentService
from app.auth.dependencies import get_default_tenant_id
from app.models import ProcessingStatus
from app.schemas.document import DocumentUpdate

logger = logging.getLogger(__name__)


class DocumentProcessingError(Exception):
    pass


async def _mark_document_failed(document_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
    async with SessionLocal() as session:
        service = DocumentService(DocumentRepository(session))
        try:
            await service.update_document(
                tenant_id=tenant_id,
                document_id=document_id,
                data=DocumentUpdate(processing_status=ProcessingStatus.FAILED),
            )
        except HTTPException:
            logger.warning("Could not mark missing document %s as FAILED", document_id)


async def _load_file_bytes(document_id: uuid.UUID, tenant_id: uuid.UUID) -> tuple[bytes, str, str]:
    async with SessionLocal() as session:
        service = DocumentService(DocumentRepository(session))
        doc = await service.get_document(tenant_id=tenant_id, document_id=document_id)
        if not doc or not doc.storage_path:
            raise DocumentProcessingError(f"Document {document_id} not found or missing storage path")

        doc_file = await DocumentFileRepository(session).get(
            tenant_id=tenant_id,
            document_id=document_id,
        )
        if doc_file:
            return bytes(doc_file.file_bytes), doc.file_type, doc.security_level.value

        path = Path(doc.storage_path)
        if path.is_file():
            return path.read_bytes(), doc.file_type, doc.security_level.value

        raise DocumentProcessingError(
            f"Uploaded file for document {document_id} is not available to this worker: {doc.storage_path}"
        )


async def _process_document(document_id: uuid.UUID, tenant_id: uuid.UUID):
    try:
        file_bytes, file_type, security_level = await _load_file_bytes(document_id, tenant_id)

        pipeline = IngestionPipeline()
        await pipeline.run_pipeline(
            tenant_id=tenant_id,
            document_id=document_id,
            file_bytes=file_bytes,
            file_type=file_type,
            security_level=security_level,
        )
    except DocumentProcessingError as exc:
        logger.error("Failed to process %s: %s", document_id, exc)
        await _mark_document_failed(document_id, tenant_id)
        raise


@celery_app.task(
    bind=True,
    max_retries=3,
    autoretry_for=(OperationalError,),
    retry_backoff=True,
    retry_jitter=True,
)
def process_document_task(self, document_id: str):
    logger.info(f"Starting to process document {document_id}")
    asyncio.run(_process_document(uuid.UUID(document_id), get_default_tenant_id()))
    return {"status": "success", "document_id": document_id}
