## 8. Functional Requirements

### 8.1 Authentication

The system must support:

- User registration and login.
- Secure sessions or short-lived JWTs with refresh token support.
- Clean logout handling.
- Role and tenant assignment immediately upon user provisioning.

### 8.2 Tenancy (Current Mode: Single Tenant)

- The platform runs in **single-tenant** mode for now. A fixed `default_tenant_id` is applied server-side; the `X-Tenant-ID` header is not required during development.
- Database schemas still carry `tenant_id` for future multi-tenant readiness, but enforcement is relaxed to the default tenant until multi-tenancy is re-enabled.

**Google OAuth (optional)**

- Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` (default `http://localhost:8000/api/v1/auth/google/callback`).
- Frontend starts the flow via `/api/v1/auth/google`; backend exchanges the code and issues our JWT.

### 8.4 User provisioning & invites

- Default mode: **invite-only** (self-signup disabled unless `ALLOW_SELF_SIGNUP=true`).
- Admins invite users and assign roles (default `USER` role is auto-assigned on new account creation, including Google SSO). Setting `ADMIN_EMAIL` will bootstrap that email as ADMIN+USER on first login/signup.
- Google SSO uses signed `state` to prevent CSRF/tenant mixups; tenant is fixed (single-tenant mode).

### 8.3 Document Management

The system must support:

- Document upload, deletion, metadata parsing, and tagging.
- Assignment of strict access permissions per document.
- Listing of items dynamically filtered by tenant scope and user security level clearance.
- Tracking document versions and exposing asynchronous background processing statuses.
- **Supported File Types:** PDF, DOCX, TXT, MD, and PPTX (if feasible).

### 8.4 Chat Over Documents

Users can ask natural language questions over permitted internal knowledge.

- Generate answers **only** using authorized, verified source materials.
- Include interactive, verifiable inline citations in the generated response.
- Maintain multi-turn conversation history.
- Render source previews or snippet references clearly in the UI window.
- Refuse to answer gracefully when evidence is missing in the retrieved context.

### 8.5 Graph Explorer

The UI must provide an interactive visualization block letting users inspect:

- **Key Entities:** People, Departments, Projects, Technologies, Policies, Documents.
- **Semantic Relationships:** Mappings connecting those entities across separate files.

---

## 9. Security Requirements

This is the most critical pillar of the platform architecture.

### 9.1 Hard Rule

> **Unauthorized content must never be sent to the LLM.** Access control validation must execute before retrieval, reranking, prompt assembly, or text generation occurs.

### 9.2 Access Levels

Implement clear, hierarchical data classifications (still required even in single-tenant):

- `PUBLIC`
- `INTERNAL`
- `CONFIDENTIAL`
- `RESTRICTED`

### 9.3 Enforcement Points

Access control checks must be enforced explicitly at the following boundary layers:

- **API Layer:** Endpoint route authorization guards.
- **Document Layer:** Database access query filtering.
- **Chunk Layer:** Vector and Keyword search stages.
- **Graph Layer:** Tenant-scoped Cypher query sub-graphs.
- **Chat Layer:** Pre-generation context assembly stage.
- **Administrative Layer:** Evaluation and Admin console dashboards.

### 9.4 Audit Logging

Every access attempt and mutation must write a permanent audit log capturing:

- `user_id` and `tenant_id`
- Event timestamp (UTC)
- Executed action and targets (`resource_type`, `resource_id`)
- Query text strings and execution status results (`denied_access`, `success`, `failure`)
- Processing latency and target metadata metrics

### 9.5 Tenant Safety

Every analytical, indexing, or retrieval execution block must be fundamentally tenant-aware.

---

## 10. Document Ingestion Pipeline

When a file is uploaded, the processing pipeline must transition through this sequence asynchronously:

```text
[Upload File]
      ↓
[Store Raw File]
      ↓
[Extract Raw Text]
      ↓
[Clean & Normalize Text]
      ↓
[Split into Semantic Chunks]
      ↓
[Generate Chunk Embeddings]
      ↓
[Store Chunks & Embeddings in Postgres / pgvector]
      ↓
[Extract Entities & Relationships via LLM]
      ↓
[Store Graph Structures in Neo4j]
      ↓
[Index Metadata & Emit Audit Ingestion Events]
```

### 10.1 Text Extraction

Extract clean text, structural headings, distinct paragraphs, page tracking numbers, and embedded data tables from raw binaries.

### 10.2 Semantic Chunking

Do not use naive, fixed-character splitting. Chunking logic must detect:

- Document structural headings
- Section or markdown boundaries
- Paragraph and page breaks

**Target Metrics:** - 400 to 800 tokens per chunk.

- Configured overlap of 100 to 150 tokens to preserve context continuity.

