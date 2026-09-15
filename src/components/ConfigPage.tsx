import { useState, useCallback, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { OliConfig } from "../types";
import { Save, RotateCcw } from "lucide-react";

type Field = {
  key: keyof OliConfig;
  label: string;
  type?: "text" | "number" | "toggle";
  group: string;
};

const FIELDS: Field[] = [
  { key: "backend", label: "backend", group: "Backend" },
  { key: "openai_api_key", label: "openai api key", group: "OpenAI" },
  { key: "openai_base_url", label: "openai base url", group: "OpenAI" },
  { key: "openai_model", label: "openai model", group: "OpenAI" },
  { key: "openai_small_model", label: "openai small model", group: "OpenAI" },
  { key: "ollama_base_url", label: "ollama base url", group: "Ollama" },
  { key: "ollama_model", label: "ollama model", group: "Ollama" },
  { key: "ollama_small_model", label: "ollama small model", group: "Ollama" },
  {
    key: "max_tokens",
    label: "max tokens",
    type: "number",
    group: "Generation",
  },
  {
    key: "temperature",
    label: "temperature",
    type: "number",
    group: "Generation",
  },
  {
    key: "max_tool_iterations",
    label: "max tool iterations",
    type: "number",
    group: "Agent",
  },
  {
    key: "offline_mode",
    label: "offline mode",
    type: "toggle",
    group: "Agent",
  },
  { key: "dry_run", label: "dry run", type: "toggle", group: "Agent" },
  {
    key: "use_agent_pool",
    label: "use agent pool",
    type: "toggle",
    group: "Agent",
  },
  { key: "log_level", label: "log level", group: "System" },
];

function groupFields(fields: Field[]): Map<string, Field[]> {
  const groups = new Map<string, Field[]>();
  for (const f of fields) {
    const list = groups.get(f.group) || [];
    list.push(f);
    groups.set(f.group, list);
  }
  return groups;
}

export function ConfigPage() {
  const { config, fetchConfig, saveConfig } = useApp();
  const [draft, setDraft] = useState<OliConfig>({ ...config });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    setDraft({ ...config });
  }, [config]);

  const handleChange = useCallback(
    (key: keyof OliConfig, raw: string | boolean) => {
      setSaved(false);
      setSaveError(false);
      setDraft((d) => {
        const next = { ...d };
        const field = FIELDS.find((f) => f.key === key);
        if (field?.type === "number") {
          (next as any)[key] = Number(raw) || 0;
        } else if (field?.type === "toggle") {
          (next as any)[key] = Boolean(raw);
        } else {
          (next as any)[key] = String(raw);
        }
        return next;
      });
    },
    [],
  );

  const save = async () => {
    const ok = await saveConfig(draft);
    if (ok) {
      setSaved(true);
      setSaveError(false);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError(true);
      setSaved(false);
    }
  };

  const reset = () => setDraft({ ...config });

  const groups = groupFields(FIELDS);

  return (
    <div className="flex h-full flex-col bg-terminal-bg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-terminal-green">config</h2>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1 border border-terminal-border px-2 py-1 text-xs text-terminal-muted hover:text-terminal-text"
          >
            <RotateCcw size={12} /> reset
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1 border border-terminal-green bg-terminal-panel px-2 py-1 text-xs text-terminal-green hover:bg-terminal-panel-selected"
          >
            <Save size={12} />{" "}
            {saveError ? "save failed" : saved ? "saved!" : "save"}
          </button>
        </div>
      </div>

      <div className="mb-3 border border-terminal-border bg-terminal-surface px-3 py-2 text-xs text-terminal-muted">
        changes are saved to the server and require a restart to take effect.
      </div>

      <div className="flex-1 overflow-y-auto">
        {[...groups.entries()].map(([group, fields]) => (
          <div key={group} className="mb-6">
            <h3 className="mb-2 border-b border-terminal-border-bright pb-1 text-xs font-bold text-terminal-green-dim">
              {group}
            </h3>
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <label className="w-40 shrink-0 text-xs text-terminal-muted">
                    {field.label}
                  </label>
                  {field.type === "toggle" ? (
                    <button
                      onClick={() => handleChange(field.key, !draft[field.key])}
                      className={`px-3 py-1 text-xs font-bold border ${
                        draft[field.key]
                          ? "border-terminal-green bg-terminal-panel text-terminal-green"
                          : "border-terminal-border bg-terminal-surface text-terminal-muted"
                      }`}
                    >
                      {draft[field.key] ? "ON" : "OFF"}
                    </button>
                  ) : field.key === "openai_api_key" ? (
                    <input
                      type="password"
                      value={String(draft[field.key])}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="flex-1 border border-terminal-border bg-terminal-surface px-2 py-1 text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
                    />
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={String(draft[field.key])}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="flex-1 border border-terminal-border bg-terminal-surface px-2 py-1 text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
