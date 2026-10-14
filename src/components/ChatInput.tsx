import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { useApp } from "../context/AppContext";
import { COMMANDS, PendingAttachment } from "../types";
import {
  fileToAttachment,
  MAX_ATTACHMENTS,
} from "../lib/attachments";
import { SendHorizonal, Trash2, Plus, FileText, X } from "lucide-react";

export function ChatInput({ onClear }: { onClear: () => void }) {
  const { sendMessage, isGenerating, runCommand } = useApp();
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value.startsWith("/") || value.includes(" ")) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = COMMANDS.filter((c) => c.startsWith(value.toLowerCase()));
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0 && value.length > 0);
    setSelectedIdx(-1);
  }, [value]);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSuggestions]);

  useEffect(() => {
    if (!showAttachMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttachMenu]);

  const handleFiles = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const files = Array.from(input.files ?? []);
      input.value = "";
      if (!files.length) return;
      const results = await Promise.allSettled(files.map(fileToAttachment));
      const added: PendingAttachment[] = [];
      const errors: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") added.push(r.value);
        else
          errors.push(
            r.reason instanceof Error ? r.reason.message : "Could not read file",
          );
      }
      const room = Math.max(0, MAX_ATTACHMENTS - attachments.length);
      if (added.length > room) {
        errors.push(`At most ${MAX_ATTACHMENTS} attachments per message`);
      }
      if (added.length) {
        setAttachments((prev) => [...prev, ...added].slice(0, MAX_ATTACHMENTS));
      }
      setAttachError(errors[0] ?? null);
    },
    [attachments.length],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    setAttachError(null);
  }, []);

  const submit = useCallback(() => {
    const text = value.trim();
    const hasAttachments = attachments.length > 0;
    if ((!text && !hasAttachments) || isGenerating) return;
    if (!hasAttachments && runCommand(text)) {
      setValue("");
      setShowSuggestions(false);
      inputRef.current?.focus();
      return;
    }
    sendMessage(text, attachments);
    setValue("");
    setAttachments([]);
    setAttachError(null);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [value, attachments, isGenerating, sendMessage, runCommand]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        return;
      }
      if (e.key === "Enter" && selectedIdx >= 0) {
        e.preventDefault();
        setValue(suggestions[selectedIdx] + " ");
        setShowSuggestions(false);
        setSelectedIdx(-1);
        inputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="relative border-t border-oli-line bg-oli-surface">
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 z-50 max-h-48 w-full overflow-y-auto border border-oli-line-strong bg-oli-elevated shadow-lg"
        >
          {suggestions.map((cmd, i) => (
            <div
              key={cmd}
              className={`cursor-pointer px-3 py-1.5 text-xs ${
                i === selectedIdx
                  ? "bg-oli-selected text-oli-accent"
                  : "text-oli-muted hover:bg-oli-elevated hover:text-oli-fg"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                setValue(cmd + " ");
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
            >
              <span className="font-bold text-oli-accent">{cmd}</span>
            </div>
          ))}
        </div>
      )}

      {(attachments.length > 0 || attachError) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-oli-line px-2 py-1.5">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-1.5 border border-oli-line bg-oli-elevated px-1.5 py-1 text-[10px] text-oli-fg"
            >
              {a.kind === "image" ? (
                <img
                  src={a.dataUrl}
                  alt={a.name}
                  className="h-6 w-6 shrink-0 object-cover"
                />
              ) : (
                <FileText size={12} className="shrink-0 text-oli-accent" />
              )}
              <span className="max-w-[9rem] truncate" title={a.name}>
                {a.name}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="text-oli-muted hover:text-oli-danger"
                title={`Remove ${a.name}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          {attachError && (
            <span className="text-[10px] text-oli-danger">{attachError}</span>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 px-2 py-1">
        <span className="mb-1.5 text-oli-accent text-sm select-none">
          {">"}
        </span>
        <div ref={attachMenuRef} className="relative mb-1.5">
          <button
            type="button"
            onClick={() => setShowAttachMenu((o) => !o)}
            disabled={isGenerating}
            className="flex text-oli-accent hover:text-oli-accent-bright disabled:text-oli-muted"
            title="Attach a file"
            aria-haspopup="menu"
            aria-expanded={showAttachMenu}
          >
            <Plus size={16} />
          </button>
          {showAttachMenu && (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-50 mb-1 w-28 border border-oli-line-strong bg-oli-elevated shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowAttachMenu(false);
                  imageInputRef.current?.click();
                }}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-oli-fg hover:bg-oli-selected hover:text-oli-accent"
              >
                <Plus size={12} className="text-oli-accent" />
                Image
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowAttachMenu(false);
                  fileInputRef.current?.click();
                }}
                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-oli-fg hover:bg-oli-selected hover:text-oli-accent"
              >
                <FileText size={12} className="text-oli-accent" />
                File
              </button>
            </div>
          )}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="flex-1 resize-none border-none bg-transparent text-sm text-oli-fg placeholder:text-oli-accent-dim focus:outline-none focus:ring-0"
          placeholder={isGenerating ? "generating..." : "type a message..."}
          disabled={isGenerating}
        />
        {(value.trim() || attachments.length > 0) && (
          <button
            onClick={submit}
            disabled={isGenerating}
            className="mb-1 text-oli-accent hover:text-oli-accent-bright disabled:text-oli-muted"
            title="Send"
          >
            <SendHorizonal size={16} />
          </button>
        )}
        {!value.trim() && attachments.length === 0 && (
          <button
            onClick={onClear}
            className="mb-1 text-oli-muted hover:text-oli-danger"
            title="Clear"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
