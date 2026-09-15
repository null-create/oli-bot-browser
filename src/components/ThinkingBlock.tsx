import { ChevronRight, ChevronDown, Brain } from "lucide-react";

export function ThinkingBlock({
  text,
  open,
  onToggle,
}: {
  text: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="my-2 border border-terminal-border bg-terminal-surface">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-terminal-green-dim hover:text-terminal-green"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Brain size={12} />
        <span className="font-bold">thinking</span>
      </button>
      {open && (
        <div className="border-t border-terminal-border px-3 py-2 text-xs italic text-terminal-muted whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
