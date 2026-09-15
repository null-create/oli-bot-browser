import { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { MessageBubble } from "./MessageBubble";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallDisplay } from "./ToolCallDisplay";

const TAGLINES = [
  "a terminal in your browser",
  "all systems nominal",
  "green on black, the way god intended",
  "no vibe here, just compute",
  "01 10 11 00",
  "the tui you never asked for",
];

export function ChatPanel() {
  const { messages, pendingText, pendingThinking, thinkingOpen, collapseThinking, activeToolCalls, isGenerating } =
    useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pendingText, pendingThinking]);

  const tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-terminal-bg px-4 py-3"
    >
      {messages.length === 0 && !pendingText && (
        <div className="mt-24 flex flex-col items-center gap-2 text-terminal-muted">
          <div className="text-3xl font-bold text-terminal-green">
            <span className="animate-pulse-green">{">"}</span>_ oli
          </div>
          <div className="text-xs">{tagline}</div>
        </div>
      )}

      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      {pendingThinking && (
        <ThinkingBlock
          text={pendingThinking}
          open={thinkingOpen}
          onToggle={() => collapseThinking(!thinkingOpen)}
        />
      )}

      {[...activeToolCalls.entries()].map(([start, name]) => (
        <ToolCallDisplay key={start} name={name} startedAt={start} />
      ))}

      {pendingText && (
        <MessageBubble
          message={{
            id: "pending",
            role: "assistant",
            content: pendingText,
            timestamp: Date.now(),
          }}
          pending
        />
      )}

      {isGenerating && !pendingText && (
        <div className="flex items-center gap-1 px-2 py-1 text-xs text-terminal-green-dim">
          <span className="inline-block h-2 w-2 animate-blink bg-terminal-green" />
          <span>working</span>
        </div>
      )}
    </div>
  );
}