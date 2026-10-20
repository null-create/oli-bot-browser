import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { TurnActivity } from "../types";
import { ToolCallDisplay } from "./ToolCallDisplay";

function summary(activity: TurnActivity): string {
  const parts: string[] = [];
  const count = activity.toolCalls.length;
  if (count > 0) parts.push(`${count} tool call${count === 1 ? "" : "s"}`);
  if (activity.thinking) parts.push("thinking");
  if (activity.elapsed !== undefined) {
    parts.push(`${activity.elapsed.toFixed(1)}s`);
  }
  return parts.join(" \u00b7 ");
}

export function TurnActivityBlock({ activity }: { activity: TurnActivity }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-2 border border-oli-line bg-oli-surface">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-oli-accent-dim hover:text-oli-accent"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Wrench size={12} />
        <span className="font-bold">activity</span>
        <span className="text-oli-muted">{summary(activity)}</span>
      </button>
      {open && (
        <div className="border-t border-oli-line px-3 py-2">
          {activity.thinking && (
            <div className="mb-2 whitespace-pre-wrap text-xs italic text-oli-muted">
              {activity.thinking}
            </div>
          )}
          {activity.toolCalls.map((call) => (
            <ToolCallDisplay key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
