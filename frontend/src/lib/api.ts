import { getIdToken } from "./firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, signal } = options;

  const authHeaders = await getAuthHeaders();

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...headers,
    },
    signal,
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  let retries = 2;
  let lastError: Error | null = null;

  while (retries >= 0) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, config);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Request failed" }));
        throw new ApiError(data.detail || "Request failed", res.status);
      }

      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (signal?.aborted) throw err;
      lastError = err as Error;
      retries--;
      if (retries >= 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

async function uploadFile(endpoint: string, formData: FormData): Promise<unknown> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new ApiError(data.detail || "Upload failed", res.status);
  }

  return res.json();
}

// ==================== Auth ====================
export const authApi = {
  verify: (idToken: string) =>
    request("/api/auth/verify", { method: "POST", body: { id_token: idToken } }),
};

// ==================== User ====================
export const userApi = {
  getProfile: () => request<{
    id: string;
    email: string | null;
    display_name: string | null;
    avatar_url: string | null;
    provider: string;
    created_at: string;
  }>("/api/user"),

  getSettings: () => request<{
    theme: string;
    ai_model: string;
    temperature: number;
    max_tokens: number;
    sidebar_collapsed: boolean;
  }>("/api/user/settings"),

  updateSettings: (data: Partial<{
    theme: string;
    ai_model: string;
    temperature: number;
    max_tokens: number;
    sidebar_collapsed: boolean;
  }>) => request("/api/user/settings", { method: "PUT", body: data }),
};

// ==================== Conversations ====================
export type ConversationItem = {
  id: string;
  title: string;
  is_pinned: boolean;
  model_used: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export type MessageItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model_used: string | null;
  tokens_used: number | null;
  is_edited: boolean;
  created_at: string;
};

export type ConversationDetail = ConversationItem & {
  messages: MessageItem[];
};

export const conversationsApi = {
  list: (search?: string) =>
    request<ConversationItem[]>(`/api/chats${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  create: (title?: string) =>
    request<ConversationItem>("/api/chats", { method: "POST", body: { title: title || "New Chat" } }),

  get: (id: string) =>
    request<ConversationDetail>(`/api/chats/${id}`),

  update: (id: string, data: { title?: string; is_pinned?: boolean }) =>
    request<ConversationItem>(`/api/chats/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    request(`/api/chats/${id}`, { method: "DELETE" }),

  export: (id: string) =>
    request(`/api/chats/${id}/export`),
};

// ==================== Chat (SSE Streaming) ====================
export type ChatStreamEvent =
  | { type: "meta"; conversation_id: string; message_id: string }
  | { type: "content"; content: string }
  | { type: "done"; usage: Record<string, number> }
  | { type: "error"; content: string };

export async function* streamChat(
  message: string,
  conversationId?: string | null,
  model?: string,
  temperature?: number,
  maxTokens?: number,
  fileIds?: string[],
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
      model,
      temperature,
      max_tokens: maxTokens,
      file_ids: fileIds,
    }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: "Chat request failed" }));
    throw new ApiError(data.detail || "Chat request failed", res.status);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("data: ")) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          yield data as ChatStreamEvent;
        } catch {
          // Skip malformed events
        }
      }
    }
  }
}

export const chatApi = {
  stop: (conversationId: string) =>
    request("/api/chat/stop", { method: "POST", body: { conversation_id: conversationId } }),

  getModels: () =>
    request<{ models: Array<{ id: string; name: string; context_window: number }> }>("/api/chat/models"),
};

// ==================== Upload ====================
export const uploadApi = {
  upload: (file: File, conversationId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (conversationId) formData.append("conversation_id", conversationId);
    return uploadFile("/api/upload", formData) as Promise<{
      id: string;
      filename: string;
      file_type: string;
      file_size: number;
      has_extracted_text: boolean;
    }>;
  },
};

// ==================== Health ====================
export const healthApi = {
  check: () => request<{ status: string; database: string; version: string }>("/api/health"),
};
