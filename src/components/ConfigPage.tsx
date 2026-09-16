import { useState, useCallback, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { OliConfig } from "../types";
import { Save, RotateCcw } from "lucide-react";

type Field = {
  key: keyof OliConfig;
  label: string;
  type?: "text" | "number" | "toggle" | "json";
  group: string;
};

const FIELDS: Field[] = [
  { key: "backend", label: "backend", group: "Backend" },

  { key: "openai_api_key", label: "openai api key", group: "OpenAI" },
  { key: "openai_base_url", label: "openai base url", group: "OpenAI" },
  { key: "openai_model", label: "openai model", group: "OpenAI" },
  { key: "openai_small_model", label: "openai small model", group: "OpenAI" },
  { key: "openai_vision_style", label: "openai vision style", group: "OpenAI" },
  {
    key: "openai_optional_headers",
    label: "openai optional headers",
    type: "json",
    group: "OpenAI",
  },

  { key: "ollama_base_url", label: "ollama base url", group: "Ollama" },
  { key: "ollama_model", label: "ollama model", group: "Ollama" },
  { key: "ollama_small_model", label: "ollama small model", group: "Ollama" },

  {
    key: "huggingface_base_url",
    label: "huggingface base url",
    group: "HuggingFace",
  },
  {
    key: "huggingface_api_key",
    label: "huggingface api key",
    group: "HuggingFace",
  },
  {
    key: "huggingface_model",
    label: "huggingface model",
    group: "HuggingFace",
  },
  {
    key: "huggingface_small_model",
    label: "huggingface small model",
    group: "HuggingFace",
  },
  {
    key: "huggingface_remote",
    label: "huggingface remote",
    type: "toggle",
    group: "HuggingFace",
  },

  {
    key: "transformers_model",
    label: "transformers model",
    group: "Transformers",
  },
  {
    key: "transformers_small_model",
    label: "transformers small model",
    group: "Transformers",
  },
  {
    key: "transformers_device",
    label: "transformers device",
    group: "Transformers",
  },
  {
    key: "transformers_dtype",
    label: "transformers dtype",
    group: "Transformers",
  },
  {
    key: "transformers_is_multi_model",
    label: "transformers is multi model",
    type: "toggle",
    group: "Transformers",
  },

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
    key: "max_retries",
    label: "max retries",
    type: "number",
    group: "Generation",
  },
  {
    key: "retry_delay",
    label: "retry delay",
    type: "number",
    group: "Generation",
  },
  {
    key: "request_timeout",
    label: "request timeout",
    type: "number",
    group: "Generation",
  },
  {
    key: "stream_timeout",
    label: "stream timeout",
    type: "number",
    group: "Generation",
  },

  {
    key: "max_messages",
    label: "max messages",
    type: "number",
    group: "Agent",
  },
  {
    key: "max_tool_iterations",
    label: "max tool iterations",
    type: "number",
    group: "Agent",
  },
  {
    key: "agent_pool_size",
    label: "agent pool size",
    type: "number",
    group: "Agent",
  },
  {
    key: "use_agent_pool",
    label: "use agent pool",
    type: "toggle",
    group: "Agent",
  },
  {
    key: "offline_mode",
    label: "offline mode",
    type: "toggle",
    group: "Agent",
  },
  { key: "dry_run", label: "dry run", type: "toggle", group: "Agent" },
  { key: "model_filters", label: "model filters", group: "Agent" },
  {
    key: "truncation_max_chars_small",
    label: "truncation small",
    type: "number",
    group: "Agent",
  },
  {
    key: "truncation_max_chars_large",
    label: "truncation large",
    type: "number",
    group: "Agent",
  },

  {
    key: "voice_whisper_model",
    label: "whisper model",
    group: "Voice",
  },
  { key: "voice_piper_model", label: "piper model", group: "Voice" },
  {
    key: "voice_sample_rate",
    label: "sample rate",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_frame_duration_ms",
    label: "frame duration ms",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_vad_aggressiveness",
    label: "vad aggressiveness",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_silence_timeout_ms",
    label: "silence timeout ms",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_max_record_seconds",
    label: "max record seconds",
    type: "number",
    group: "Voice",
  },

  { key: "log_level", label: "log level", group: "System" },
  { key: "log_file", label: "log file", group: "System" },
  { key: "profiles_dir", label: "profiles dir", group: "System" },
  { key: "logs_dir", label: "logs dir", group: "System" },
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

function stringifyHeaders(
  headers: Record<string, unknown> | undefined | null,
): string {
  if (!headers || typeof headers !== "object") return "{}";
  return JSON.stringify(headers, null, 2);
}

export function ConfigPage() {
  const { config, fetchConfig, saveConfig } = useApp();
  const [draft, setDraft] = useState<OliConfig>({ ...config });
  const [headersText, setHeadersText] = useState<string>(
    stringifyHeaders(config.openai_optional_headers),
  );
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    setDraft({ ...config });
    setHeadersText(stringifyHeaders(config.openai_optional_headers));
  }, [config]);

  const handleChange = useCallback(
    (key: keyof OliConfig, raw: string | boolean) => {
      setSaved(false);
      setSaveError(false);
      setDraft((d) => {
        const next: Record<string, unknown> = { ...d };
        const field = FIELDS.find((f) => f.key === key);
        if (field?.type === "number") {
          next[key] = Number(raw) || 0;
        } else if (field?.type === "toggle") {
          next[key] = Boolean(raw);
        } else {
          next[key] = String(raw);
        }
        return next as OliConfig;
      });
    },
    [],
  );

  const save = async () => {
    let headers: Record<string, unknown> = {};
    try {
      const trimmed = headersText.trim();
      if (trimmed !== "") {
        const parsed = JSON.parse(trimmed);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          throw new Error("must be a JSON object");
        }
        headers = parsed;
      }
    } catch {
      setSaveError(true);
      setSaved(false);
      return;
    }
    const ok = await saveConfig({ ...draft, openai_optional_headers: headers });
    if (ok) {
      setSaved(true);
      setSaveError(false);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError(true);
      setSaved(false);
    }
  };

  const reset = () => {
    setDraft({ ...config });
    setHeadersText(stringifyHeaders(config.openai_optional_headers));
  };

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
                  <label className="w-44 shrink-0 text-xs text-terminal-muted">
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
                  ) : field.type === "json" ? (
                    <textarea
                      value={headersText}
                      onChange={(e) => {
                        setSaved(false);
                        setSaveError(false);
                        setHeadersText(e.target.value);
                      }}
                      rows={3}
                      className="flex-1 resize-y border border-terminal-border bg-terminal-surface px-2 py-1 font-mono text-xs text-terminal-text focus:border-terminal-green focus:outline-none"
                    />
                  ) : field.key === "openai_api_key" ||
                    field.key === "huggingface_api_key" ? (
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
