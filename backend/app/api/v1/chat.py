import asyncio
import json
import logging
import time
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthContext, get_current_user, get_default_tenant_id
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.repositories.audit_log import AuditLogRepository
from app.schemas.search import HybridSearchRequest
from app.services.ai_model_client import AIModelClient
from app.services.audit_service import AuditService
from app.services.evaluation_service import EvaluationService
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/stream", tags=["chat"])
@limiter.limit("10/minute")
async def chat_stream(
    request: Request,
    payload: HybridSearchRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=500,
            detail="AI model API key not configured. Set OPENAI_API_KEY.",
        )

    client = AIModelClient()
    retrieval_service = RetrievalService()

    async def event_generator() -> AsyncGenerator[str, None]:
        start_time = time.monotonic()
        full_response = ""
        context_text = ""
        num_chunks_retrieved = 0
        num_chunks_after_rbac = 0

        try:
            # 1. Retrieve Context
            search_res = await retrieval_service.hybrid_search(
                payload, tenant_id=get_default_tenant_id(), user_id=auth.user_id
            )
            num_chunks_after_rbac = len(search_res.hits)

            # 2. Yield Citations First
            citations_data = [
                {
                    "chunk_id": hit.chunk_id,
                    "document_id": hit.document_id,
                    "text": hit.text,
                    "score": hit.score,
                    "metadata": hit.metadata,
                }
                for hit in search_res.hits
            ]
            yield f"data: {json.dumps({'type': 'citations', 'data': citations_data})}\n\n"

            # 3. Assemble Prompt
            context_lines = []
            for i, hit in enumerate(search_res.hits):
                metadata = hit.metadata or {}
                source_name = metadata.get("document_title") or metadata.get("file_name")
                source_label = f"Source [{i+1}]"
                if source_name:
                    source_label += f" ({source_name})"
                context_lines.append(f"{source_label}: {hit.text}")
            context_text = "\n\n".join(context_lines)
            system_prompt = (
                "You are an enterprise AI assistant answering questions based strictly on the provided context.\n"
                "If the context does not contain the answer, politely say so. Do not hallucinate external information.\n"
                "Use in-text citations like [1], [2] to map back to the source numbers."
            )
            user_prompt = f"Context:\n{context_text}\n\nQuestion: {payload.query}"

            # 4. Stream LLM Response
            stream = client.stream_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
            )

            async for chunk_text in stream:
                if chunk_text:
                    full_response += chunk_text
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk_text})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

            latency_ms = int((time.monotonic() - start_time) * 1000)

            # ── Audit log ─────────────────────────────────────────
            audit = AuditService(AuditLogRepository(db))
            await audit.log(
                tenant_id=get_default_tenant_id(),
                user_id=uuid.UUID(auth.user_id),
                action="CHAT_QUERY",
                resource_type="chat",
                query_text=payload.query,
                response_status="OK",
            )

            # ── RAG Evaluation (LLM-as-a-Judge) ──────────────────
            try:
                eval_service = EvaluationService()
                await eval_service.evaluate_and_store(
                    session=db,
                    tenant_id=get_default_tenant_id(),
                    user_id=uuid.UUID(auth.user_id),
                    query_text=payload.query,
                    context_text=context_text,
                    response_text=full_response,
                    latency_ms=latency_ms,
                    num_chunks_retrieved=num_chunks_retrieved or num_chunks_after_rbac,
                    num_chunks_after_rbac=num_chunks_after_rbac,
                )
            except Exception as eval_err:
                logger.warning(f"Evaluation failed (non-blocking): {eval_err}")

            await db.commit()

        except Exception as e:
            logger.error(f"Chat stream error: {e}")

            # ── Audit log: failed query ──────────────────────────
            try:
                audit = AuditService(AuditLogRepository(db))
                await audit.log(
                    tenant_id=get_default_tenant_id(),
                    user_id=uuid.UUID(auth.user_id),
                    action="CHAT_QUERY",
                    resource_type="chat",
                    query_text=payload.query,
                    response_status=f"ERROR: {str(e)[:200]}",
                )
                await db.commit()
            except Exception:
                pass

            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
