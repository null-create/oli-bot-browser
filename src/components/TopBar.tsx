import { useApp } from "../context/AppContext";
import {
  Command,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Terminal,
} from "lucide-react";
import { ThemeMenu } from "./ThemeMenu";

export function TopBar({
  onMenu,
  onToggleSidebar,
  sidebarCollapsed,
}: {
  onMenu?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}) {
  const { config } = useApp();

  return (
    <div className="flex h-8 items-center justify-between border-b border-oli-line-strong bg-oli-surface px-3 text-xs text-oli-accent">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <button
          onClick={onMenu}
          className="-m-1.5 p-1.5 text-oli-accent md:hidden"
          title="Menu"
        >
          <Menu size={16} />
        </button>
        <button
          onClick={onToggleSidebar}
          className="-m-1.5 hidden p-1.5 text-oli-accent hover:text-oli-accent-bright md:flex"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
        <Terminal size={14} />
        <span className="font-bold">oli</span>
        <span className="text-oli-muted">.</span>
        <span className="text-oli-accent-bright">{config.backend}</span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <div className="hidden min-w-0 items-center gap-2 text-oli-muted sm:flex">
          <Command size={12} />
          <span className="truncate max-w-[40vw]">
            {config.ollama_base_url}
          </span>
        </div>
        <ThemeMenu />
      </div>
    </div>
  );
}
