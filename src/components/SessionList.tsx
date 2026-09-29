import { useApp } from "../context/AppContext";
import { Search, Edit3, Trash2 } from "lucide-react";
import { useState } from "react";

function fmt(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionList() {
  const {
    sessions,
    currentSessionId,
    switchSession,
    removeSession,
    renameCurrentSession,
    setView,
  } = useApp();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const filtered = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.includes(search),
  );

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveRename = () => {
    if (editingId && editName.trim()) {
      renameCurrentSession(editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex h-full flex-col bg-oli-bg p-4">
      <h2 className="mb-3 text-sm font-bold text-oli-accent">sessions</h2>

      <div className="relative mb-3">
        <Search
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-oli-muted"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search sessions..."
          className="w-full border border-oli-line bg-oli-surface pl-7 pr-3 py-1.5 text-xs text-oli-fg placeholder:text-oli-muted focus:border-oli-accent focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-oli-muted">
            no sessions found
          </div>
        )}
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`group mb-2 cursor-pointer border border-oli-line px-3 py-2 ${
              s.id === currentSessionId
                ? "border-oli-accent bg-oli-elevated text-oli-accent"
                : "bg-oli-surface text-oli-muted hover:border-oli-accent-dim"
            }`}
            onClick={() => {
              switchSession(s.id);
              setView("chat");
            }}
          >
            <div className="flex items-center justify-between">
              {editingId === s.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="border-b border-oli-accent bg-transparent text-xs text-oli-fg focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-xs font-bold">
                  {s.name || "untitled"}
                </span>
              )}
              <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(s.id, s.name);
                  }}
                  className="text-oli-muted hover:text-oli-accent"
                  title="Rename"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSession(s.id);
                  }}
                  className="text-oli-muted hover:text-oli-danger"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-oli-accent-dim">
              <span>{fmt(new Date(s.createdAt ?? Date.now()).getTime())}</span>
              <span>{s.msgCount ?? 0} messages</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
