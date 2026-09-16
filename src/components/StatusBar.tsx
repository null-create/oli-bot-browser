import { useApp } from "../context/AppContext";

export function StatusBar() {
  const { config, usage, status, workspace } = useApp();

  const mode = config.api_mode || "agent";
  const profile = config.api_profile || "default";
  const model =
    config.backend === "ollama"
      ? config.ollama_model || "ollama"
      : config.openai_model || config.backend;
  const tokens = usage.prompt_tokens + usage.completion_tokens;
  const estimatedPrefix = usage.estimated ? "~" : "";
  const isOffline = config.offline_mode;
  const ws = workspace?.current;

  return (
    <div className="flex h-6 items-center justify-between border-t border-terminal-border-bright bg-terminal-surface px-3 text-[11px] text-terminal-muted">
      <div className="flex gap-2">
        <span>^Q quit</span>
        <span>^L clear</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-terminal-green">[AGENT]</span>
        <span className="text-terminal-green-dim">[{mode.toUpperCase()}]</span>
        {isOffline && <span className="text-terminal-warning">[OFFLINE]</span>}
        {ws && (
          <span
            className={`max-w-[24vw] truncate ${workspace.sensitive ? "text-terminal-warning" : "text-terminal-green-dim"}`}
            title={ws}
          >
            ws: {ws}
          </span>
        )}
        <span className="text-terminal-text">:: {model}</span>
        <span className="text-terminal-muted">:: {profile}</span>
        <span className="ml-2 text-terminal-green-dim">
          {estimatedPrefix}
          {tokens} tok
        </span>
        <span
          className={`ml-1 ${
            status === "connected"
              ? "text-terminal-green"
              : status === "connecting"
                ? "text-terminal-warning"
                : "text-terminal-error"
          }`}
        >
          {status === "connected"
            ? "\u25cf"
            : status === "connecting"
              ? "\u25d1"
              : "\u25cf"}
        </span>
      </div>
    </div>
  );
}
