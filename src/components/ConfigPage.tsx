import { useState, useCallback, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { OliConfig } from "../types";
import { Save, RotateCcw } from "lucide-react";
import { FIELDS, groupFields } from "./configFields";

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
    <div className="flex h-full flex-col bg-oli-bg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-oli-accent">config</h2>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1 border border-oli-line px-2 py-1 text-xs text-oli-muted hover:text-oli-fg"
          >
            <RotateCcw size={12} /> reset
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1 border border-oli-accent bg-oli-elevated px-2 py-1 text-xs text-oli-accent hover:bg-oli-selected"
          >
            <Save size={12} />{" "}
            {saveError ? "save failed" : saved ? "saved!" : "save"}
          </button>
        </div>
      </div>

      <div className="mb-3 border border-oli-line bg-oli-surface px-3 py-2 text-xs text-oli-muted">
        changes are saved to the server and require a restart to take effect.
        api host/port/mode and the default profile apply at the next server
        start. the active agent profile is not set here — click the{" "}
        <span className="text-oli-fg">:: &lt;profile&gt;</span> chip in the
        status bar to switch it live.
      </div>

      <div className="flex-1 overflow-y-auto">
        {[...groups.entries()].map(([group, fields]) => (
          <div key={group} className="mb-6">
            <h3 className="mb-2 border-b border-oli-line-strong pb-1 text-xs font-bold text-oli-accent-dim">
              {group}
            </h3>
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
                >
                  <label className="w-full shrink-0 text-xs text-oli-muted sm:w-44">
                    {field.label}
                  </label>
                  {field.type === "toggle" ? (
                    <button
                      onClick={() => handleChange(field.key, !draft[field.key])}
                      className={`px-3 py-1 text-xs font-bold border ${
                        draft[field.key]
                          ? "border-oli-accent bg-oli-elevated text-oli-accent"
                          : "border-oli-line bg-oli-surface text-oli-muted"
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
                      className="w-full sm:flex-1 resize-y border border-oli-line bg-oli-surface px-2 py-1 font-mono text-xs text-oli-fg focus:border-oli-accent focus:outline-none"
                    />
                  ) : field.key === "openai_api_key" ||
                    field.key === "huggingface_api_key" ? (
                    <input
                      type="password"
                      value={String(draft[field.key])}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full sm:flex-1 border border-oli-line bg-oli-surface px-2 py-1 text-xs text-oli-fg focus:border-oli-accent focus:outline-none"
                    />
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={String(draft[field.key])}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full sm:flex-1 border border-oli-line bg-oli-surface px-2 py-1 text-xs text-oli-fg focus:border-oli-accent focus:outline-none"
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
