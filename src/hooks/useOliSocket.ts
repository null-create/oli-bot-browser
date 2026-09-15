import { useCallback, useEffect, useRef, useState } from "react";
import { OliEvent } from "../types";

export type WsStatus = "connecting" | "connected" | "disconnected";

function defaultWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host || "localhost:9734";
  return `${proto}://${host}/v1/chat`;
}

/**
 * Manages the WebSocket connection to the oli API server's `/v1/chat`
 * endpoint. Incoming typed JSON frames are dispatched to `onEvent`. Sending a
 * user turn is `.send({content})`; history reset is `.send({action:"clear"})`.
 * Automatically reconnects with backoff when the socket drops.
 */
export function useOliSocket(onEvent: (ev: OliEvent) => void) {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  const reconnectTimer = useRef<number | null>(null);
  const attempts = useRef(0);

  onEventRef.current = onEvent;

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus("connecting");
      const ws = new WebSocket(defaultWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        attempts.current = 0;
        setStatus("connected");
      };

      ws.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data as string) as OliEvent;
          onEventRef.current(parsed);
        } catch {
          // Ignore malformed non-JSON frames.
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        if (disposed) return;
        setStatus("disconnected");
        const delay = Math.min(1000 * 2 ** attempts.current, 15000);
        attempts.current += 1;
        reconnectTimer.current = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const clear = useCallback(() => send({ action: "clear" }), [send]);

  return { status, send, clear };
}
