import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ToolCall } from "../types";
import { formatToolParams, isToolError } from "../lib/format";

export function ToolCallDisplay({ call }: { call: ToolCall }) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (call.result !== undefined) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [call.result]);

  const elapsed =
    call.result !== undefined && call.elapsed !== undefined
      ? call.elapsed
      : (nowMs - call.startTime) / 1000;
  const isError =
    call.result !== undefined && isToolError(call.result);
  const params = formatToolParams(call.parameters);

  return (
    <div className="my-1 flex items-center gap-2 border border-terminal-border bg-terminal-surface px-2 py-1 text-xs">
      {call.result !== undefined ? (
        isError ? (
          <XCircle size={12} className="text-terminal-error" />
        ) : (
          <CheckCircle2 size={12} className="text-terminal-green" />
        )
      ) : (
        <Loader2 size={12} className="animate-spin text-terminal-green" />
      )}
      <span className="font-bold text-terminal-text">{call.name}</span>
      {params && (
        <span className="text-terminal-muted">{"\u00b7"} {params}</span>
      )}
      <span className="text-terminal-green-dim">
        {"\u00b7"} {elapsed.toFixed(1)}s
      </span>
      {call.result !== undefined && isError && (
        <span className="min-w-0 flex-1 truncate font-semibold text-terminal-error">
          {call.result}
        </span>
      )}
    </div>
  );
}