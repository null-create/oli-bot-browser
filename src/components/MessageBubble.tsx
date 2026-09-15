import ReactMarkdown from "react-markdown";
import { User, Bot, AlertTriangle } from "lucide-react";
import { ChatMessage } from "../types";

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  message,
  pending,
}: {
  message: ChatMessage;
  pending?: boolean;
}) {
  const isUser = message.role === "user";
  const isError = message.content.startsWith("\u2717");

  if (isError) {
    return (
      <div className="my-2 border border-terminal-error bg-terminal-error-bg px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-terminal-error">
          <AlertTriangle size={12} />
          <span className="font-bold">ERROR</span>
        </div>
        <div className="mt-1 text-sm text-terminal-error">
          {message.content.replace(/^\u2717\s*/, "")}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-2 border-l-2 px-3 py-2 ${
        isUser ? "border-terminal-info" : "border-terminal-green"
      }`}
    >
      <div
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center ${
          isUser ? "text-terminal-info" : "text-terminal-green"
        }`}
      >
        {isUser ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-terminal-muted">
          <span className={isUser ? "text-terminal-info" : "text-terminal-green"}>
            {isUser ? "\u276f you" : "\u25cf assistant"}
          </span>
          <span className="text-terminal-green-dim">
            [ {fmtTime(message.timestamp)} ]
          </span>
        </div>
        <div
          className={`markdown-body mt-1 text-sm leading-relaxed ${
            pending ? "text-terminal-green-bright" : "text-terminal-text"
          }`}
        >
          <ReactMarkdown
            components={{
              a: ({ node: _node, ...props }) => (
                <a {...props} className="text-terminal-info underline" />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
          {pending && (
            <span className="ml-1 inline-block h-3 w-1.5 animate-blink bg-terminal-green align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}