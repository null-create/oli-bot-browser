import { useEffect, useState } from "react";
import { AgentPoolConfig } from "../types";
import { listAgents } from "../lib/agents";
import { Key, Layers, Server, User, Cpu } from "lucide-react";

export function AgentPoolConfigView() {
  const [config, setConfig] = useState<AgentPoolConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    listAgents()
      .then((data) => {
        if (!mounted) return;
        setConfig(data);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-oli-bg text-sm text-oli-muted">
        loading agent config...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-oli-bg text-sm text-oli-danger">
        failed to load agent config: {error}
      </div>
    );
  }

  if (!config || !config.enabled || config.pools.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-oli-bg text-sm text-oli-muted">
        <div>agent pooling is disabled or no sub-agents configured</div>
        {config?.source && (
          <div className="text-xs text-oli-accent-dim">source: {config.source}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-oli-bg p-4">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-oli-accent">agent pool config</h2>
        {config.source && (
          <div className="mt-1 truncate text-xs text-oli-accent-dim">
            source: {config.source}
          </div>
        )}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {config.pools.map((pool) => (
          <div key={pool.name} className="border border-oli-line bg-oli-surface">
            <div className="border-b border-oli-line px-3 py-2 text-xs font-bold text-oli-fg">
              <Layers size={12} className="mr-1 inline" />
              pool: {pool.name}
            </div>
            <div className="flex flex-col">
              {pool.agents.map((agent, idx) => (
                <div
                  key={agent.name + idx}
                  className="border-b border-oli-line px-3 py-2 text-xs last:border-b-0"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Cpu size={12} className="text-oli-accent" />
                    <span className="font-bold text-oli-fg">{agent.name}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-oli-muted sm:grid-cols-2">
                    <div className="flex items-center gap-1">
                      <Server size={12} />
                      <span className="text-oli-accent-dim">backend:</span>
                      <span className="text-oli-fg">{agent.backend.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      <span className="text-oli-accent-dim">profile:</span>
                      <span className="text-oli-fg">{agent.profile}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:col-span-2">
                      <span className="text-oli-accent-dim">model:</span>
                      <span className="truncate text-oli-fg" title={agent.backend.model || ""}>
                        {agent.backend.model || "—"}
                      </span>
                    </div>
                    {agent.backend.base_url && (
                      <div className="flex items-center gap-1 sm:col-span-2">
                        <span className="text-oli-accent-dim">base_url:</span>
                        <span
                          className="truncate text-oli-fg"
                          title={agent.backend.base_url}
                        >
                          {agent.backend.base_url}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Key size={12} />
                      <span className="text-oli-accent-dim">api_key:</span>
                      <span className="text-oli-fg">{agent.backend.api_key}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
