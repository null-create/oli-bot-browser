import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ChatMessage,
  LiveSegment,
  ServerActivity,
  ServerSubAgent,
} from "../types";
import {
  activityToTurnActivity,
  buildTranscript,
  collectSubAgents,
} from "./transcript";
import { getSession } from "./sessions";
import { collectActivity, collectText, setToolResult } from "./liveTurn";

let counter = 0;

function message(
  partial: Partial<ChatMessage> & Pick<ChatMessage, "role">,
): ChatMessage {
  counter += 1;
  return {
    id: `m-${counter}`,
    content: "",
    timestamp: 1000 + counter,
    ...partial,
  };
}

function activity(partial: Partial<ServerActivity> = {}): ServerActivity {
  return {
    thinking: "",
    tool_calls: [],
    sub_agents: [],
    ...partial,
  };
}

function subAgent(partial: Partial<ServerSubAgent> = {}): ServerSubAgent {
  return {
    task_id: "run-1",
    agent_name: "researcher",
    pool_name: "default",
    task: "find X",
    status: "done",
    activity: "done",
    full_text: "all done",
    text: "partial",
    tool_calls: [],
    todos: [],
    ...partial,
  };
}

describe("buildTranscript", () => {
  it("renders a plain exchange", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "hi" }),
      message({ role: "assistant", content: "hello" }),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ role: "user", content: "hi" });
    expect(lines[1]).toMatchObject({ role: "assistant", content: "hello" });
    expect(lines[1].activity).toBeUndefined();
  });

  it("ignores system messages", () => {
    const lines = buildTranscript([
      message({ role: "system", content: "you are a helpful agent" }),
      message({ role: "user", content: "hi" }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0].role).toBe("user");
  });

  it("drops the empty bubble of a tool request", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "read it" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "call_0", name: "read_file", parameters: { path: "a.py" } },
        ],
      }),
      message({ role: "tool", content: "contents", toolCallId: "call_0" }),
      message({ role: "assistant", content: "here it is" }),
    ]);

    expect(lines.map((line) => line.role)).toEqual(["user", "assistant"]);
    expect(lines[1].content).toBe("here it is");
  });

  it("rebuilds the activity block from the tool calls of the transcript", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "read it" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "call_0", name: "read_file", parameters: { path: "a.py" } },
        ],
      }),
      message({ role: "tool", content: "contents", toolCallId: "call_0" }),
      message({ role: "assistant", content: "here it is" }),
    ]);

    const activity = lines[1].activity;
    expect(activity).toBeDefined();
    expect(activity?.thinking).toBe("");
    expect(activity?.toolCalls).toHaveLength(1);
    expect(activity?.toolCalls[0]).toMatchObject({
      id: "call_0",
      name: "read_file",
      parameters: { path: "a.py" },
      result: "contents",
    });
  });

  it("prefers the activity recorded by the server", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "read it" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "call_0", name: "read_file", parameters: { path: "a.py" } },
        ],
      }),
      message({ role: "tool", content: "contents", toolCallId: "call_0" }),
      message({
        role: "assistant",
        content: "here it is",
        serverActivity: activity({
          thinking: "let me look",
          elapsed: 1.25,
          tool_calls: [
            {
              id: "call_0",
              name: "read_file",
              parameters: { path: "a.py" },
              result: "contents",
              elapsed: 0.5,
            },
          ],
        }),
      }),
    ]);

    const recorded = lines[1].activity;
    expect(recorded?.thinking).toBe("let me look");
    expect(recorded?.elapsed).toBe(1.25);
    expect(recorded?.toolCalls[0]).toMatchObject({
      name: "read_file",
      result: "contents",
      elapsed: 0.5,
    });
  });

  it("keeps the text the model produced before calling a tool", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "read it" }),
      message({
        role: "assistant",
        content: "let me check",
        toolCalls: [
          { id: "call_0", name: "read_file", parameters: { path: "a.py" } },
        ],
      }),
      message({ role: "tool", content: "contents", toolCallId: "call_0" }),
      message({ role: "assistant", content: "here it is" }),
    ]);

    expect(lines.map((line) => line.content)).toEqual([
      "read it",
      "let me check",
      "here it is",
    ]);
    expect(lines[1].activity).toBeUndefined();
    expect(lines[2].activity?.toolCalls).toHaveLength(1);
  });

  it("shows the activity of a turn that only ran tools", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "read it" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "call_0", name: "read_file", parameters: { path: "a.py" } },
        ],
      }),
      message({ role: "tool", content: "contents", toolCallId: "call_0" }),
    ]);

    expect(lines).toHaveLength(2);
    expect(lines[1].role).toBe("assistant");
    expect(lines[1].content).toBe("");
    expect(lines[1].activity?.toolCalls[0].result).toBe("contents");
  });

  it("pairs tool results positionally when the ids repeat", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "go" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_0", name: "first", parameters: {} }],
      }),
      message({ role: "tool", content: "one", toolCallId: "call_0" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_0", name: "second", parameters: {} }],
      }),
      message({ role: "tool", content: "two", toolCallId: "call_0" }),
      message({ role: "assistant", content: "done" }),
    ]);

    const calls = lines[lines.length - 1].activity?.toolCalls ?? [];
    expect(calls.map((call) => [call.name, call.result])).toEqual([
      ["first", "one"],
      ["second", "two"],
    ]);
  });

  it("pairs tool results with the call they answer", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "go" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "a", name: "first", parameters: {} },
          { id: "b", name: "second", parameters: {} },
        ],
      }),
      message({ role: "tool", content: "two", toolCallId: "b" }),
      message({ role: "tool", content: "one", toolCallId: "a" }),
      message({ role: "assistant", content: "done" }),
    ]);

    const calls = lines[lines.length - 1].activity?.toolCalls ?? [];
    expect(calls.map((call) => [call.name, call.result])).toEqual([
      ["first", "one"],
      ["second", "two"],
    ]);
  });

  it("keeps the agent's synthetic image message inside its turn", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "look at this" }),
      message({
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_0", name: "view_image", parameters: {} }],
      }),
      message({ role: "tool", content: "image bytes", toolCallId: "call_0" }),
      message({ role: "user", content: "[Attached image(s) from view_image tool]" }),
      message({
        role: "assistant",
        content: "it is a cat",
        serverActivity: activity({
          thinking: "a cat",
          tool_calls: [
            {
              id: "call_0",
              name: "view_image",
              parameters: {},
              result: "image bytes",
            },
          ],
        }),
      }),
    ]);

    // The tool calls of the turn belong to the activity the server recorded,
    // so they must not be rebuilt a second time.
    const assistantLines = lines.filter((line) => line.role === "assistant");
    expect(assistantLines).toHaveLength(1);
    expect(assistantLines[0].content).toBe("it is a cat");
    expect(assistantLines[0].activity?.toolCalls).toHaveLength(1);
  });

  it("keeps separate turns apart", () => {
    const lines = buildTranscript([
      message({ role: "user", content: "one" }),
      message({ role: "assistant", content: "first" }),
      message({ role: "user", content: "two" }),
      message({
        role: "assistant",
        content: "second",
        serverActivity: activity({ thinking: "hm" }),
      }),
    ]);

    expect(lines.map((line) => line.content)).toEqual([
      "one",
      "first",
      "two",
      "second",
    ]);
    expect(lines[1].activity).toBeUndefined();
    expect(lines[3].activity?.thinking).toBe("hm");
  });
});

