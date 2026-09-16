import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { FsEntry } from "../types";
import { listDirectory } from "../lib/workspace";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  HardDrive,
  Home,
  RefreshCw,
  X,
  CornerDownLeft,
} from "lucide-react";

const ROOT = "/";

function entryName(path: string): string {
  if (path === ROOT) return "/";
  return path.split("/").filter(Boolean).pop() || path;
}

type TreeNodeProps = {
  entry: FsEntry;
  depth: number;
  currentPath: string | null;
  loadChildren: (path: string) => Promise<FsEntry[]>;
  onError: (msg: string) => void;
  onSelect: (entry: FsEntry) => void;
};

function TreeNode({
  entry,
  depth,
  currentPath,
  loadChildren,
  onError,
  onSelect,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [childrenEntries, setChildrenEntries] = useState<FsEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const isDir = entry.type === "dir";
  const isCurrent = currentPath !== null && entry.path === currentPath;

  const toggle = async () => {
    if (!isDir) return;
    const next = !expanded;
    setExpanded(next);
    if (next && childrenEntries === null) {
      setBusy(true);
      try {
        setChildrenEntries(await loadChildren(entry.path));
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
        setChildrenEntries([]);
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 border-l py-0.5 pr-2 text-xs ${
          isCurrent
            ? "border-terminal-border-bright bg-terminal-panel text-terminal-green"
            : "border-terminal-border text-terminal-text hover:bg-terminal-panel"
        }`}
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        <button
          onClick={toggle}
          disabled={!isDir || busy}
          className="w-3 shrink-0 text-terminal-muted hover:text-terminal-green disabled:cursor-default"
        >
          {busy ? (
            <span className="animate-pulse text-terminal-green">{"\u2026"}</span>
          ) : isDir ? (
            expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <span />
          )}
        </button>
        {isDir ? (
          <Folder
            size={13}
            className={isCurrent ? "text-terminal-green" : "text-terminal-green-dim"}
          />
        ) : (
          <File size={13} className="text-terminal-muted" />
        )}
        <span className="flex-1 truncate">
          {isCurrent ? "\u25b8 " : ""}
          {entry.name}
        </span>
        {isDir && entry.sensitive && (
          <span className="border border-terminal-warning px-1 text-[10px] text-terminal-warning">
            sensitive
          </span>
        )}
        {isDir && (
          <button
            onClick={() => onSelect(entry)}
            className="shrink-0 border border-terminal-border px-1.5 py-0.5 text-[10px] text-terminal-green hover:bg-terminal-panel hover:text-terminal-green-bright"
          >
            use
          </button>
        )}
      </div>
      {isDir && expanded && (
        <div>
          {childrenEntries === null ? null : childrenEntries.length === 0 ? (
            <div
              className="border-l border-terminal-border py-0.5 text-[11px] text-terminal-muted"
              style={{ paddingLeft: (depth + 1) * 14 + 6 }}
            >
              (empty)
            </div>
          ) : (
            childrenEntries.map((c) => (
              <TreeNode
                key={c.path}
                entry={c}
                depth={depth + 1}
                currentPath={currentPath}
                loadChildren={loadChildren}
                onError={onError}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function WorkspacePage() {
  const {
    workspace,
    fetchWorkspace,
    setWorkspace,
    unsetWorkspace,
  } = useApp();
  const [rootEntry, setRootEntry] = useState<FsEntry | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [confirming, setConfirming] = useState<FsEntry | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [error, setError] = useState("");
  const [pendingPath, setPendingPath] = useState("");
  const cacheRef = useRef(new Map<string, FsEntry[]>());

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (!workspace) return;
    const cur = workspace.current;
    setRootEntry(
      cur
        ? { name: entryName(cur), path: cur, type: "dir", sensitive: workspace.sensitive }
        : { name: "/", path: ROOT, type: "dir", sensitive: true },
    );
    setResetKey((k) => k + 1);
  }, [workspace]);

  const loadChildren = useCallback(async (path: string): Promise<FsEntry[]> => {
    const cached = cacheRef.current.get(path);
    if (cached) return cached;
    const listing = await listDirectory(path);
    cacheRef.current.set(listing.path, listing.entries);
    return listing.entries;
  }, []);

  const goTo = useCallback((path: string) => {
    setPendingPath(path);
    setError("");
    listDirectory(path)
      .then((listing) => {
        setRootEntry({
          name: entryName(listing.path),
          path: listing.path,
          type: "dir",
          sensitive: listing.sensitive,
        });
        setResetKey((k) => k + 1);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setPendingPath(""));
  }, []);

  const doSet = useCallback(
    async (entry: FsEntry) => {
      setError("");
      const ok = await setWorkspace(entry.path);
      if (!ok) setError(`failed to set workspace: ${entry.path}`);
    },
    [setWorkspace],
  );

  const handleSelect = useCallback(
    (entry: FsEntry) => {
      if (entry.sensitive) setConfirming(entry);
      else void doSet(entry);
    },
    [doSet],
  );

  const handleClear = useCallback(async () => {
    setError("");
    await unsetWorkspace();
  }, [unsetWorkspace]);

  const current = workspace?.current ?? null;
  const working =
    pendingPath !== "" ||
    (workspace === null && rootEntry === null);

  return (
    <div className="flex h-full flex-col bg-terminal-bg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-terminal-green">workspaces</h2>
        <button
          onClick={() => goTo(current ?? ROOT)}
          className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-xs text-terminal-green hover:bg-terminal-panel"
        >
          <RefreshCw size={12} /> refresh
        </button>
      </div>

      <div className="mb-2 border border-terminal-border bg-terminal-surface px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-terminal-muted">current</span>
          <span className="flex-1 truncate font-bold text-terminal-green">
            {current ?? "(none)"}
          </span>
          {current && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 border border-terminal-border px-1.5 py-0.5 text-[10px] text-terminal-muted hover:text-terminal-error"
            >
              <X size={10} /> clear
            </button>
          )}
        </div>
        {workspace?.sensitive && current && (
          <div className="mt-1 text-[10px] text-terminal-warning">
            [sensitive] this workspace grants read access to sensitive paths
          </div>
        )}
      </div>

      {workspace && workspace.workspaces.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <span className="text-xs text-terminal-muted">recent:</span>
          {workspace.workspaces.map((w) => (
            <button
              key={w}
              onClick={() => goTo(w)}
              title={w}
              className={`max-w-56 truncate border px-1.5 py-0.5 text-[10px] ${
                w === current
                  ? "border-terminal-green-bright text-terminal-green-bright"
                  : "border-terminal-border text-terminal-muted hover:text-terminal-text"
              }`}
            >
              {entryName(w)}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center gap-1">
        <button
          onClick={() => goTo(ROOT)}
          className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-xs text-terminal-muted hover:bg-terminal-panel hover:text-terminal-text"
          title="Root (/)"
        >
          <HardDrive size={12} />
        </button>
        <button
          onClick={() => goTo("~")}
          className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-xs text-terminal-muted hover:bg-terminal-panel hover:text-terminal-text"
          title="Home"
        >
          <Home size={12} />
        </button>
        <input
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              goTo(pathInput.trim() || ROOT);
            }
          }}
          placeholder="path (e.g. /workspace/project)"
          className="flex-1 border border-terminal-border bg-terminal-surface px-2 py-1 font-mono text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
        />
        <button
          onClick={() => goTo(pathInput.trim() || ROOT)}
          disabled={pendingPath !== ""}
          className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-xs text-terminal-green hover:bg-terminal-panel disabled:text-terminal-muted"
        >
          <CornerDownLeft size={12} /> go
        </button>
      </div>

      {error && (
        <div className="mb-3 border border-terminal-error bg-terminal-error-bg px-3 py-1.5 text-xs text-terminal-error">
          {"\u2717"} {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto border border-terminal-border bg-terminal-surface">
        {working ? (
          <div className="flex h-full items-center justify-center text-sm text-terminal-muted">
            {pendingPath
              ? `loading ${pendingPath} ...`
              : "loading workspace ..."}
          </div>
        ) : rootEntry ? (
          <TreeNode
            key={`${resetKey}-${rootEntry.path}`}
            entry={rootEntry}
            depth={0}
            currentPath={current}
            loadChildren={loadChildren}
            onError={setError}
            onSelect={handleSelect}
          />
        ) : null}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-terminal-bg/90">
          <div className="w-96 border border-terminal-warning bg-terminal-surface p-4">
            <h3 className="mb-2 text-sm font-bold text-terminal-warning">
              sensitive path
            </h3>
            <p className="mb-1 text-xs text-terminal-text">
              Setting the workspace to a sensitive path:
            </p>
            <p className="mb-3 truncate font-mono text-xs text-terminal-warning">
              {confirming.path}
            </p>
            <p className="mb-3 text-[11px] text-terminal-muted">
              This grants the agent read access within this directory. Continue?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConfirming(null);
                  void doSet(confirming);
                }}
                className="flex-1 border border-terminal-warning px-2 py-1 text-xs text-terminal-warning hover:bg-terminal-panel"
              >
                confirm
              </button>
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 border border-terminal-border px-2 py-1 text-xs text-terminal-muted hover:text-terminal-text"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}