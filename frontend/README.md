# Frontend

Next.js (App Router) + TypeScript UI for the Graph-RAG platform.

- Routes: /login, /register, /dashboard, /documents/[id], /chat, /graph, /settings, /admin/*.
- Components: shadcn/ui-based shells, tables, upload dropzone with ACL controls, chat pane with citations, graph canvas.
- State/data: React Query, optional Zustand; typed API client aligned to backend OpenAPI.

Phase 1 focus: layout shell, auth flows, document list, chat surface wired to backend contracts.