describe("activityToTurnActivity", () => {
  it("maps the recorded tool calls", () => {
    const converted = activityToTurnActivity(
      activity({
        thinking: "hm",
        elapsed: 2,
        tool_calls: [
          {
            id: "call_0",
            name: "bash",
            parameters: { command: "ls" },
            result: "ok",
            elapsed: 0.5,
          },
        ],
      }),
    );

    expect(converted.thinking).toBe("hm");
    expect(converted.elapsed).toBe(2);
    expect(converted.toolCalls[0]).toMatchObject({
      id: "call_0",
      name: "bash",
      parameters: { command: "ls" },
      result: "ok",
      elapsed: 0.5,
    });
  });
});

describe("collectSubAgents", () => {
  it("rebuilds the sub-agent runs of a transcript", () => {
    const runs = collectSubAgents([
      message({
        role: "assistant",
        content: "done",
        serverActivity: activity({
          sub_agents: [
            subAgent({
              tool_calls: [
                { id: "t1", name: "read", parameters: {}, result: "x" },
              ],
              todos: [
                { content: "step", status: "completed", priority: "high" },
              ],
            }),
          ],
        }),
      }),
    ]);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      task_id: "run-1",
      agent_name: "researcher",
      status: "done",
      task: "find X",
    });
    expect(runs[0].messages[0].content).toBe("partial");
    expect(runs[0].toolCalls[0]).toMatchObject({ name: "read", result: "x" });
    expect(runs[0].todos).toHaveLength(1);
  });

  it("returns nothing for a transcript without activity", () => {
    expect(
      collectSubAgents([message({ role: "assistant", content: "hi" })]),
    ).toEqual([]);
  });
});

