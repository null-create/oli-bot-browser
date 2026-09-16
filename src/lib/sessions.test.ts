import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  renameSession,
  sessionFromMeta,
} from "./sessions";
import type { SessionMeta } from "../types";

function mockFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Not Found",
    json: () => Promise.resolve(response),
  });
}

const meta: SessionMeta = {
  id: "s1",
  name: "my session",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  server: "ollama",
  model: "llama3",
  profile: "default",
  total_tokens: 42,
  total_tokens_estimated: true,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("sessionFromMeta", () => {
  it("maps meta fields onto a session with no messages", () => {
    const s = sessionFromMeta(meta);
    expect(s).toEqual({
      id: "s1",
      name: "my session",
      messages: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      server: "ollama",
      model: "llama3",
      profile: "default",
      totalTokens: 42,
      totalTokensEstimated: true,
    });
  });
});

describe("listSessions", () => {
  it("maps a server payload into sessions with coerced messages", async () => {
    const fetchMock = mockFetch({
      sessions: [
        {
          ...meta,
          messages: [
            { role: "user", content: "hi", timestamp: 1000 },
            { role: "tool", content: "result", timestamp: "2000" },
            { role: "something-else", content: "x", timestamp: 3000 },
            { timestamp: "not-a-date" },
          ],
        },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const sessions = await listSessions();

    expect(fetchMock).toHaveBeenCalledWith("/v1/sessions", undefined);
    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.id).toBe("s1");
    expect(s.name).toBe("my session");
    expect(s.msgCount).toBe(4);
    expect(s.messages.map((m) => m.role)).toEqual([
      "user",
      "tool",
      "assistant",
      "assistant",
    ]);
    expect(s.messages[0]).toMatchObject({
      id: `srv-0-${1000..toString(36)}`,
      content: "hi",
      timestamp: 1000,
    });
    expect(s.messages[1].timestamp).toBe(new Date("2000").getTime());
    expect(s.messages[3].timestamp).toBeTypeOf("number");
  });

  it("defaults fields when they are missing", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        sessions: [{ id: "x", msg_count: 0 }],
      }),
    );

    const sessions = await listSessions();

    expect(sessions[0]).toMatchObject({
      id: "x",
      name: "untitled",
      msgCount: 0,
      totalTokens: 0,
      totalTokensEstimated: false,
      createdAt: "",
      updatedAt: "",
    });
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 404));

    await expect(listSessions()).rejects.toThrow("404 Not Found");
  });
});

describe("createSession", () => {
  it("POSTs to /v1/sessions with no body", async () => {
    const fetchMock = mockFetch(meta);
    vi.stubGlobal("fetch", fetchMock);

    const s = await createSession();

    expect(fetchMock).toHaveBeenCalledWith("/v1/sessions", { method: "POST" });
    expect(s).toMatchObject({ id: "s1", name: "my session", messages: [] });
  });
});

describe("getSession", () => {
  it("fetches and maps a single session", async () => {
    const fetchMock = mockFetch({ ...meta, messages: [] });
    vi.stubGlobal("fetch", fetchMock);

    const s = await getSession("s1");

    expect(fetchMock).toHaveBeenCalledWith("/v1/sessions/s1", undefined);
    expect(s.id).toBe("s1");
  });

  it("URL-encodes the session id", async () => {
    const fetchMock = mockFetch(meta);
    vi.stubGlobal("fetch", fetchMock);

    await getSession("a/b c");

    expect(fetchMock).toHaveBeenCalledWith("/v1/sessions/a%2Fb%20c", undefined);
  });
});

describe("renameSession", () => {
  it("PUTs the new name as JSON", async () => {
    const fetchMock = mockFetch({ ...meta, name: "renamed" });
    vi.stubGlobal("fetch", fetchMock);

    const s = await renameSession("s1", "renamed");

    expect(fetchMock).toHaveBeenCalledWith("/v1/sessions/s1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "renamed" }),
    });
    expect(s.name).toBe("renamed");
  });
});

describe("deleteSession", () => {
  it("DELETEs the session", async () => {
    const fetchMock = mockFetch(null);
    vi.stubGlobal("fetch", fetchMock);

    await deleteSession("s1");

    expect(fetchMock).toHaveBeenCalledWith("/v1/sessions/s1", {
      method: "DELETE",
    });
  });
});