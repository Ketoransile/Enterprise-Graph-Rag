"""
RAG Evaluation Service – LLM-as-a-Judge.

Automatically evaluates the quality of RAG responses using the configured AI model.
Scores:
  - Faithfulness: Does the answer stay grounded in the provided context?
  - Relevance: Does the answer actually address the user's question?
  - Context Precision: Are the retrieved chunks relevant to the question?
"""

import json
import logging
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.core import EvaluationMetric
from app.services.ai_model_client import AIModelClient

logger = logging.getLogger(__name__)

# ── Faithfulness Prompt ───────────────────────────────────────────────────
FAITHFULNESS_PROMPT = """\
You are an impartial evaluator. Given a CONTEXT and an ANSWER, evaluate the
faithfulness of the answer. Faithfulness measures whether every claim in the
answer is supported by the provided context.

Score from 0.0 to 1.0:
- 1.0 = Every statement in the answer is directly supported by the context.
- 0.5 = Some claims are supported, some are not or are ambiguous.
- 0.0 = The answer contains hallucinated information not in the context.

Return ONLY a JSON object: {"score": <float>, "reasoning": "<brief explanation>"}
"""

# ── Relevance Prompt ──────────────────────────────────────────────────────
RELEVANCE_PROMPT = """\
You are an impartial evaluator. Given a QUESTION and an ANSWER, evaluate the
relevance of the answer. Relevance measures whether the answer directly
addresses the user's question.

Score from 0.0 to 1.0:
- 1.0 = The answer is fully relevant and directly addresses the question.
- 0.5 = The answer is partially relevant but misses key aspects.
- 0.0 = The answer is off-topic or does not address the question at all.

Return ONLY a JSON object: {"score": <float>, "reasoning": "<brief explanation>"}
"""

# ── Context Precision Prompt ──────────────────────────────────────────────
CONTEXT_PRECISION_PROMPT = """\
You are an impartial evaluator. Given a QUESTION and retrieved CONTEXT chunks,
evaluate context precision. Context precision measures what fraction of the
retrieved chunks are actually relevant to answering the question.

Score from 0.0 to 1.0:
- 1.0 = All retrieved chunks are highly relevant to the question.
- 0.5 = About half the chunks are relevant; others are noise.
- 0.0 = None of the retrieved chunks are relevant to the question.

Return ONLY a JSON object: {"score": <float>, "reasoning": "<brief explanation>"}
"""


class EvaluationService:
    """Evaluates RAG responses using the configured AI model as an automated judge."""

    def __init__(self) -> None:
        if settings.openai_api_key:
            self.models = AIModelClient()
        else:
            self.models = None

    async def evaluate_and_store(
        self,
        *,
        session: AsyncSession,
        tenant_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        query_text: str,
        context_text: str,
        response_text: str,
        latency_ms: int,
        num_chunks_retrieved: int,
        num_chunks_after_rbac: int,
    ) -> Optional[EvaluationMetric]:
        """Run all evaluations and persist the result."""
        if not self.models:
            logger.warning("No OPENAI_API_KEY configured - skipping evaluation.")
            return None

        faithfulness = await self._evaluate(
            FAITHFULNESS_PROMPT,
            f"CONTEXT:\n{context_text}\n\nANSWER:\n{response_text}",
        )
        relevance = await self._evaluate(
            RELEVANCE_PROMPT,
            f"QUESTION:\n{query_text}\n\nANSWER:\n{response_text}",
        )
        context_precision = await self._evaluate(
            CONTEXT_PRECISION_PROMPT,
            f"QUESTION:\n{query_text}\n\nCONTEXT:\n{context_text}",
        )

        metric = EvaluationMetric(
            tenant_id=tenant_id,
            user_id=user_id,
            query_text=query_text,
            response_text=response_text[:2000] if response_text else None,
            context_text=context_text[:2000] if context_text else None,
            faithfulness_score=faithfulness,
            relevance_score=relevance,
            context_precision_score=context_precision,
            latency_ms=latency_ms,
            num_chunks_retrieved=num_chunks_retrieved,
            num_chunks_after_rbac=num_chunks_after_rbac,
        )
        session.add(metric)
        await session.flush()

        logger.info(
            f"Evaluation saved: faith={faithfulness:.2f} "
            f"rel={relevance:.2f} prec={context_precision:.2f}"
        )
        return metric

    async def _evaluate(self, system_prompt: str, user_input: str) -> float:
        """Call the configured AI model to score a single evaluation dimension."""
        try:
            raw = await self.models.chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input},
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
            )
            data = json.loads(raw.strip())
            score = float(data.get("score", 0.0))
            return max(0.0, min(1.0, score))
        except Exception as e:
            logger.warning(f"Evaluation call failed: {e}")
            return 0.0