describe("a session persisted by the server", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the same view the live chat showed", async () => {
    // The exact shape the server writes for a turn that called one tool.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            id: "s1",
            name: "turn",
            messages: [
              { role: "user", content: "use the tool" },
              {
                role: "assistant",
                content: "",
                tool_calls: [
                  {
                    id: "call_0",
                    type: "function",
                    function: {
                      name: "builtin__echo",
                      arguments: '{"x": 1}',
                    },
                  },
                ],
              },
              { role: "tool", content: "echoed-1", tool_call_id: "call_0" },
              {
                role: "assistant",
                content: "done after tool",
                activity: {
                  thinking: "the user wants a file, let me read it",
                  elapsed: 0.001,
                  tool_calls: [
                    {
                      id: "call_0",
                      name: "builtin__echo",
                      parameters: { x: 1 },
                      result: "echoed-1",
                      elapsed: 0.000036,
                    },
                  ],
                  sub_agents: [],
                },
              },
            ],
          }),
      }),
    );

    const session = await getSession("s1");
    const lines = buildTranscript(session.messages);

    expect(lines.map((line) => [line.role, line.content])).toEqual([
      ["user", "use the tool"],
      ["assistant", "done after tool"],
    ]);
    expect(lines[1].activity).toMatchObject({
      thinking: "the user wants a file, let me read it",
      elapsed: 0.001,
    });
    expect(lines[1].activity?.toolCalls).toHaveLength(1);
    expect(lines[1].activity?.toolCalls[0]).toMatchObject({
      id: "call_0",
      name: "builtin__echo",
      parameters: { x: 1 },
      result: "echoed-1",
      elapsed: 0.000036,
    });
  });
});

describe("live and reopened views agree", () => {
  it("shows the same replies and tool calls after a reload", () => {
    // What the live chat streamed: some text, a tool call, then the reply.
    const live: LiveSegment[] = [
      { kind: "thinking", id: "th-1", text: "let me look" },
      { kind: "text", id: "tx-1", text: "let me check", timestamp: 1 },
      {
        kind: "tool",
        id: "tool-1",
        call: {
          id: "tool-1",
          name: "read_file",
          parameters: { path: "a.py" },
          startTime: 1,
        },
      },
      { kind: "text", id: "tx-2", text: "here it is", timestamp: 2 },
    ];
    const withResult = setToolResult(live, "tool-1", "contents", 3);
    const liveTexts = collectText(withResult);
    const liveActivity = collectActivity(withResult, 2);

    // What the server recorded for the same turn.
    const reopened = buildTranscript([
      message({ role: "user", content: "read it" }),
      message({
        role: "assistant",
        content: "let me check",
        toolCalls: [
          { id: "call_0", name: "read_file", parameters: { path: "a.py" } },
        ],
      }),
      message({ role: "tool", content: "contents", toolCallId: "call_0" }),
      message({
        role: "assistant",
        content: "here it is",
        serverActivity: activity({
          thinking: "let me look",
          elapsed: 2,
          tool_calls: [
            {
              id: "call_0",
              name: "read_file",
              parameters: { path: "a.py" },
              result: "contents",
              elapsed: 2,
            },
          ],
        }),
      }),
    ]).filter((line) => line.role === "assistant");

    expect(reopened.map((line) => line.content)).toEqual(liveTexts);
    expect(reopened[reopened.length - 1].activity?.thinking).toBe(
      liveActivity?.thinking,
    );
    expect(
      reopened[reopened.length - 1].activity?.toolCalls.map((call) => [
        call.name,
        call.result,
      ]),
    ).toEqual(
      liveActivity?.toolCalls.map((call) => [call.name, call.result]),
    );
  });
});
