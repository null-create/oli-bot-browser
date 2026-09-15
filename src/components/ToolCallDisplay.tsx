import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function ToolCallDisplay({
  name,
  startedAt,
  result,
}: {
  name: string;
  startedAt: number;
  result?: { result: string; elapsed: number };
}) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [result]);

  const elapsed = result
    ? result.elapsed
    : ((nowMs - startedAt) / 1000).toFixed(1);
  const isError = result
    ? result.result.trim().toLowerCase().startsWith("error")
    : false;

  return (
    <div className="my-1 flex items-center gap-2 border border-terminal-border bg-terminal-surface px-2 py-1 text-xs">
      {result ? (
        isError ? (
          <XCircle size={12} className="text-terminal-error" />
        ) : (
          <CheckCircle2 size={12} className="text-terminal-green" />
        )
      ) : (
        <Loader2 size={12} className="animate-spin text-terminal-green" />
      )}
      <span className="font-bold text-terminal-text">{name}</span>
      <span className="text-terminal-muted">
        {"\u00b7"} {elapsed}s
      </span>
    </div>
  );
}
