import { useApp } from "../context/AppContext";
import { TodoItem } from "../types";
import {
  Circle,
  CircleDot,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from "lucide-react";

function StatusIcon({ status }: { status: TodoItem["status"] }) {
  switch (status) {
    case "pending":
      return <Circle size={12} className="text-terminal-muted" />;
    case "in_progress":
      return <CircleDot size={12} className="text-terminal-green animate-pulse-green" />;
    case "completed":
      return <CheckCircle2 size={12} className="text-terminal-green" />;
    case "cancelled":
      return <XCircle size={12} className="text-terminal-error" />;
  }
}

function PriorityIcon({ priority }: { priority: TodoItem["priority"] }) {
  switch (priority) {
    case "high":
      return <ArrowUp size={12} className="text-terminal-error" />;
    case "medium":
      return <ArrowRight size={12} className="text-terminal-warning" />;
    case "low":
      return <ArrowDown size={12} className="text-terminal-muted" />;
  }
}

function StatusColor(status: TodoItem["status"]): string {
  switch (status) {
    case "completed":
      return "text-terminal-green-dim line-through";
    case "cancelled":
      return "text-terminal-muted line-through";
    case "in_progress":
      return "text-terminal-green-bright";
    default:
      return "text-terminal-text";
  }
}

export function TodoPanel() {
  const { todos } = useApp();

  if (todos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-terminal-bg text-sm text-terminal-muted">
        no to-do items
      </div>
    );
  }

  const sorted = [...todos].sort((a, b) => {
    const order: Record<string, number> = {
      in_progress: 0,
      pending: 1,
      completed: 2,
      cancelled: 3,
    };
    const prio: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const oa = order[a.status] ?? 1;
    const ob = order[b.status] ?? 1;
    if (oa !== ob) return oa - ob;
    return (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1);
  });

  return (
    <div className="flex h-full flex-col bg-terminal-bg p-4">
      <h2 className="mb-3 text-sm font-bold text-terminal-green">todos</h2>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-2 border-b border-terminal-border px-1 py-2"
          >
            <StatusIcon status={t.status} />
            <PriorityIcon priority={t.priority} />
            <span className={`text-xs ${StatusColor(t.status)}`}>
              {t.content}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 border-t border-terminal-border pt-2 text-[11px] text-terminal-muted">
        <span>
          {todos.filter((t) => t.status === "in_progress").length} in progress
        </span>
        <span>{todos.filter((t) => t.status === "pending").length} pending</span>
        <span>
          {todos.filter((t) => t.status === "completed").length} completed
        </span>
        <span>
          {todos.filter((t) => t.status === "cancelled").length} cancelled
        </span>
      </div>
    </div>
  );
}