# Enterprise Graph-RAG Platform — Master Project Context

## 1. Project Summary

Build a production-style enterprise document intelligence platform that allows organizations to upload private internal documents and ask natural-language questions over them securely using Retrieval-Augmented Generation (RAG), hybrid search, and knowledge graphs.

This is not a simple chatbot. It is a SaaS-style knowledge platform (running single-tenant in the current phase) with:

- Secure authentication (email/password; Google SSO planned)
- Role-based access control (RBAC)
- Single-company architecture (all users belong to the same internal organization)
- Document ingestion pipeline
- Semantic chunking
- Vector search
- BM25 keyword search
- Knowledge graph extraction
- Graph-augmented retrieval
- Citations and source traceability
- Audit logs
- Evaluation tooling
- A polished admin and chat UI

The system must behave like real enterprise software.

---

## 2. Product Vision

Organizations have many internal documents such as:

- Policy manuals
- HR handbooks
- Contracts
- Onboarding guides
- Technical docs
- Project notes
- Financial reports
- Operational documents
- Meeting transcripts
- Executive files

Employees need to ask questions like:

- "What is the remote work policy?"
- "Which team uses Kafka?"
- "Who manages Project Atlas?"
- "Summarize the leave policy."
- "What documents mention customer churn?"
- "Which departments are involved in this project?"

The platform must answer accurately, securely, and with citations, while preventing unauthorized access to restricted information.

The major technical challenge is that:

- Vector search alone can miss structure and relationships.
- Keyword search alone misses semantic meaning.
- Naive RAG can leak sensitive content.
- Internal knowledge often depends on relationships between entities.
- Different users must see different documents based on role and tenant.

This project solves those problems with a secure Graph-RAG architecture.

---

## 3. Core Product Principles

1. **Security First:** Data must be protected at every layer.
2. **Single Company Scope:** The platform is deployed internally for a single organization. Cross-company multi-tenancy is out of scope.
3. **Pre-LLM Access Control:** Unauthorized content must never reach the LLM.
4. **Explainable Retrieval:** Sources and steps must be traceably transparent.
5. **Grounded with Citations:** Every answer must explicitly map back to source data.
6. **Graph-Native:** Graph reasoning is a core feature, not an optional extra.
7. **Modular Architecture:** Keep dependencies clean, maintainable, and decoupled.
8. **MVP-Driven Iteration:** Build and validate the core foundation before advanced extras.
9. **Full Accountability:** Every major action should be recorded in audit logs.
10. **Enterprise UX/UI:** The user experience should look and feel professional.

---

## 4. Target Users and Roles

### Admin

Manages tenants, users, roles, permissions, and system configuration.

### Manager

Views team documents, project documents, and operational content based on permissions.

### Employee

Chats with allowed documents and sees only authorized data.

### HR

Accesses HR policy, employee, hiring, and compliance documents.

### Finance

Accesses budgets, compensation, reports, and other restricted financial files.

### System Rules for Roles

Every request that touches private data must validate:

- User identity
- Tenant membership
- Role membership
- Document-level permission
- Chunk-level permission (if implemented)
- Graph-level tenant and permission scope

---

## 5. MVP Scope

### Phase 1 & 2 (Core MVP)

- Secure authentication
- Multi-tenancy isolation
- Document upload and management
- Text extraction and semantic chunking
- Text embeddings generation
- Vector search & BM25 keyword search
- Chat interface over documents with streaming
- In-text source citations
- Role-Based Access Control (RBAC)
- Basic system audit logging

### Phase 3 & 4 (Advanced Scope)

- Knowledge graph extraction (entities & relationships)
- Graph search implementation
- Interactive Graph Explorer UI
- Hybrid retrieval scoring (RRF/Reranking)
- Performance and Quality Evaluation dashboard
- Granular administrative controls

---

## 6. Recommended Tech Stack

### Frontend

- **Framework:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **State & Data Fetching:** React Query, Zustand

### Backend

- **Framework:** FastAPI (Python), Pydantic
- **ORM:** SQLAlchemy (or equivalent clean data mapper)
- **Task Management:** Celery, Redis (for queueing and caching)

### Data Stores

- **Relational DB:** PostgreSQL (Application data, metadata, logs)
- **Vector Extensions:** pgvector (Embeddings and chunk storage)
- **Graph DB:** Neo4j (Entities, relationships, and provenances)

### AI and Retrieval

- **LLM API:** OpenAI API or compatible enterprise LLM provider
- **Orchestration:** LangChain or LlamaIndex
- **Retrieval Engine:** BM25 (Lexical) + Vector (Semantic) + Cypher queries (Graph)
- **Evaluation:** Ragas or DeepEval

### Infrastructure

- **Containerization:** Docker, Docker Compose
- **Configuration:** Strict environment-based configuration variables

---

## 7. High-Level Architecture

```text
                     User
                      ↓
              Next.js Frontend
                      ↓
               FastAPI Backend
                      ↓
 ────────────────────────────────────────────
  Auth / RBAC / Tenant Validation
  Document Ingestion Pipeline
  Search & Retrieval Orchestration
  Chat Orchestration (Streaming)
  Audit Logging Engine
 ────────────────────────────────────────────
       ↓                  ↓                  ↓
  PostgreSQL          pgvector             Neo4j
 (Metadata,       (Embeddings,       (Graph Nodes,
 Permissions,     Chunk Storage,     Edges, Tenant-
 Audit Logs)     Retrieval Index)     Scoped Maps)
```
