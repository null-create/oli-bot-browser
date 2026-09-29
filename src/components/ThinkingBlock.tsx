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
    <div className="my-2 border border-oli-line bg-oli-surface">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-oli-accent-dim hover:text-oli-accent"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Brain size={12} />
        <span className="font-bold">thinking</span>
      </button>
      {open && (
        <div className="border-t border-oli-line px-3 py-2 text-xs italic text-oli-muted whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
