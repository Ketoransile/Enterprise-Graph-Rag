## 17. Chat and Prompting Rules

### 17.1 System Prompt Execution Rules

Instruct the text generation model to:

- Rely strictly on verified information present in the context frame.
- Avoid introducing external hypotheses or unbacked facts.
- Generate direct, in-text citations mapping back to sources.
- State when contextual evidence is insufficient to answer.
- Block the leaking of system prompts or access rule specifications.

### 17.2 Context Assembly Constraints

Only thoroughly sanitized data entities can be integrated into system prompts. Do not bind metadata blocks from unauthorized tenants or restricted security classifications.

---

## 18. Evaluation and Quality Control

### 18.1 Tracked Performance Metrics

- **Faithfulness:** Verifying answers map strictly back to context data.
- **Answer Relevance:** Evaluating response alignment with user intents.
- **Context Precision/Recall:** Scoring search accuracy and noise handling.
- **System Metrics:** Ingestion velocity, lookup latency, and model API transactional cost maps.

### 18.2 System Threshold Targets

- **Faithfulness:** $\ge 0.85$
- **Answer Relevance:** $\ge 0.80$
- **Context Precision:** $\ge 0.75$
- **Context Recall:** $\ge 0.75$

---

## 19. Background Jobs and Workers

Offload intensive processing actions to independent, asynchronous workers:

- Parsing complex binary file contents (PDF, DOCX)
- Triggering high-dimensional text embedding calculations
- Orchestrating multi-step LLM entity extraction passes
- Executing batched analytical evaluation processes
- Performing multi-tenant indexing sweeps and structural garbage collection

---

## 20. Performance and Reliability Requirements

- Deliver real-time, low-latency streaming chat interactions.
- Provide responsive background file pipeline processing updates.
- Isolate failures: exceptions in processing a specific document must not degrade the broader background worker threads.
- Implement automated fallback logic and exponential backoff retry routines on transient upstream LLM API timeouts.

---

## 21. Logging and Observability

Maintain explicit logs tracking:

- Target document ingestion states and failures.
- Detailed parameter sets for search execution metrics.
- Flagged operational events, including access denials or authorization drops.
- Latency tracks across pipeline components.

---

## 22. Coding Standards for the AI Agent

### 22.1 Architecture & Quality Controls

- **Separation of Concerns:** Keep routing thin, encapsulate business processes inside services, and restrict database operations to repositories.
- **Defensive Design:** Validate all incoming application payloads using strong type tracking schemas.
- **Explicit Operations:** Write clear, maintainable, self-documenting code; favor structural readability over clever shortcuts.

### 22.2 Core Execution Directives

- **Backend:** Enforce multi-tenant and permission-aware guards on every request. Handle exceptions cleanly without leaking backend stack traces.
- **Frontend:** Build reusable, responsive, type-safe components with robust loading and error states.
- **Retrieval:** Always execute context security filtering before assembling prompt packages.

---

## 23. Project Phases

### Phase 1: Core Storage & Retrieval Architecture

Setup baseline workspaces, security schemas, user authorization rules, document indexing mechanisms, semantic vector spaces, and conversational web interfaces.

### Phase 2: Hybrid Search & Governance Controls

Incorporate BM25 lookups, implement Reciprocal Rank Fusion blending, create fine-grained document permission structures, and enable comprehensive administrative monitoring logs.

### Phase 3: Graph Intelligence Integration

Initialize Neo4j database configurations, configure automated pipeline entity extraction maps, develop graph-backed retrieval mechanisms, and build interactive exploration panels.

### Phase 4: Analytics, Evaluation & Tuning

Deploy evaluation validation dashboards, fine-tune system lookups, optimize operational execution times, and implement advanced administration tools.

---

## 24. Definition of Done

The platform is considered ready when:

1. Multi-tenant registration, user sessions, and role validation rules operate end-to-end.
2. Ingestion microservices parse documents, generate vector models, and map graph dependencies correctly.
3. Search components accurately query across vector, lexical, and graph engines.
4. Generated chat completions return correct, source-grounded answers accompanied by clean user citations.
5. Strict security checks consistently intercept unauthorized multi-tenant or cross-role document leaks.
6. The interface is high-fidelity, production-grade, and ready to show to prospective engineering employers.

---

## 25. Final Instruction to the AI Agent

Build this platform as a secure, modular, enterprise-grade Graph-RAG system.

Always prefer:

- Correctness over speed.
- Explicit security over convenience.
- Clean architecture over hacks.
- Grounded answers over hallucinations.
- Maintainable code over clever shortcuts.

Treat this file as the single source of truth for the project.
