import {
  ChatLine,
  ChatMessage,
  ServerActivity,
  SubAgentRun,
  ToolCall,
  ToolCallRequest,
  TurnActivity,
} from "../types";

/**
 * Rebuild the chat view from a persisted transcript.
 *
 * The transcript only records what was *said*: the assistant text, the tool
 * calls the model requested and the results those calls returned. The live UI
 * additionally shows a collapsed "activity" block holding the model's
 * thinking, the tool calls and how long the turn took. That data either
 * comes from the server (attached to the message that closes the turn) or is
 * reconstructed from the tool calls stored in the transcript — the latter
 * being the only option for sessions recorded before the server started
 * persisting activity.
 */

/** Split a transcript into turns — one per user message. */
function splitTurns(messages: ChatMessage[]): ChatMessage[][] {
  const turns: ChatMessage[][] = [];
  let current: ChatMessage[] = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role === "user" && current.length > 0) {
      const previous = messages[i - 1];
      // The agent appends a synthetic user message (an image caption) right
      // after the tool results it produced. It continues the current turn
      // instead of starting a new one.
      if (!previous || previous.role !== "tool") {
        turns.push(current);
        current = [];
      }
    }
    current.push(message);
  }
  if (current.length > 0) turns.push(current);
  return turns;
}

/**
 * Collect the tool calls of an assistant message and the results that
 * answered them.
 *
 * Results pair positionally within the contiguous assistant→tool block;
 * `tool_call_id` is only a tiebreaker because ids such as `call_0` repeat
 * across the rounds of a single turn.
 */
function collectToolBlock(
  turn: ChatMessage[],
  start: number,
): { calls: ToolCall[]; nextIndex: number } {
  const message = turn[start];
  const requests: ToolCallRequest[] = message.toolCalls ?? [];
  const calls: ToolCall[] = requests.map((request, index) => ({
    id: request.id || `${message.id}-tool-${index}`,
    name: request.name,
    parameters: request.parameters ?? {},
    startTime: message.timestamp,
  }));

  const answered = new Set<number>();
  let index = start + 1;
  while (index < turn.length && turn[index].role === "tool") {
    const toolMessage = turn[index];
    let target = -1;
    if (toolMessage.toolCallId) {
      target = calls.findIndex(
        (call, i) => !answered.has(i) && call.id === toolMessage.toolCallId,
      );
    }
    if (target === -1) target = calls.findIndex((_, i) => !answered.has(i));
    if (target !== -1) {
      answered.add(target);
      calls[target].result = toolMessage.content;
    }
    index++;
  }
  return { calls, nextIndex: index };
}

/** Convert the activity recorded by the server into the client's shape. */
export function activityToTurnActivity(activity: ServerActivity): TurnActivity {
  return {
    thinking: activity.thinking ?? "",
    elapsed: activity.elapsed,
    toolCalls: (activity.tool_calls ?? []).map((call, index) => ({
      id: call.id || `srv-tool-${index}`,
      name: call.name,
      parameters: call.parameters ?? {},
      startTime: 0,
      result: call.result,
      elapsed: call.elapsed,
    })),
  };
}

function buildTurn(turn: ChatMessage[]): ChatLine[] {
  const lines: ChatLine[] = [];
  const calls: ToolCall[] = [];
  let serverActivity: ServerActivity | undefined;

  for (let i = 0; i < turn.length; i++) {
    const message = turn[i];
    if (message.role === "user") {
      lines.push({
        id: message.id,
        role: "user",
        content: message.content,
        timestamp: message.timestamp,
      });
      continue;
    }
    if (message.role === "system" || message.role === "tool") {
      if (message.serverActivity) serverActivity = message.serverActivity;
      continue;
    }
    if (message.toolCalls && message.toolCalls.length > 0) {
      const block = collectToolBlock(turn, i);
      calls.push(...block.calls);
      if (message.serverActivity) serverActivity = message.serverActivity;
      if (message.content.trim()) {
        lines.push({
          id: message.id,
          role: "assistant",
          content: message.content,
          timestamp: message.timestamp,
        });
      }
      i = block.nextIndex - 1;
      continue;
    }
    if (message.serverActivity) serverActivity = message.serverActivity;
    if (message.content.trim()) {
      lines.push({
        id: message.id,
        role: "assistant",
        content: message.content,
        timestamp: message.timestamp,
      });
    }
  }

  const activity = serverActivity
    ? activityToTurnActivity(serverActivity)
    : calls.length > 0
      ? { thinking: "", toolCalls: calls, elapsed: undefined }
      : undefined;
  if (!activity) return lines;

  // The live view hangs the activity block above the turn's final reply.
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].role === "assistant") {
      lines[i].activity = activity;
      return lines;
    }
  }
  // A turn that only ran tools has no reply to hang the block on — the live
  // view drops it, but a reopened session keeps it so the calls stay visible.
  lines.push({
    id: `${turn[0]?.id ?? "turn"}-activity`,
    role: "assistant",
    content: "",
    timestamp: turn[turn.length - 1]?.timestamp ?? Date.now(),
    activity,
  });
  return lines;
}

/** Rebuild the chat lines of a persisted transcript. */
export function buildTranscript(messages: ChatMessage[]): ChatLine[] {
  const lines: ChatLine[] = [];
  for (const turn of splitTurns(messages)) lines.push(...buildTurn(turn));
  return lines;
}

/** Rebuild the sub-agent runs recorded in a persisted transcript. */
export function collectSubAgents(messages: ChatMessage[]): SubAgentRun[] {
  const runs: SubAgentRun[] = [];
  for (const message of messages) {
    const activity = message.serverActivity;
    if (!activity) continue;
    for (const run of activity.sub_agents ?? []) {
      runs.push({
        task_id: run.task_id,
        agent_name: run.agent_name,
        pool_name: run.pool_name,
        task: run.task,
        status: run.status,
        activity: run.activity,
        messages: run.text
          ? [
              {
                id: `srv-sub-${run.task_id}`,
                role: "assistant",
                content: run.text,
                timestamp: 0,
                subAgentId: run.task_id,
                agentName: run.agent_name,
              },
            ]
          : [],
        toolCalls: (run.tool_calls ?? []).map((call, index) => ({
          id: call.id || `srv-sub-tool-${run.task_id}-${index}`,
          name: call.name,
          parameters: call.parameters ?? {},
          startTime: 0,
          result: call.result,
          elapsed: call.elapsed,
        })),
        todos: run.todos,
      });
    }
  }
  return runs;
}
