import asyncio
import io
import logging
import traceback
import uuid
from typing import List

import fitz  # PyMuPDF
from google import genai
from google.genai import types

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import ProcessingStatus
from app.repositories.chunk import ChunkRepository
from app.repositories.document import DocumentRepository
from app.schemas.document import DocumentUpdate
from app.services.document_service import DocumentService
from app.services.knowledge_graph_service import KnowledgeGraphService

logger = logging.getLogger(__name__)


class IngestionPipeline:
    def __init__(self):
        if settings.gemini_api_key:
            self.gemini = genai.Client(api_key=settings.gemini_api_key)
        else:
            self.gemini = None
            logger.warning("GEMINI_API_KEY is not set. Embeddings will not be generated.")

    async def run_pipeline(
        self,
        tenant_id: uuid.UUID,
        document_id: uuid.UUID,
        file_bytes: bytes,
        file_type: str,
        security_level: str
    ):
        """Asynchronous pipeline to process a document."""
        async with SessionLocal() as session:
            doc_service = DocumentService(DocumentRepository(session))
            chunk_repo = ChunkRepository(session)

            try:
                # 1. Update status to PROCESSING
                await doc_service.update_document(
                    tenant_id=tenant_id,
                    document_id=document_id,
                    data=DocumentUpdate(processing_status=ProcessingStatus.PROCESSING)
                )
                await session.commit()

                # 2. Extract Text
                text = self._extract_text(file_bytes, file_type)
                if not text.strip():
                    raise ValueError("No text could be extracted from the file.")

                # 3. Chunk Text
                chunks = self._chunk_text(text, chunk_size=800, overlap=150)
                if not chunks:
                    raise ValueError("Document yielded 0 chunks.")

                # 4. Generate Embeddings
                chunk_records = []
                if self.gemini:
                    response = self.gemini.models.embed_content(
                        model='gemini-embedding-2',
                        contents=chunks,
                        config=types.EmbedContentConfig(output_dimensionality=768),
                    )
                    embeddings = [e.values for e in response.embeddings]
                else:
                    embeddings = [[0.0] * 768 for _ in chunks]  # Fallback stub if no key

                # 5. Save Chunks to Database
                for idx, chunk_text in enumerate(chunks):
                    chunk_records.append({
                        "document_id": document_id,
                        "tenant_id": tenant_id,
                        "chunk_index": idx,
                        "chunk_text": chunk_text,
                        "page_number": None,
                        "security_level": security_level,
                    })
                
                from app.models.core import Chunk, Embedding
                chunk_objs = [Chunk(**record) for record in chunk_records]
                session.add_all(chunk_objs)
                await session.flush()
                
                # 6. Save Embeddings
                embedding_objs = []
                for chunk_obj, embedding_vector in zip(chunk_objs, embeddings):
                    embedding_objs.append(
                        Embedding(
                            document_id=document_id,
                            tenant_id=tenant_id,
                            chunk_id=chunk_obj.id,
                            embedding=embedding_vector
                        )
                    )
                session.add_all(embedding_objs)
                await session.flush()

                # 7. Knowledge Graph Extraction (Neo4j)
                try:
                    kg_service = KnowledgeGraphService()
                    kg_result = await kg_service.extract_and_store(
                        tenant_id=tenant_id,
                        document_id=document_id,
                        chunks=chunks,
                    )
                    logger.info(
                        f"KG extraction for {document_id}: "
                        f"{kg_result['nodes']} nodes, {kg_result['edges']} edges"
                    )
                except Exception as kg_err:
                    # Graph extraction failure should NOT block the pipeline
                    logger.warning(f"KG extraction failed for {document_id}: {kg_err}")

                # 8. Mark COMPLETED
                await doc_service.update_document(
                    tenant_id=tenant_id,
                    document_id=document_id,
                    data=DocumentUpdate(processing_status=ProcessingStatus.COMPLETED)
                )
                await session.commit()
                logger.info(f"Document {document_id} processed successfully.")

            except Exception as e:
                await session.rollback()
                logger.error(f"Pipeline failed for document {document_id}: {e}")
                logger.error(traceback.format_exc())
                try:
                    await doc_service.update_document(
                        tenant_id=tenant_id,
                        document_id=document_id,
                        data=DocumentUpdate(processing_status=ProcessingStatus.FAILED)
                    )
                    await session.commit()
                except Exception as inner_e:
                    logger.error(f"Failed to update document status to FAILED: {inner_e}")

    def _extract_text(self, file_bytes: bytes, file_type: str) -> str:
        if file_type.lower() == "pdf":
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text() + "\n\n"
            return text
        elif file_type.lower() == "docx":
            import docx
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        elif file_type.lower() in ["txt", "md"]:
            return file_bytes.decode("utf-8", errors="ignore")
        else:
            # Fallback for unknown text-based or minimal support
            return file_bytes.decode("utf-8", errors="ignore")

    def _chunk_text(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            length_function=len,
            is_separator_regex=False,
        )
        chunks = text_splitter.split_text(text)
        return chunks
