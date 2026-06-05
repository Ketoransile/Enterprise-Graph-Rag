export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type ApiFetchOptions = RequestInit & { token?: string };

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function getApiErrorMessage(status: number, text: string): string {
  if (!text) return `Request failed (${status})`;

  try {
    const body = JSON.parse(text) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // Fall through to the raw body text.
  }

  return text;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const mergedHeaders = new Headers(headers || {});
  mergedHeaders.set("Content-Type", "application/json");
  if (token) mergedHeaders.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: rest.credentials ?? "include",
    headers: mergedHeaders,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(getApiErrorMessage(res.status, text), res.status, text);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// Types based on backend schemas
export interface Document {
  id: string;
  document_id?: string;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string;
  storage_path: string;
  security_level: string;
  processing_status: string;
  page_count: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  page_number: number | null;
  security_level: string;
}

export interface IngestionJob {
  id: string;
  document_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export interface HealthStatus {
  status: "ready" | "not_ready";
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  query_text: string | null;
  response_status: string | null;
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface GraphExploreResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface UserListItem {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles: string[];
  created_at: string | null;
}

export interface RoleRead {
  id: string;
  name: string;
  description: string | null;
  user_count: number;
  created_at: string | null;
}

// API functions
export const api = {
  health: () => apiFetch<HealthStatus>("/api/v1/ready"),

  auth: {
    googleStart: () =>
      apiFetch<{ auth_url: string }>("/api/v1/auth/google"),
    googleComplete: () =>
      apiFetch<{ access_token: string; token_type: string }>("/api/v1/auth/google/complete", {
        method: "POST",
      }),
    login: (email: string, password: string) =>
      apiFetch<{ access_token: string; token_type: string }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, fullName?: string) =>
      apiFetch<{ access_token: string; token_type: string }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName }),
      }),
    me: (token: string) =>
      apiFetch<{
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
        is_active: boolean;
        roles: string[];
      }>("/api/v1/auth/me", { token }),
    invite: (data: { email: string; full_name?: string; role?: string }, token: string) =>
      apiFetch<{ id: string; email: string; roles: string[]; temporary_password: string }>("/api/v1/auth/invite", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    listUsers: (token: string) =>
      apiFetch<UserListItem[]>("/api/v1/auth/users", { token }),
    updateUserStatus: (id: string, isActive: boolean, token: string) =>
      apiFetch<UserListItem>(`/api/v1/auth/users/${id}/status`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ is_active: isActive }),
      }),
    updateUserRoles: (id: string, roles: string[], token: string) =>
      apiFetch<UserListItem>(`/api/v1/auth/users/${id}/roles`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ roles }),
      }),
    listRoles: (token: string) =>
      apiFetch<RoleRead[]>("/api/v1/auth/roles", { token }),
    createRole: (data: { name: string; description?: string }, token: string) =>
      apiFetch<RoleRead>("/api/v1/auth/roles", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    updateRole: (name: string, data: { description?: string | null }, token: string) =>
      apiFetch<RoleRead>(`/api/v1/auth/roles/${encodeURIComponent(name)}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(data),
      }),
  },

  documents: {
    list: (token: string) =>
      apiFetch<Document[]>("/api/v1/documents", { token }),
    get: (id: string, token: string) =>
      apiFetch<Document>(`/api/v1/documents/${id}`, { token }),
    create: (
      data: {
        title: string;
        description?: string;
        file_name: string;
        file_type: string;
        storage_path: string;
        security_level?: string;
        page_count?: number;
      },
      token: string,
    ) =>
      apiFetch<Document>("/api/v1/documents", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: {
        title?: string;
        description?: string;
        security_level?: string;
        processing_status?: string;
        page_count?: number;
      },
      token: string,
    ) =>
      apiFetch<Document>(`/api/v1/documents/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(data),
      }),
    delete: (id: string, token: string) =>
      apiFetch<void>(`/api/v1/documents/${id}`, {
        method: "DELETE",
        token,
      }),
    reprocess: (id: string, token: string) =>
      apiFetch<Document>(`/api/v1/documents/${id}/reprocess`, {
        method: "POST",
        token,
      }),
    uploadFile: async (id: string, file: File, token: string) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/v1/documents/${id}/upload`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new ApiError(getApiErrorMessage(res.status, text), res.status, text);
      }

      return (await res.json()) as Document;
    },
    chunks: (id: string, token: string) =>
      apiFetch<Chunk[]>(`/api/v1/documents/${id}/chunks`, { token }),
  },

  ingestion: {
    register: (
      data: {
        title: string;
        description?: string;
        file_name: string;
        file_type: string;
        storage_path: string;
        security_level?: string;
        page_count?: number;
      },
      token: string,
    ) =>
      apiFetch<Document>("/api/v1/ingestion/register", {
        method: "POST",
        token,
        body: JSON.stringify(data),
      }),
  },

  search: {
    hybrid: (query: string, token: string) =>
      apiFetch<{ results: unknown[] }>("/api/v1/search/hybrid", {
        method: "POST",
        token,
        body: JSON.stringify({ query }),
      }),
  },

  admin: {
    auditLogs: {
      list: (token: string, skip = 0, limit = 50, action?: string) => {
        const queryParams = new URLSearchParams();
        queryParams.set("skip", skip.toString());
        queryParams.set("limit", limit.toString());
        if (action) queryParams.set("action", action);
        return apiFetch<AuditLog[]>(`/api/v1/admin/audit-logs?${queryParams.toString()}`, { token });
      }
    }
  },

  graph: {
    explore: (token: string, query?: string, limit = 100) =>
      apiFetch<GraphExploreResponse>("/api/v1/graph/explore", {
        method: "POST",
        token,
        body: JSON.stringify({ query: query || null, limit }),
      }),
  },

  analytics: {
    getMetrics: (token: string, days = 30) =>
      apiFetch<AnalyticsResponse>(`/api/v1/analytics?days=${days}`, { token }),
  },
};

// ── Analytics Types ──────────────────────────────────────────────────────
export interface OverviewMetrics {
  total_documents: number;
  total_queries: number;
  avg_faithfulness: number | null;
  avg_relevance: number | null;
  avg_context_precision: number | null;
  avg_latency_ms: number | null;
}

export interface DailyMetric {
  date: string;
  query_count: number;
  avg_faithfulness: number | null;
  avg_relevance: number | null;
  avg_latency_ms: number | null;
}

export interface RecentEvaluation {
  id: string;
  query_text: string;
  faithfulness_score: number | null;
  relevance_score: number | null;
  context_precision_score: number | null;
  latency_ms: number | null;
  num_chunks_retrieved: number | null;
  num_chunks_after_rbac: number | null;
  created_at: string;
}

export interface AnalyticsResponse {
  overview: OverviewMetrics;
  daily: DailyMetric[];
  recent_evaluations: RecentEvaluation[];
}
