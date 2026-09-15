import { useApp } from "../context/AppContext";
import { Command, Terminal } from "lucide-react";

export function TopBar() {
  const { config } = useApp();

  return (
    <div className="flex h-8 items-center justify-between border-b border-terminal-border-bright bg-terminal-surface px-3 text-xs text-terminal-green">
      <div className="flex items-center gap-1.5">
        <Terminal size={14} />
        <span className="font-bold">oli</span>
        <span className="text-terminal-muted">.</span>
        <span className="text-terminal-green-bright">{config.backend}</span>
      </div>
      <div className="flex items-center gap-2 text-terminal-muted">
        <Command size={12} />
        <span className="truncate max-w-[40vw]">
          {config.ollama_base_url}
        </span>
      </div>
    </div>
  );
}