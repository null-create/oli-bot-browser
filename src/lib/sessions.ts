import { ChatMessage, Session, SessionMeta } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function mapMessage(m: Record<string, unknown>, index: number): ChatMessage {
  const rawRole = String(m.role ?? "assistant");
  const role: ChatMessage["role"] = (
    ["user", "assistant", "system", "tool"].includes(rawRole)
      ? rawRole
      : "assistant"
  ) as ChatMessage["role"];
  const rawTs = m.timestamp;
  const timestamp =
    typeof rawTs === "number"
      ? rawTs
      : typeof rawTs === "string"
        ? new Date(rawTs).getTime() || Date.now()
        : Date.now();
  return {
    id: `srv-${index}-${timestamp.toString(36)}`,
    role,
    content: String(m.content ?? ""),
    timestamp,
  };
}

export function sessionFromMeta(meta: SessionMeta): Session {
  return {
    id: meta.id,
    name: meta.name,
    messages: [],
    createdAt: meta.created_at,
    updatedAt: meta.updated_at,
    server: meta.server,
    model: meta.model,
    profile: meta.profile,
    totalTokens: meta.total_tokens,
    totalTokensEstimated: meta.total_tokens_estimated,
  };
}

function mapSession(data: Record<string, unknown>): Session {
  const msgs = Array.isArray(data.messages) ? (data.messages as unknown[]) : [];
  const createdAt = String(data.created_at ?? "");
  const updatedAt = String(data.updated_at ?? "");
  const total = data.total_tokens as number | undefined;
  const meta: SessionMeta = {
    id: String(data.id ?? ""),
    name: String(data.name ?? "untitled"),
    created_at: createdAt,
    updated_at: updatedAt,
    server: String(data.server ?? ""),
    model: String(data.model ?? ""),
    profile: String(data.profile ?? ""),
    total_tokens: total ?? 0,
    total_tokens_estimated: Boolean(data.total_tokens_estimated),
  };
  return {
    ...sessionFromMeta(meta),
    messages: msgs.map((m, i) =>
      mapMessage((m as Record<string, unknown>) ?? {}, i),
    ),
    msgCount: Array.isArray(data.messages)
      ? msgs.length
      : ((data.msg_count as number | undefined) ?? 0),
  };
}

export async function listSessions(): Promise<Session[]> {
  const body = await request<{ sessions: Record<string, unknown>[] }>(
    "/v1/sessions",
  );
  return (body.sessions ?? []).map(mapSession);
}

export async function createSession(): Promise<Session> {
  const data = await request<Record<string, unknown>>("/v1/sessions", {
    method: "POST",
  });
  return mapSession(data);
}

export async function getSession(id: string): Promise<Session> {
  const data = await request<Record<string, unknown>>(
    `/v1/sessions/${encodeURIComponent(id)}`,
  );
  return mapSession(data);
}

export async function renameSession(
  id: string,
  name: string,
): Promise<Session> {
  const data = await request<Record<string, unknown>>(
    `/v1/sessions/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
  );
  return mapSession(data);
}

export async function deleteSession(id: string): Promise<void> {
  await request<unknown>(`/v1/sessions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
