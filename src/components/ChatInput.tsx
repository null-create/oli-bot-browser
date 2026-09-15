import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { useApp } from "../context/AppContext";
import { COMMANDS } from "../types";
import { SendHorizonal, Trash2 } from "lucide-react";

export function ChatInput({ onClear }: { onClear: () => void }) {
  const { sendMessage, isGenerating, runCommand } = useApp();
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.startsWith("/") || value.includes(" ")) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = COMMANDS.filter((c) =>
      c.startsWith(value.toLowerCase())
    );
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0 && value.length > 0);
    setSelectedIdx(-1);
  }, [value]);

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

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || isGenerating) return;
    if (runCommand(text)) {
      setValue("");
      setShowSuggestions(false);
      inputRef.current?.focus();
      return;
    }
    sendMessage(text);
    setValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [value, isGenerating, sendMessage, runCommand]);

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
    <div className="relative border-t border-terminal-border bg-terminal-surface">
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 z-50 max-h-48 w-full overflow-y-auto border border-terminal-border-bright bg-terminal-panel shadow-lg"
        >
          {suggestions.map((cmd, i) => (
            <div
              key={cmd}
              className={`cursor-pointer px-3 py-1.5 text-xs ${
                i === selectedIdx
                  ? "bg-terminal-panel-selected text-terminal-green"
                  : "text-terminal-muted hover:bg-terminal-panel hover:text-terminal-text"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                setValue(cmd + " ");
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
            >
              <span className="font-bold text-terminal-green">{cmd}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-2 py-1">
        <span className="mb-1.5 text-terminal-green text-sm select-none">{">"}</span>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="flex-1 resize-none border-none bg-transparent text-sm text-terminal-text placeholder:text-terminal-green-dim focus:outline-none focus:ring-0"
          placeholder={isGenerating ? "generating..." : "type a message..."}
          disabled={isGenerating}
          autoFocus
        />
        {value.trim() && (
          <button
            onClick={submit}
            disabled={isGenerating}
            className="mb-1 text-terminal-green hover:text-terminal-green-bright disabled:text-terminal-muted"
            title="Send"
          >
            <SendHorizonal size={16} />
          </button>
        )}
        {!value.trim() && (
          <button
            onClick={onClear}
            className="mb-1 text-terminal-muted hover:text-terminal-error"
            title="Clear"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}