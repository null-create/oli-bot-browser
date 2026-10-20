import { LiveSegment, ToolCall, TurnActivity } from "../types";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendText(
  segments: LiveSegment[],
  text: string,
): LiveSegment[] {
  const last = segments[segments.length - 1];
  if (last && last.kind === "text" && !last.sealed) {
    const next = [...segments];
    next[next.length - 1] = { ...last, text: last.text + text };
    return next;
  }
  return [
    ...segments,
    { kind: "text", id: makeId(), text, timestamp: Date.now() },
  ];
}

export function appendThinking(
  segments: LiveSegment[],
  text: string,
): LiveSegment[] {
  const last = segments[segments.length - 1];
  if (last && last.kind === "thinking") {
    const next = [...segments];
    next[next.length - 1] = { ...last, text: last.text + text };
    return next;
  }
  return [...segments, { kind: "thinking", id: makeId(), text }];
}

export function sealText(segments: LiveSegment[]): LiveSegment[] {
  const last = segments[segments.length - 1];
  if (!last || last.kind !== "text" || last.sealed) return segments;
  const next = [...segments];
  next[next.length - 1] = { ...last, sealed: true };
  return next;
}

export function addTool(
  segments: LiveSegment[],
  call: ToolCall,
): LiveSegment[] {
  return [...segments, { kind: "tool", id: call.id, call }];
}

export function setToolResult(
  segments: LiveSegment[],
  id: string,
  result: string,
  finishedAt: number,
): LiveSegment[] {
  return segments.map((segment) => {
    if (segment.kind !== "tool" || segment.call.id !== id) return segment;
    return {
      ...segment,
      call: {
        ...segment.call,
        result,
        elapsed: (finishedAt - segment.call.startTime) / 1000,
      },
    };
  });
}

export function collectText(segments: LiveSegment[]): string[] {
  return segments
    .filter(
      (
        segment,
      ): segment is Extract<LiveSegment, { kind: "text" }> =>
        segment.kind === "text",
    )
    .map((segment) => segment.text.trim())
    .filter(Boolean);
}

export function collectActivity(
  segments: LiveSegment[],
  elapsed?: number,
): TurnActivity | undefined {
  const thinking = segments
    .filter(
      (
        segment,
      ): segment is Extract<LiveSegment, { kind: "thinking" }> =>
        segment.kind === "thinking",
    )
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n\n");
  const toolCalls = segments
    .filter(
      (segment): segment is Extract<LiveSegment, { kind: "tool" }> =>
        segment.kind === "tool",
    )
    .map((segment) => segment.call);

  if (!thinking && toolCalls.length === 0) return undefined;
  return { thinking, toolCalls, elapsed };
}
