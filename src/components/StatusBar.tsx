import { useApp } from "../context/AppContext";
import { ProfileMenu } from "./ProfileMenu";

export function StatusBar() {
  const { config, usage, status, workspace } = useApp();

  const mode = config.api_mode || "agent";
  const model =
    config.backend === "ollama"
      ? config.ollama_model || "ollama"
      : config.openai_model || config.backend;
  const tokens = usage.prompt_tokens + usage.completion_tokens;
  const estimatedPrefix = usage.estimated ? "~" : "";
  const isOffline = config.offline_mode;
  const ws = workspace?.current;

  return (
    <div className="flex h-6 items-center justify-between border-t border-oli-line-strong bg-oli-surface px-3 text-[11px] text-oli-muted">
      <div className="hidden gap-2 md:flex">
        <span>^Q quit</span>
        <span>^L clear</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-oli-accent">[AGENT]</span>
        <span className="text-oli-accent-dim">[{mode.toUpperCase()}]</span>
        {isOffline && <span className="text-oli-warn">[OFFLINE]</span>}
        {ws && (
          <span
            className={`hidden truncate sm:inline ${workspace.sensitive ? "text-oli-warn" : "text-oli-accent-dim"}`}
            title={ws}
          >
            ws: {ws}
          </span>
        )}
        <span className="hidden text-oli-fg md:inline">:: {model}</span>
        <ProfileMenu />
        <span className="ml-2 text-oli-accent-dim">
          {estimatedPrefix}
          {tokens} tok
        </span>
        <span
          className={`ml-1 ${
            status === "connected"
              ? "text-oli-accent"
              : status === "connecting"
                ? "text-oli-warn"
                : "text-oli-danger"
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
