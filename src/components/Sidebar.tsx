import { useApp } from "../context/AppContext";
import {
  MessageSquare,
  Settings,
  ListTodo,
  Network,
  Plug,
  FolderOpen,
  Plus,
} from "lucide-react";
import { OliView } from "../types";

const NAV: { view: OliView; label: string; icon: typeof MessageSquare }[] = [
  { view: "chat", label: "chat", icon: MessageSquare },
  { view: "sessions", label: "sessions", icon: ListTodo },
  { view: "workspace", label: "workspaces", icon: FolderOpen },
  { view: "todos", label: "todos", icon: ListTodo },
  { view: "subagents", label: "sub-agents", icon: Network },
  { view: "mcp", label: "mcp", icon: Plug },
  { view: "config", label: "config", icon: Settings },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const {
    view,
    setView,
    sessions,
    currentSessionId,
    newSession,
    switchSession,
    removeSession,
  } = useApp();

  return (
    <div className="flex h-full w-64 flex-col border-r border-oli-line bg-oli-surface">
      <div className="flex h-8 items-center justify-between border-b border-oli-line px-2 text-xs text-oli-muted">
        <span className="font-bold text-oli-accent">sessions</span>
        <button
          onClick={() => {
            newSession();
            onNavigate?.();
          }}
          className="flex items-center gap-1 text-oli-accent hover:text-oli-accent-bright"
          title="New session"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <div className="p-2 text-xs text-oli-muted">no sessions</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group flex cursor-pointer items-center justify-between border-b border-oli-line px-2 py-1.5 text-xs ${
              s.id === currentSessionId
                ? "bg-oli-elevated text-oli-accent"
                : "text-oli-muted hover:bg-oli-elevated hover:text-oli-fg"
            }`}
            onClick={() => {
              if (s.id !== currentSessionId) switchSession(s.id);
              setView("chat");
              onNavigate?.();
            }}
          >
            <span className="truncate flex-1">
              {s.id === currentSessionId ? "\u25b8 " : "  "}
              {s.name || "untitled"}
            </span>
            <span className="text-[10px] text-oli-accent-dim">
              {s.msgCount ?? 0} msg
            </span>
            <button
              className="ml-1 text-oli-danger sm:hidden sm:group-hover:block"
              title="Delete session"
              onClick={(e) => {
                e.stopPropagation();
                removeSession(s.id);
              }}
            >
              {"\u2715"}
            </button>
          </div>
        ))}
      </div>

      <nav className="border-t border-oli-line">
        {NAV.map(({ view: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              onNavigate?.();
            }}
            className={`flex w-full items-center gap-2 border-b border-oli-line px-3 py-2 text-xs ${
              view === v
                ? "bg-oli-elevated text-oli-accent"
                : "text-oli-muted hover:bg-oli-elevated hover:text-oli-fg"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
