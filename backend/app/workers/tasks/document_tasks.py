import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uuid
import logging
from app.workers.celery_app import celery_app
from app.ingestion.pipeline import IngestionPipeline
from app.db.session import SessionLocal
from app.repositories.document import DocumentRepository
from app.services.document_service import DocumentService
from app.auth.dependencies import get_default_tenant_id

logger = logging.getLogger(__name__)

async def _process_document(document_id: uuid.UUID, tenant_id: uuid.UUID):
    async with SessionLocal() as session:
        service = DocumentService(DocumentRepository(session))
        doc = await service.get_document(tenant_id=tenant_id, document_id=document_id)
        if not doc or not doc.storage_path:
            logger.error(f"Document {document_id} not found or missing storage path")
            return
            
        try:
            with open(doc.storage_path, "rb") as f:
                file_bytes = f.read()
                
            pipeline = IngestionPipeline()
            await pipeline.run_pipeline(
                tenant_id=tenant_id,
                document_id=document_id,
                file_bytes=file_bytes,
                file_type=doc.file_type,
                security_level=doc.security_level.value
            )
        except Exception as e:
            logger.error(f"Failed to process {document_id}: {e}")

@celery_app.task(bind=True, max_retries=3)
def process_document_task(self, document_id: str):
    logger.info(f"Starting to process document {document_id}")
    asyncio.run(_process_document(uuid.UUID(document_id), get_default_tenant_id()))
    return {"status": "success", "document_id": document_id}
