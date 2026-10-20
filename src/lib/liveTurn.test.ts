import { describe, expect, it } from "vitest";
import {
  addTool,
  appendText,
  appendThinking,
  collectActivity,
  collectText,
  sealText,
  setToolResult,
} from "./liveTurn";
import { LiveSegment, ToolCall } from "../types";

const tool = (id: string): ToolCall => ({
  id,
  name: "bash",
  parameters: { command: "ls" },
  startTime: 1000,
});

describe("liveTurn", () => {
  it("merges consecutive text chunks into one segment", () => {
    const segments = appendText(appendText([], "Hello"), " world");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ kind: "text", text: "Hello world" });
  });

  it("starts a new text segment after the previous one is sealed", () => {
    const segments = appendText(sealText(appendText([], "preamble")), "final");
    expect(collectText(segments)).toEqual(["preamble", "final"]);
  });

  it("keeps thinking, text and tool segments in event order", () => {
    let segments: LiveSegment[] = [];
    segments = appendThinking(segments, "planning");
    segments = appendText(segments, "I will check");
    segments = addTool(segments, tool("t1"));
    segments = appendThinking(segments, "reading");
    segments = appendText(segments, "done");
    expect(segments.map((segment) => segment.kind)).toEqual([
      "thinking",
      "text",
      "tool",
      "thinking",
      "text",
    ]);
  });

  it("patches the matching tool result only", () => {
    let segments: LiveSegment[] = addTool(addTool([], tool("t1")), tool("t2"));
    segments = setToolResult(segments, "t2", "ok", 1500);
    const first = segments[0];
    const second = segments[1];
    if (first.kind !== "tool" || second.kind !== "tool") {
      throw new Error("expected tool segments");
    }
    expect(first.call.result).toBeUndefined();
    expect(second.call).toMatchObject({ result: "ok", elapsed: 0.5 });
  });

  it("collects trimmed non-empty text segments", () => {
    let segments: LiveSegment[] = appendText([], "  first  ");
    segments = appendText(sealText(segments), "   ");
    segments = appendText(sealText(segments), "second");
    expect(collectText(segments)).toEqual(["first", "second"]);
  });

  it("builds an activity summary from thinking and tool calls", () => {
    let segments: LiveSegment[] = appendThinking([], "thinking hard");
    segments = addTool(segments, { ...tool("t1"), result: "ok", elapsed: 2 });
    expect(collectActivity(segments, 3.5)).toEqual({
      thinking: "thinking hard",
      toolCalls: [{ ...tool("t1"), result: "ok", elapsed: 2 }],
      elapsed: 3.5,
    });
  });

  it("omits activity when there is nothing to summarise", () => {
    expect(collectActivity([], 1)).toBeUndefined();
    expect(collectActivity(appendText([], "just text"), 1)).toBeUndefined();
  });
});
