import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OliEvent } from "../types";
import { useOliSocket } from "./useOliSocket";

type FakeWebSocketHandler = ((this: FakeWebSocket, ev: unknown) => void) | null;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;

  readyState = 0;
  url: string;
  sent: string[] = [];
  onopen: FakeWebSocketHandler = null;
  onmessage: FakeWebSocketHandler = null;
  onerror: FakeWebSocketHandler = null;
  onclose: FakeWebSocketHandler = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.call(this, {});
  }

  emitOpen() {
    this.readyState = 1;
    this.onopen?.call(this, {});
  }

  emitMessage(data: string) {
    this.onmessage?.call(this, { data });
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useOliSocket", () => {
  it("connects, dispatches parsed frames, and sends payloads", () => {
    const onEvent = vi.fn<(ev: OliEvent) => void>();
    const { result, unmount } = renderHook(() => useOliSocket(onEvent));

    const ws = FakeWebSocket.instances[0];
    expect(ws.url).toMatch(/^ws:\/\//);
    expect(ws.url).toMatch(/\/v1\/chat$/);
    expect(result.current.status).toBe("connecting");

    act(() => ws.emitOpen());
    expect(result.current.status).toBe("connected");

    act(() =>
      ws.emitMessage('{"type":"todo","data":{"todos":[]}}'),
    );
    expect(onEvent).toHaveBeenCalledWith({
      type: "todo",
      data: { todos: [] },
    });

    act(() => ws.emitMessage("not json"));
    expect(onEvent).toHaveBeenCalledTimes(1);

    act(() => result.current.send({ content: "hello" }));
    expect(ws.sent).toEqual([JSON.stringify({ content: "hello" })]);

    act(() => result.current.clear("sess-1"));
    expect(ws.sent[1]).toBe(
      JSON.stringify({ action: "clear", session_id: "sess-1" }),
    );

    act(() => result.current.clear());
    expect(ws.sent[2]).toBe(JSON.stringify({ action: "clear" }));

    unmount();
  });

  it("reconnects with capped exponential backoff", () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useOliSocket(() => {}));

    expect(FakeWebSocket.instances).toHaveLength(1);
    act(() => FakeWebSocket.instances[0].close());
    expect(result.current.status).toBe("disconnected");

    const delays = [1000, 2000, 4000, 8000, 15000, 15000];
    let instanceCount = 1;

    for (const expected of delays) {
      act(() => vi.advanceTimersByTime(expected - 1));
      expect(FakeWebSocket.instances).toHaveLength(instanceCount);

      act(() => vi.advanceTimersByTime(1));
      instanceCount += 1;
      expect(FakeWebSocket.instances).toHaveLength(instanceCount);

      const latest = FakeWebSocket.instances[instanceCount - 1];
      expect(latest).toBeDefined();
      act(() => latest.close());
    }

    unmount();
    act(() => vi.advanceTimersByTime(16000));
    expect(FakeWebSocket.instances).toHaveLength(instanceCount);
  });
});