### 10.3 Embedding Generation

Generate dense vector representations for each calculated chunk using a standardized embedding model optimized for vector search.

### 10.4 Entity and Graph Extraction

Utilize an extraction model or robust logic to discover discrete entities and map structural inter-relations, writing them directly into Neo4j nodes and edges with provenance links pointing back to the originating document.

---

## 11. Retrieval Design

The platform must combine distinct search mechanics into a unified hybrid retrieval framework.

### 11.1 BM25 Keyword Search

Used for exact matching: names, specialized acronyms, explicit policy codes, technical identifiers, and matching document titles.

### 11.2 Vector Search

Used for concept matching: semantic similarity, conceptual alignment, and handling complex paraphrased user questions.

### 11.3 Graph Retrieval

Used for structural matching: multi-hop relational lookups, cross-document mappings, mapping entity links ("who manages what"), and contextual tracking.

### 11.4 Hybrid Consolidation

Combine search arrays using a formal merge process:

1. Fetch candidate pieces concurrently across BM25, Vector, and Graph operations.
2. Deduplicate overlapping results.
3. Compute consolidated rankings (using Reciprocal Rank Fusion or Reranking models).
4. Prune unauthorized chunks based on current user privileges.
5. Compile the final prompt context window.

### 11.5 Complete Retrieval Flow

1. Validate user identity and session token.
2. Check tenant assignment.
3. Apply RBAC and document-level permission masks.
4. Fire concurrent lookups (BM25 Search, Vector Search, and Graph Queries).
5. Merge, deduplicate, and run reranking algorithms on hits.
6. Drop chunks failing validation checks.
7. Inject safe context snippets into the system template.
8. Stream generation outputs to the user interface.
9. Append references/citations and log the final transactional audit row.

---

## 12. Knowledge Graph Design

### 12.1 Supported Node Types

- `Person`
- `Department`
- `Project`
- `Technology`
- `Policy`
- `Document`
- `Organization`

### 12.2 Supported Relationship Types

- `MANAGES`
- `WORKS_ON`
- `USES`
- `REPORTS_TO`
- `BELONGS_TO`
- `CREATED_BY`
- `REFERENCES`
- `CONTAINS_ENTITY`

### 12.3 Relational Schema Example

```text
(John Smith:Person) -[:MANAGES]-> (Project Atlas:Project)
(Project Atlas:Project) -[:USES]-> (Kafka:Technology)
(Project Atlas:Project) -[:BELONGS_TO]-> (Platform Team:Department)
```

### 12.4 Graph Integrity Rules

- Every node and link structure must explicitly store its governing `tenant_id`.
- Graph modifications must tie cleanly to verifiable source documents.
- Target edges should record transactional provenance paths.
- Graph processing traversals must respect active user access controls.

---

## 13. Database Design

### 13.1 Core PostgreSQL Schema Tables

- `tenants`
- `users`
- `roles` & `user_roles`
- `documents` & `document_versions`
- `document_permissions` & `document_tags`
- `chunks` & `embeddings` _(pgvector optimized)_
- `conversations` & `messages`
- `audit_logs`
- `retrieval_runs`
- `feedback`

### 13.2 Common Operational Structural Columns

All tenant-specific database entities must feature:

- `id` (Primary Key UUID)
- `tenant_id` (Foreign Key index target)
- `created_at` & `updated_at` (Timestamps)

### 13.3 Crucial Document Fields

`title`, `description`, `file_name`, `file_type`, `storage_path`, `uploaded_by`, `security_level`, `processing_status`, `page_count`.

### 13.4 Chunk Schema Fields

`document_id`, `tenant_id`, `chunk_index`, `chunk_text`, `page_number`, `embedding` (`vector` type data alignment), `security_level`.

### 13.5 Audit Log Fields

`tenant_id`, `user_id`, `action`, `resource_type`, `resource_id`, `query_text`, `response_status`, `created_at`.

---

## 14. Backend Architecture

The Python application code must adopt a clean, modular, and layered architecture pattern:

```text
app/
├── api/          # Route controller entrypoints (No core business logic)
├── core/         # Core configs, security baselines, crypto initializations
├── models/       # Database ORM entity configuration schemas
├── schemas/      # Input/Output validation models (Pydantic definitions)
├── services/     # Core business workflows and business orchestration
├── repositories/ # Encapsulated transactional database queries
├── workers/      # Celery task distribution background routines
├── ingestion/    # Text parsers, splitters, and embedding execution workers
├── retrieval/    # Hybrid search, rank fusion, context layout builders
├── graph/        # Neo4j connections and programmatic Cypher generation
├── auth/         # Token lifecycles, user authentication, security helpers
└── audit/        # Automated logging and system metrics engine
```
