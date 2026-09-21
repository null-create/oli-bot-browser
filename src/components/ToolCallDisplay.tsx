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
    <div className="my-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 border border-terminal-border bg-terminal-surface px-2 py-1 text-xs">
      {call.result !== undefined ? (
        isError ? (
          <XCircle size={12} className="shrink-0 text-terminal-error" />
        ) : (
          <CheckCircle2 size={12} className="shrink-0 text-terminal-green" />
        )
      ) : (
        <Loader2 size={12} className="shrink-0 animate-spin text-terminal-green" />
      )}
      <span className="shrink-0 font-bold text-terminal-text">{call.name}</span>
      {params && (
        <span className="min-w-0 flex-1 truncate text-terminal-muted">
          {"\u00b7"} {params}
        </span>
      )}
      <span className="shrink-0 text-terminal-green-dim">
        {"\u00b7"} {elapsed.toFixed(1)}s
      </span>
      {call.result !== undefined && isError && (
        <span className="min-w-0 w-full basis-full truncate font-semibold text-terminal-error">
          {call.result}
        </span>
      )}
    </div>
  );
}