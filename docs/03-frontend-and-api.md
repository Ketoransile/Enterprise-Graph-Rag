## 15. Frontend Architecture

### 15.1 Application Routing Layout

- `/login` (email/password; Google SSO planned)
- `/dashboard`
- `/documents` | `/documents/[id]`
- `/chat`
- `/graph`
- `/settings`
- `/admin/users` | `/admin/roles` | `/audit-logs`

### 15.2 Interface Component Requirements

- Unified sidebar navigational shell with adaptive top global context toolbars.
- Data table layouts for document control with built-in metadata filtering.
- Upload dropzones with integrated access control level config overlays.
- Real-time text-streaming chat pane featuring reactive citation popups.
- Responsive visualization block for graph data rendering.
- Uniform loading skeletons, fallback interfaces, and defensive empty states.

---

## 16. API Contract Requirements

All routes must validate `tenant_id` and evaluate user authorization controls. Responses must use standardized, explicit schemas.

### 16.1 Authentication Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### 16.2 Document Management Endpoints

- `POST /api/documents`
- `GET /api/documents`
- `GET /api/documents/{id}`
- `PATCH /api/documents/{id}`
- `DELETE /api/documents/{id}`
- `GET /api/documents/{id}/chunks`
- `GET /api/documents/{id}/versions`

### 16.3 Chat Endpoints

- `POST /api/chat` _(Supports event stream outputs)_
- `GET /api/chat/{conversationId}`
- `GET /api/chat/{conversationId}/messages`
- `POST /api/chat/{conversationId}/feedback`

### 16.4 Search Endpoints

- `POST /api/search/hybrid`
- `POST /api/search/graph`

### 16.5 Graph Endpoints

- `GET /api/graph/explore`

### 16.6 Administrative Endpoints

- `GET /api/admin/users`
- `GET /api/admin/audit-logs`
