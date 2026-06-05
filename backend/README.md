# Backend

FastAPI-based multi-tenant Graph-RAG backend.

- App code lives in `app/` following clean architecture (api/core/auth/schemas/models/repositories/services/ingestion/retrieval/graph/workers/audit/tests).
- Database: Postgres + pgvector for metadata, chunks, embeddings.
- Graph: Neo4j with tenant-scoped nodes/edges.
- Cache/queue: Redis + Celery workers for ingestion and extraction jobs.

Phase 1 focus: core storage/retrieval scaffolding, strict tenant/RBAC guards before any LLM usage.

Local bootstrap

- Run Alembic from backend dir: `alembic upgrade head`
- Seed dev tenant/admin: `python -m scripts.seed`
- Set `OPENAI_API_KEY` to your freemodel/OpenAI-compatible API key. Defaults target `https://api.freemodel.dev` with `OPENAI_MODEL=gpt-5.5`.
- `OPENAI_EMBEDDINGS_ENABLED` defaults to `false` because the freemodel Responses API does not expose `/v1/embeddings`; retrieval falls back to BM25 keyword search.
- Use headers on requests: `Authorization: Bearer <token>` and `X-Tenant-ID: <tenant_uuid>`
