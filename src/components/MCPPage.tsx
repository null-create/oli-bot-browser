import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { MCPServerConfig } from "../types";
import { Plus, Pencil, Trash2, Save, X, Cable } from "lucide-react";

type Draft = {
  name: string;
  transport: "stdio" | "http";
  command: string;
  args: string;
  env: string;
  url: string;
};

function toDraft(cfg?: MCPServerConfig): Draft {
  if (!cfg)
    return {
      name: "",
      transport: "stdio",
      command: "",
      args: "",
      env: "",
      url: "",
    };
  return {
    name: cfg.name,
    transport: cfg.transport,
    command: cfg.command ?? "",
    args: (cfg.args ?? []).join(" "),
    env: Object.entries(cfg.env ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join(" "),
    url: cfg.url ?? "",
  };
}

function parseArgs(args: string): string[] {
  return args.trim() ? args.trim().split(/\s+/) : [];
}

function parseEnv(env: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of env.trim().split(/\s+/)) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq > 0) out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}

export function MCPPage() {
  const {
    mcpServers,
    fetchMcpServers,
    addMcpServer,
    updateMcpServer,
    removeMcpServer,
  } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  const startAdd = () => {
    setDraft(toDraft());
    setError("");
    setSaved(false);
    setEditing(null);
    setAdding(true);
  };

  const startEdit = (cfg: MCPServerConfig) => {
    setDraft(toDraft(cfg));
    setError("");
    setSaved(false);
    setAdding(false);
    setEditing(cfg.name);
  };

  const cancel = () => {
    setAdding(false);
    setEditing(null);
    setError("");
  };

  const submit = async () => {
    const name = draft.name.trim();
    if (!name) {
      setError("server name is required");
      return;
    }
    if (draft.transport === "http" && !draft.url.trim()) {
      setError("url is required for http transport");
      return;
    }
    if (draft.transport === "stdio" && !draft.command.trim()) {
      setError("command is required for stdio transport");
      return;
    }
    const cfg: MCPServerConfig = {
      name,
      transport: draft.transport,
      command: draft.command.trim(),
      args: parseArgs(draft.args),
      env:
        Object.keys(parseEnv(draft.env)).length > 0
          ? parseEnv(draft.env)
          : null,
      url: draft.url.trim(),
    };
    const ok = editing
      ? await updateMcpServer(editing, cfg)
      : await addMcpServer(cfg);
    if (!ok) {
      setError(editing ? "failed to update server" : "failed to add server");
      return;
    }
    setSaved(true);
    setError("");
    setAdding(false);
    setEditing(null);
  };

  const remove = async (name: string) => {
    if (!window.confirm(`remove MCP server '${name}'?`)) return;
    await removeMcpServer(name);
  };

  return (
    <div className="flex h-full flex-col bg-terminal-bg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-terminal-green">mcp servers</h2>
        <button
          onClick={startAdd}
          className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-xs text-terminal-green hover:bg-terminal-panel"
        >
          <Plus size={12} /> add server
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 border border-terminal-border bg-terminal-surface px-3 py-2 text-xs text-terminal-muted">
        <Cable size={12} />
        <span>
          {mcpServers.length} configured · changes persist to
          ~/.config/oli/mcp_servers.json
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1 overflow-y-auto">
          {mcpServers.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-terminal-muted">
              no mcp servers configured
            </div>
          ) : (
            mcpServers.map((cfg) => (
              <div
                key={cfg.name}
                className="mb-2 border border-terminal-border bg-terminal-surface px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-terminal-text">
                    {cfg.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                      cfg.transport === "http"
                        ? "border-terminal-warning text-terminal-warning"
                        : "border-terminal-green text-terminal-green"
                    }`}
                  >
                    {cfg.transport}
                  </span>
                  <span className="ml-auto flex gap-2">
                    <button
                      onClick={() => startEdit(cfg)}
                      className="text-terminal-muted hover:text-terminal-text"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => remove(cfg.name)}
                      className="text-terminal-muted hover:text-terminal-error"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-terminal-muted">
                  {cfg.transport === "http"
                    ? cfg.url
                    : `${cfg.command} ${cfg.args.join(" ")}`.trim()}
                </div>
                {cfg.env && Object.keys(cfg.env).length > 0 && (
                  <div className="mt-1 text-[11px] text-terminal-green-dim">
                    env: {Object.keys(cfg.env).join(", ")}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {(adding || editing !== null) && (
          <div className="w-80 shrink-0 border border-terminal-border bg-terminal-surface p-3">
            <h3 className="mb-3 text-xs font-bold text-terminal-green">
              {editing ? `edit: ${editing}` : "add server"}
            </h3>

            <label className="mb-1 block text-xs text-terminal-muted">
              name
            </label>
            <input
              value={draft.name}
              disabled={editing !== null}
              onChange={(e) => {
                setSaved(false);
                setDraft({ ...draft, name: e.target.value });
              }}
              className="mb-3 w-full border border-terminal-border bg-terminal-bg px-2 py-1 text-xs text-terminal-text focus:border-terminal-green focus:outline-none disabled:text-terminal-muted"
              placeholder="e.g. filesystem"
            />

            <label className="mb-1 block text-xs text-terminal-muted">
              transport
            </label>
            <div className="mb-3 flex gap-1">
              {(["stdio", "http"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setSaved(false);
                    setDraft({ ...draft, transport: t });
                  }}
                  className={`px-3 py-1 text-xs font-bold border ${
                    draft.transport === t
                      ? "border-terminal-green bg-terminal-panel text-terminal-green"
                      : "border-terminal-border bg-terminal-bg text-terminal-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {draft.transport === "http" ? (
              <>
                <label className="mb-1 block text-xs text-terminal-muted">
                  url
                </label>
                <input
                  value={draft.url}
                  onChange={(e) => {
                    setSaved(false);
                    setDraft({ ...draft, url: e.target.value });
                  }}
                  className="mb-3 w-full border border-terminal-border bg-terminal-bg px-2 py-1 text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
                  placeholder="http://localhost:3000/mcp"
                />
              </>
            ) : (
              <>
                <label className="mb-1 block text-xs text-terminal-muted">
                  command
                </label>
                <input
                  value={draft.command}
                  onChange={(e) => {
                    setSaved(false);
                    setDraft({ ...draft, command: e.target.value });
                  }}
                  className="mb-3 w-full border border-terminal-border bg-terminal-bg px-2 py-1 text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
                  placeholder="e.g. npx"
                />

                <label className="mb-1 block text-xs text-terminal-muted">
                  arguments (space separated)
                </label>
                <input
                  value={draft.args}
                  onChange={(e) => {
                    setSaved(false);
                    setDraft({ ...draft, args: e.target.value });
                  }}
                  className="mb-3 w-full border border-terminal-border bg-terminal-bg px-2 py-1 text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
                  placeholder="-y mcp-server-filesystem /tmp"
                />

                <label className="mb-1 block text-xs text-terminal-muted">
                  env vars (KEY=VALUE …)
                </label>
                <textarea
                  value={draft.env}
                  onChange={(e) => {
                    setSaved(false);
                    setDraft({ ...draft, env: e.target.value });
                  }}
                  rows={3}
                  className="mb-3 w-full resize-y border border-terminal-border bg-terminal-bg px-2 py-1 font-mono text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
                  placeholder="API_KEY=xxx"
                />
              </>
            )}

            {error && (
              <div className="mb-3 text-xs text-terminal-error">{`\u2717 ${error}`}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={submit}
                className="flex flex-1 items-center justify-center gap-1 border border-terminal-green bg-terminal-panel px-2 py-1 text-xs text-terminal-green hover:bg-terminal-panel-selected"
              >
                <Save size={12} /> {saved ? "saved!" : editing ? "save" : "add"}
              </button>
              <button
                onClick={cancel}
                className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-xs text-terminal-muted hover:text-terminal-text"
              >
                <X size={12} /> cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
