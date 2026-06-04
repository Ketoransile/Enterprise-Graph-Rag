"""Analytics endpoints – aggregated metrics for the dashboard."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import AuthContext, get_current_user, get_default_tenant_id
from app.db.session import get_db
from app.models.core import AuditLog, Document, EvaluationMetric

router = APIRouter()


class OverviewMetrics(BaseModel):
    total_documents: int
    total_queries: int
    avg_faithfulness: Optional[float]
    avg_relevance: Optional[float]
    avg_context_precision: Optional[float]
    avg_latency_ms: Optional[float]


class DailyMetric(BaseModel):
    date: str
    query_count: int
    avg_faithfulness: Optional[float]
    avg_relevance: Optional[float]
    avg_latency_ms: Optional[float]


class RecentEvaluation(BaseModel):
    id: str
    query_text: str
    faithfulness_score: Optional[float]
    relevance_score: Optional[float]
    context_precision_score: Optional[float]
    latency_ms: Optional[int]
    num_chunks_retrieved: Optional[int]
    num_chunks_after_rbac: Optional[int]
    created_at: str


class AnalyticsResponse(BaseModel):
    overview: OverviewMetrics
    daily: List[DailyMetric]
    recent_evaluations: List[RecentEvaluation]


@router.get("/", response_model=AnalyticsResponse, tags=["analytics"])
async def get_analytics(
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    tenant_id = get_default_tenant_id()

    # ── Overview ──────────────────────────────────────────────────────
    doc_count_stmt = (
        select(func.count(Document.id))
        .where(Document.tenant_id == tenant_id)
    )
    doc_count = (await db.execute(doc_count_stmt)).scalar() or 0

    eval_overview_stmt = select(
        func.count(EvaluationMetric.id),
        func.avg(EvaluationMetric.faithfulness_score),
        func.avg(EvaluationMetric.relevance_score),
        func.avg(EvaluationMetric.context_precision_score),
        func.avg(EvaluationMetric.latency_ms),
    ).where(EvaluationMetric.tenant_id == tenant_id)
    row = (await db.execute(eval_overview_stmt)).one()

    overview = OverviewMetrics(
        total_documents=doc_count,
        total_queries=row[0] or 0,
        avg_faithfulness=round(float(row[1]), 3) if row[1] is not None else None,
        avg_relevance=round(float(row[2]), 3) if row[2] is not None else None,
        avg_context_precision=round(float(row[3]), 3) if row[3] is not None else None,
        avg_latency_ms=round(float(row[4]), 1) if row[4] is not None else None,
    )

    # ── Daily breakdown ───────────────────────────────────────────────
    daily_stmt = (
        select(
            cast(EvaluationMetric.created_at, Date).label("day"),
            func.count(EvaluationMetric.id),
            func.avg(EvaluationMetric.faithfulness_score),
            func.avg(EvaluationMetric.relevance_score),
            func.avg(EvaluationMetric.latency_ms),
        )
        .where(EvaluationMetric.tenant_id == tenant_id)
        .where(
            EvaluationMetric.created_at >= func.now() - func.cast(
                f"{days} days", type_=None
            )
        )
        .group_by("day")
        .order_by("day")
    )

    try:
        daily_result = await db.execute(daily_stmt)
        daily = [
            DailyMetric(
                date=str(r[0]),
                query_count=r[1],
                avg_faithfulness=round(float(r[2]), 3) if r[2] is not None else None,
                avg_relevance=round(float(r[3]), 3) if r[3] is not None else None,
                avg_latency_ms=round(float(r[4]), 1) if r[4] is not None else None,
            )
            for r in daily_result
        ]
    except Exception:
        daily = []

    # ── Recent evaluations ────────────────────────────────────────────
    recent_stmt = (
        select(EvaluationMetric)
        .where(EvaluationMetric.tenant_id == tenant_id)
        .order_by(EvaluationMetric.created_at.desc())
        .limit(20)
    )
    recent_result = await db.execute(recent_stmt)
    recent_evaluations = [
        RecentEvaluation(
            id=str(m.id),
            query_text=m.query_text[:200] if m.query_text else "",
            faithfulness_score=m.faithfulness_score,
            relevance_score=m.relevance_score,
            context_precision_score=m.context_precision_score,
            latency_ms=m.latency_ms,
            num_chunks_retrieved=m.num_chunks_retrieved,
            num_chunks_after_rbac=m.num_chunks_after_rbac,
            created_at=m.created_at.isoformat() if m.created_at else "",
        )
        for m in recent_result.scalars().all()
    ]

    return AnalyticsResponse(
        overview=overview,
        daily=daily,
        recent_evaluations=recent_evaluations,
    )
