import { useApp } from "../context/AppContext";
import { Command, Menu, Terminal } from "lucide-react";

export function TopBar({ onMenu }: { onMenu?: () => void }) {
  const { config } = useApp();

  return (
    <div className="flex h-8 items-center justify-between border-b border-terminal-border-bright bg-terminal-surface px-3 text-xs text-terminal-green">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <button
          onClick={onMenu}
          className="text-terminal-green md:hidden"
          title="Menu"
        >
          <Menu size={14} />
        </button>
        <Terminal size={14} />
        <span className="font-bold">oli</span>
        <span className="text-terminal-muted">.</span>
        <span className="text-terminal-green-bright">{config.backend}</span>
      </div>
      <div className="hidden items-center gap-2 text-terminal-muted sm:flex">
        <Command size={12} />
        <span className="truncate max-w-[40vw]">{config.ollama_base_url}</span>
      </div>
    </div>
  );
}
