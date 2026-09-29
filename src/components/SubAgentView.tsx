import { useState } from "react";
import { useApp } from "../context/AppContext";
import { SubAgentRun } from "../types";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ToolCallDisplay } from "./ToolCallDisplay";

function StatusIcon({ status }: { status: SubAgentRun["status"] }) {
  if (status === "running")
    return <Loader2 size={12} className="animate-spin text-oli-accent" />;
  if (status === "done")
    return <CheckCircle2 size={12} className="text-oli-accent" />;
  return <XCircle size={12} className="text-oli-danger" />;
}

function RunCard({ run }: { run: SubAgentRun }) {
  const [open, setOpen] = useState(run.status === "running");

  return (
    <div className="mb-2 border border-oli-line bg-oli-surface">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-oli-elevated"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <StatusIcon status={run.status} />
        <span className="font-bold text-oli-fg">{run.agent_name}</span>
        <span className="text-oli-muted">::</span>
        <span className="truncate text-oli-fg">{run.task}</span>
        <span className="ml-auto shrink-0 text-oli-accent-dim">
          {run.activity}
        </span>
      </button>
      {open && (
        <div className="border-t border-oli-line px-3 py-2">
          {run.toolCalls.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 text-[11px] font-bold text-oli-accent-dim">
                tool calls
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {run.toolCalls.map((tc) => (
                  <ToolCallDisplay key={tc.id} call={tc} />
                ))}
              </div>
            </div>
          )}
          {run.messages.length > 0 && (
            <div>
              <div className="mb-1 text-[11px] font-bold text-oli-accent-dim">
                messages
              </div>
              <div className="max-h-64 overflow-y-auto">
                {run.messages.map((m) => (
                  <div key={m.id} className="mb-1 text-xs text-oli-fg">
                    <span className="font-bold text-oli-accent">
                      {m.role === "user" ? "\u276f user" : "\u25cf assistant"}
                      {m.agentName && ` (${m.agentName})`}
                      {": "}
                    </span>
                    <ReactMarkdown className="inline">{`${m.content.slice(0, 300)}${m.content.length > 300 ? "..." : ""}`}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          )}
          {run.messages.length === 0 && run.toolCalls.length === 0 && (
            <div className="text-xs text-oli-muted">no data yet...</div>
          )}
        </div>
      )}
    </div>
  );
}

export function SubAgentView() {
  const { subAgents } = useApp();

  if (subAgents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-oli-bg text-sm text-oli-muted">
        no sub-agent runs yet
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-oli-bg p-4">
      <h2 className="mb-3 text-sm font-bold text-oli-accent">sub-agents</h2>
      <div className="flex-1 overflow-y-auto">
        {subAgents.map((run) => (
          <RunCard key={run.task_id} run={run} />
        ))}
      </div>
    </div>
  );
}
