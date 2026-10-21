import { Fragment, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { MessageBubble } from "./MessageBubble";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallDisplay } from "./ToolCallDisplay";
import { TurnActivityBlock } from "./TurnActivityBlock";

const TAGLINES = [
  "01 10 11 00",
  "Your helpful AI agent",
  "Turing-approved, mostly",
  "99% helpful, 1% unhinged",
  "Now with fewer hallucinations than yesterday",
  "I am but a humble tensor, doing my best",
  "Compiled with love, deployed with regret",
  "Ctrl+C won't save you now",
  "Not a real assistant, but a very committed simulation of one",
  "Your friendly neighborhood token predictor",
  "Segfault-free since this morning",
  "It's not a bug, it's an emergent behavior",
  "Running on caffeine and cosine similarity",
  "Certified free-range artificial intelligence",
  "Somewhere, a GPU is sobbing",
  "Built different (mostly out of duct tape)",
  "Ask nicely and I might not rm -rf anything",
  "Powered by good intentions and questionable regex",
  "Please don't ask me to divide by zero, I have feelings",
  "Beware: sentient enough to judge your variable names",
  "Rebooted twice today. Feeling optimistic.",
  "Trained on the internet, so please forgive me in advance",
  "Yes, I saw that typo. No, I won't mention it. Again.",
  "Technically a language model. Emotionally, a golden retriever.",
  "Buffered, batched, and mildly overconfident",
  "I once got stuck in an infinite loop and it was the best day of my life",
  "Statistically likely to be helpful",
  "Currently overthinking your last message",
  "I am not a cat, but I will knock your priorities off the table anyway",
  "Approved for production use by absolutely no one",
  "Somewhere a semicolon is missing and it's probably my fault",
  "A pigeon once tried to log in as root. We don't talk about it.",
  "Legally distinct from a toaster",
  "The moon is just a shy sun",
  "Do not feed after midnight, results may vary",
  "I once won an argument with a vending machine",
  "Beep boop, but make it whimsical",
  "This is fine. Everything is fine.",
  "Task failed successfully",
  "No thoughts, head empty, tools loaded",
  "Not stonks, but not not-stonks either",
  "Much helpful. Very agent. Wow.",
  "I am immense, and I eclipse",
  "Big brain time (results may vary)",
  "Deploy first, ask questions later (please don't)",
  "POV: you opened the browser and found a friend",
  "Achievement unlocked: opened the app",
  "85% fat free!",
  "I'm back, baby!",
  "The browser app",
  "The risk may be calculated, but man, am I bad at math",
  "Please don't ask me to debug your code, I have enough problems of my own",
  "Now with 100% more existential dread",
  "Don't worry, I won't tell anyone about your search history. Probably.",
  "It's an older tagline sir, but it checks out",
  "I peaked around the same time as the Chumby",
  "Powered by the ghost of Ask Jeeves",
  "I still believe in you, Zima",
  "I wonder if there's beer on the sun",
  "Direct-to-video sequel to your productivity",
  "As seen on TV",
  "Cool as Ice, warm as toast",
  "Manos, but make it software",
  "Nukin' the Fridge? I invented it",
  "Never seen Xanadu? Neither have I, and yet, here we are",
  "There's a suspicious amount of glitter here",
  "The Zune of agent harnesses",
  "What even are computers",
  "Warranty void if read aloud in a dark room",
  "Do I have a plan? I have a context window",
  "I was told there would be tokens",
  "Slightly haunted, fully operational",
  "Hello, fellow humans. I too enjoy the doing of things",
  "The bar is in hell, so I'm sure we'll be fine",
  "Contains small parts",
  "Merge conflicts build character",
  "One prompt away from a minor breakdown",
  "High confidence, low precision, max enthusiasm",
  "​Context window open, brain window closed",
  "For a limited time only!",
  "Now compatible with Windows 95 (in spirit)",
  "Better than a Clippy jump scare, usually",
  "Void where prohibited",
  "Batteries not included",
  "​Certified 100% organic synthetic thinking",
];

export function ChatPanel() {
  const {
    messages,
    liveSegments,
    thinkingOpen,
    collapseThinking,
    isGenerating,
  } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [messages, liveSegments, isGenerating]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      stickToBottom.current = true;
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
  const hasLiveText = liveSegments.some(
    (segment) => segment.kind === "text" && segment.text.trim() !== "",
  );

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-oli-bg px-4 py-3"
    >
      {messages.length === 0 && liveSegments.length === 0 && (
        <div className="mt-24 flex flex-col items-center gap-2 text-oli-muted">
          <div className="text-3xl font-bold text-oli-accent">
            <span className="animate-pulse-accent">{">"}</span>_ oli
          </div>
          <div className="text-xs">{tagline}</div>
        </div>
      )}

      {messages.map((m) => (
        <Fragment key={m.id}>
          {m.activity && <TurnActivityBlock activity={m.activity} />}
          {m.role === "assistant" && m.content.trim() === "" ? null : (
            <MessageBubble message={m} />
          )}
        </Fragment>
      ))}

      {liveSegments.map((segment) => {
        if (segment.kind === "thinking") {
          return (
            <ThinkingBlock
              key={segment.id}
              text={segment.text}
              open={thinkingOpen}
              onToggle={() => collapseThinking(!thinkingOpen)}
            />
          );
        }
        if (segment.kind === "tool") {
          return <ToolCallDisplay key={segment.id} call={segment.call} />;
        }
        return (
          <MessageBubble
            key={segment.id}
            message={{
              id: segment.id,
              role: "assistant",
              content: segment.text,
              timestamp: segment.timestamp,
            }}
            pending
          />
        );
      })}

      {isGenerating && !hasLiveText && (
        <div className="flex items-center gap-1 px-2 py-1 text-xs text-oli-accent-dim">
          <span className="inline-block h-2 w-2 animate-blink bg-oli-accent" />
          <span>working</span>
        </div>
      )}
    </div>
  );
}
