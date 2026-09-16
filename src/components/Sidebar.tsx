import { useApp } from "../context/AppContext";
import {
  MessageSquare,
  Settings,
  ListTodo,
  Network,
  Plug,
  Plus,
} from "lucide-react";
import { OliView } from "../types";

const NAV: { view: OliView; label: string; icon: typeof MessageSquare }[] = [
  { view: "chat", label: "chat", icon: MessageSquare },
  { view: "sessions", label: "sessions", icon: ListTodo },
  { view: "todos", label: "todos", icon: ListTodo },
  { view: "subagents", label: "sub-agents", icon: Network },
  { view: "mcp", label: "mcp", icon: Plug },
  { view: "config", label: "config", icon: Settings },
];

export function Sidebar() {
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
    <div className="flex h-full w-64 flex-col border-r border-terminal-border bg-terminal-surface">
      <div className="flex h-8 items-center justify-between border-b border-terminal-border px-2 text-xs text-terminal-muted">
        <span className="font-bold text-terminal-green">sessions</span>
        <button
          onClick={newSession}
          className="flex items-center gap-1 text-terminal-green hover:text-terminal-green-bright"
          title="New session"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <div className="p-2 text-xs text-terminal-muted">no sessions</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`group flex cursor-pointer items-center justify-between border-b border-terminal-border px-2 py-1.5 text-xs ${
              s.id === currentSessionId
                ? "bg-terminal-panel text-terminal-green"
                : "text-terminal-muted hover:bg-terminal-panel hover:text-terminal-text"
            }`}
            onClick={() => {
              if (s.id !== currentSessionId) switchSession(s.id);
              setView("chat");
            }}
          >
            <span className="truncate flex-1">
              {s.id === currentSessionId ? "\u25b8 " : "  "}
              {s.name || "untitled"}
            </span>
            <span className="text-[10px] text-terminal-green-dim">
              {s.msgCount ?? 0} msg
            </span>
            <button
              className="ml-1 hidden text-terminal-error group-hover:block"
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

      <nav className="border-t border-terminal-border">
        {NAV.map(({ view: v, label, icon: Icon }) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex w-full items-center gap-2 border-b border-terminal-border px-3 py-2 text-xs ${
              view === v
                ? "bg-terminal-panel text-terminal-green"
                : "text-terminal-muted hover:bg-terminal-panel hover:text-terminal-text"
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
