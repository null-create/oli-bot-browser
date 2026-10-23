import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  ChangeEvent,
  KeyboardEvent,
  UIEvent,
} from "react";
import { useApp } from "../context/AppContext";
import { PendingAttachment } from "../types";
import {
  fileToAttachment,
  MAX_ATTACHMENTS,
} from "../lib/attachments";
import { listDirectory } from "../lib/workspace";
import {
  matchCommand,
  parseSlashCommand,
  ParsedCommand,
  WORKSPACE_COMMAND,
} from "../lib/commands";
import { SendHorizonal, Trash2, Plus, FileText, X } from "lucide-react";

const MAX_INPUT_HEIGHT = 160;

type Notice = {
  tone: "ok" | "error" | "info";
  text: string;
};

export function ChatInput({ onClear }: { onClear: () => void }) {
  const {
    sendMessage,
    isGenerating,
    workspace,
    setWorkspace,
    unsetWorkspace,
  } = useApp();
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, []);

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

  const fitTextarea = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const clamped = el.scrollHeight > MAX_INPUT_HEIGHT;
    const next = Math.min(el.scrollHeight, MAX_INPUT_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = clamped ? "auto" : "hidden";
    const overlay = highlightRef.current;
    if (overlay) {
      overlay.style.right = `${clamped ? el.offsetWidth - el.clientWidth : 0}px`;
      overlay.scrollTop = el.scrollTop;
    }
  }, []);

  const syncHighlightScroll = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    const overlay = highlightRef.current;
    if (overlay) overlay.scrollTop = e.currentTarget.scrollTop;
  }, []);

  useLayoutEffect(() => {
    fitTextarea();
  }, [value, fitTextarea]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fitTextarea();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitTextarea]);

  const applyWorkspace = useCallback(
    async (path: string) => {
      const failure = await setWorkspace(path);
      setConfirmPath(null);
      if (failure) {
        setNotice({ tone: "error", text: `workspace not set: ${failure}` });
      } else {
        setNotice({ tone: "ok", text: `workspace set to ${path}` });
      }
    },
    [setWorkspace],
  );

  const setWorkspaceFromPath = useCallback(
    async (path: string) => {
      try {
        const listing = await listDirectory(path);
        if (listing.sensitive) {
          setConfirmPath(listing.path);
          setNotice(null);
          return;
        }
        await applyWorkspace(listing.path);
      } catch (e) {
        setNotice({
          tone: "error",
          text: e instanceof Error ? e.message : `Failed to open ${path}`,
        });
      }
    },
    [applyWorkspace],
  );

  const runCommand = useCallback(
    (command: ParsedCommand) => {
      switch (command.kind) {
        case "workspace-show": {
          const current = workspace?.current;
          const recent = workspace?.workspaces ?? [];
          const lines = [current ? `workspace: ${current}` : "workspace: (none)"];
          if (recent.length) lines.push(`recent: ${recent.join("  ")}`);
          lines.push(`usage: ${WORKSPACE_COMMAND.usage}`);
          setNotice({ tone: "info", text: lines.join("\n") });
          return;
        }
        case "workspace-unset":
          void unsetWorkspace().then((failure) => {
            if (failure) {
              setNotice({
                tone: "error",
                text: `workspace not cleared: ${failure}`,
              });
            } else {
              setNotice({ tone: "ok", text: "workspace cleared" });
            }
          });
          return;
        case "workspace-set":
          void setWorkspaceFromPath(command.path);
          return;
      }
    },
    [workspace, unsetWorkspace, setWorkspaceFromPath],
  );

  const confirmSensitive = useCallback(() => {
    if (!confirmPath) return;
    void applyWorkspace(confirmPath);
  }, [confirmPath, applyWorkspace]);

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
    const command = parseSlashCommand(text);
    if (command) {
      setValue("");
      inputRef.current?.focus();
      runCommand(command);
      return;
    }
    sendMessage(text, attachments);
    setValue("");
    setAttachments([]);
    setAttachError(null);
    setNotice(null);
    setConfirmPath(null);
    inputRef.current?.focus();
  }, [value, attachments, isGenerating, sendMessage, runCommand]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const command = matchCommand(value);

  return (
    <div className="relative border-t border-oli-line bg-oli-surface">
      {notice && (
        <div
          aria-live="polite"
          className={`flex items-start gap-2 border-b border-oli-line px-2 py-1 text-[10px] ${
            notice.tone === "error"
              ? "text-oli-danger"
              : notice.tone === "ok"
                ? "text-oli-accent"
                : "text-oli-muted"
          }`}
        >
          <span className="min-w-0 flex-1 whitespace-pre-line break-all">
            {notice.text}
          </span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-oli-muted hover:text-oli-danger"
            title="Dismiss"
          >
            <X size={10} />
          </button>
        </div>
      )}
      {confirmPath && (
        <div className="border-b border-oli-line bg-oli-elevated px-2 py-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-oli-warn">sensitive path</span>
            <span
              className="min-w-0 flex-1 truncate font-mono text-oli-warn"
              title={confirmPath}
            >
              {confirmPath}
            </span>
            <button
              type="button"
              onClick={confirmSensitive}
              className="shrink-0 border border-oli-warn px-1.5 py-0.5 text-[10px] text-oli-warn hover:bg-oli-elevated"
            >
              confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmPath(null)}
              className="shrink-0 border border-oli-line px-1.5 py-0.5 text-[10px] text-oli-muted hover:text-oli-fg"
            >
              cancel
            </button>
          </div>
          <div className="mt-1 text-[10px] text-oli-muted">
            This grants the agent read access within this directory.
          </div>
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
            className="-m-0.5 flex p-0.5 text-oli-accent hover:text-oli-accent-bright disabled:text-oli-muted"
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
        <div className="relative min-w-0 flex-1">
          {command && (
            <div
              ref={highlightRef}
              aria-hidden="true"
              data-testid="chat-input-highlight"
              className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-sm leading-5"
            >
              {value.slice(0, command.start)}
              <span className="font-bold text-oli-accent-bright">
                {command.token}
              </span>
              <span className="text-oli-fg">{command.rest}</span>
            </div>
          )}
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onScroll={syncHighlightScroll}
            onKeyDown={handleKeyDown}
            spellCheck={command ? false : undefined}
            rows={1}
            className={`relative w-full resize-none whitespace-pre-wrap break-words border-none bg-transparent text-sm leading-5 placeholder:text-oli-accent-dim focus:outline-none focus:ring-0 ${
              command
                ? "chat-input-highlight-source text-transparent caret-oli-accent"
                : "text-oli-fg"
            }`}
            placeholder={isGenerating ? "generating..." : "type a message..."}
            disabled={isGenerating}
          />
        </div>
        {(value.trim() || attachments.length > 0) && (
          <button
            onClick={submit}
            disabled={isGenerating}
            className="mb-0.5 -m-1 p-1 text-oli-accent hover:text-oli-accent-bright disabled:text-oli-muted"
            title="Send"
          >
            <SendHorizonal size={16} />
          </button>
        )}
        {!value.trim() && attachments.length === 0 && (
          <button
            onClick={onClear}
            className="mb-0.5 -m-1 p-1 text-oli-muted hover:text-oli-danger"
            title="Clear"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
