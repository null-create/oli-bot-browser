import {
  ChatMessage,
  ServerActivity,
  ServerSubAgent,
  ServerToolCall,
  Session,
  SessionMeta,
  TodoItem,
  ToolCallRequest,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function mapParameters(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return asRecord(parsed) ?? {};
    } catch {
      return {};
    }
  }
  return asRecord(value) ?? {};
}

/** Map a persisted tool-call request (`{id, function: {name, arguments}}`). */
function mapToolCallRequest(raw: unknown): ToolCallRequest | null {
  const record = asRecord(raw);
  if (!record) return null;
  const fn = asRecord(record.function) ?? {};
  const name = String(fn.name ?? record.name ?? "");
  if (!name) return null;
  return {
    id: String(record.id ?? ""),
    name,
    parameters: mapParameters(fn.arguments ?? record.arguments ?? record.parameters),
  };
}

/** Map a tool call recorded by the server for a finished turn. */
function mapServerToolCall(raw: unknown): ServerToolCall | null {
  const record = asRecord(raw);
  if (!record) return null;
  const name = String(record.name ?? "");
  if (!name) return null;
  const elapsed =
    typeof record.elapsed === "number" ? record.elapsed : undefined;
  return {
    id: String(record.id ?? ""),
    name,
    parameters: mapParameters(record.parameters),
    result: typeof record.result === "string" ? record.result : undefined,
    elapsed,
  };
}

function mapTodo(raw: unknown): TodoItem | null {
  const record = asRecord(raw);
  if (!record) return null;
  const content = String(record.content ?? "");
  if (!content) return null;
  const status = String(record.status ?? "pending");
  const priority = String(record.priority ?? "medium");
  return {
    content,
    status: (
      ["pending", "in_progress", "completed", "cancelled"] as const
    ).includes(status as TodoItem["status"])
      ? (status as TodoItem["status"])
      : "pending",
    priority: (["high", "medium", "low"] as const).includes(
      priority as TodoItem["priority"],
    )
      ? (priority as TodoItem["priority"])
      : "medium",
  };
}

function mapServerSubAgent(raw: unknown): ServerSubAgent | null {
  const record = asRecord(raw);
  if (!record) return null;
  const taskId = String(record.task_id ?? "");
  if (!taskId) return null;
  const status = String(record.status ?? "done");
  const rawCalls = Array.isArray(record.tool_calls) ? record.tool_calls : [];
  const rawTodos = Array.isArray(record.todos) ? record.todos : [];
  return {
    task_id: taskId,
    agent_name: String(record.agent_name ?? ""),
    pool_name: String(record.pool_name ?? "default"),
    task: String(record.task ?? ""),
    status: (
      ["running", "done", "error"] as const
    ).includes(status as ServerSubAgent["status"])
      ? (status as ServerSubAgent["status"])
      : "done",
    activity: String(record.activity ?? ""),
    full_text: String(record.full_text ?? ""),
    text: String(record.text ?? ""),
    tool_calls: rawCalls
      .map(mapServerToolCall)
      .filter((c): c is ServerToolCall => c !== null),
    todos: rawTodos
      .map(mapTodo)
      .filter((t): t is TodoItem => t !== null),
  };
}

/** Map the raw turn activity blob attached to a persisted message. */
export function mapServerActivity(raw: unknown): ServerActivity | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const rawCalls = Array.isArray(record.tool_calls) ? record.tool_calls : [];
  const rawAgents = Array.isArray(record.sub_agents) ? record.sub_agents : [];
  return {
    thinking: typeof record.thinking === "string" ? record.thinking : "",
    elapsed:
      typeof record.elapsed === "number" ? record.elapsed : undefined,
    tool_calls: rawCalls
      .map(mapServerToolCall)
      .filter((c): c is ServerToolCall => c !== null),
    sub_agents: rawAgents
      .map(mapServerSubAgent)
      .filter((a): a is ServerSubAgent => a !== null),
  };
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
  const rawCalls = Array.isArray(m.tool_calls) ? m.tool_calls : [];
  const toolCalls = rawCalls
    .map(mapToolCallRequest)
    .filter((c): c is ToolCallRequest => c !== null);
  const toolCallId =
    typeof m.tool_call_id === "string" && m.tool_call_id
      ? m.tool_call_id
      : undefined;
  const serverActivity = mapServerActivity(m.activity);
  return {
    id: `srv-${index}-${timestamp.toString(36)}`,
    role,
    content: String(m.content ?? ""),
    timestamp,
    ...(toolCalls.length ? { toolCalls } : {}),
    ...(toolCallId ? { toolCallId } : {}),
    ...(serverActivity ? { serverActivity } : {}),
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
  const rawTodos = Array.isArray(data.todos) ? data.todos : [];
  const todos = rawTodos
    .map(mapTodo)
    .filter((t): t is TodoItem => t !== null);
  return {
    ...sessionFromMeta(meta),
    messages: msgs.map((m, i) =>
      mapMessage((m as Record<string, unknown>) ?? {}, i),
    ),
    msgCount: Array.isArray(data.messages)
      ? msgs.length
      : ((data.msg_count as number | undefined) ?? 0),
    ...(todos.length ? { todos } : {}),
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
