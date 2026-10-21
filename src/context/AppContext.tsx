import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useOliSocket, WsStatus } from "../hooks/useOliSocket";
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  renameSession,
  sessionFromMeta,
} from "../lib/sessions";
import {
  fetchWorkspace as fetchWorkspaceApi,
  setWorkspace as setWorkspaceApi,
  unsetWorkspace as unsetWorkspaceApi,
} from "../lib/workspace";
import {
  listProfiles as listProfilesApi,
  selectProfile as selectProfileApi,
} from "../lib/profiles";
import {
  ChatLine,
  LiveSegment,
  MCPServerConfig,
  OliConfig,
  OliEvent,
  OliView,
  PendingAttachment,
  ProfileInfo,
  Session,
  SubAgentRun,
  TodoItem,
  ToolCall,
  TurnActivity,
  WorkspaceState,
  INITIAL_CONFIG,
} from "../types";
import { toWireAttachments } from "../lib/attachments";
import {
  addTool,
  appendText,
  appendThinking,
  collectActivity,
  collectText,
  sealText,
  setToolResult,
} from "../lib/liveTurn";
import {
  activityToTurnActivity,
  buildTranscript,
  collectSubAgents,
} from "../lib/transcript";

type AppState = {
  view: OliView;
  status: WsStatus;
  messages: ChatLine[];
  liveSegments: LiveSegment[];
  thinkingOpen: boolean;
  isGenerating: boolean;
  sessions: Session[];
  currentSessionId: string;
  subAgents: SubAgentRun[];
  todos: TodoItem[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    estimated: boolean;
  };
  config: OliConfig;
  mcpServers: MCPServerConfig[];
  profiles: ProfileInfo[];
  profileError: string | null;
  fetchProfiles: () => Promise<void>;
  selectProfile: (name: string) => Promise<boolean>;
  workspace: WorkspaceState | null;
  fetchWorkspace: () => Promise<void>;
  setWorkspace: (path: string) => Promise<boolean>;
  unsetWorkspace: () => Promise<void>;
  fetchMcpServers: () => Promise<void>;
  addMcpServer: (cfg: MCPServerConfig) => Promise<boolean>;
  updateMcpServer: (name: string, cfg: MCPServerConfig) => Promise<boolean>;
  removeMcpServer: (name: string) => Promise<boolean>;
  collapseThinking: (open: boolean) => void;
  setView: (view: OliView) => void;
  sendMessage: (text: string, attachments?: PendingAttachment[]) => void;
  clearChat: () => void;
  newSession: () => void;
  switchSession: (id: string) => void;
  removeSession: (id: string) => void;
  renameCurrentSession: (name: string) => void;
  fetchConfig: () => Promise<void>;
  saveConfig: (cfg: OliConfig) => Promise<boolean>;
  resetUsage: () => void;
};

const AppContext = createContext<AppState | null>(null);

function now(): number {
  return Date.now();
}

function makeId(): string {
  return `${now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeConfig(base: OliConfig, patch: Partial<OliConfig>): OliConfig {
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && value !== null) next[key] = value;
  }
  return next as OliConfig;
}

function sessionLines(session?: Session): ChatLine[] {
  return buildTranscript(session?.messages ?? []);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<OliView>("chat");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const currentSessionIdRef = useRef<string>(currentSessionId);
  currentSessionIdRef.current = currentSessionId;
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [liveSegments, setLiveSegments] = useState<LiveSegment[]>([]);
  const [thinkingOpen, setThinkingOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [subAgents, setSubAgents] = useState<SubAgentRun[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [workspace, setWorkspaceState] = useState<WorkspaceState | null>(null);
  const [usage, setUsage] = useState({
    prompt_tokens: 0,
    completion_tokens: 0,
    estimated: false,
  });
  const [config, setConfig] = useState<OliConfig>(INITIAL_CONFIG);

  const liveSegmentsRef = useRef<LiveSegment[]>([]);
  const activeToolIds = useRef<string[]>([]);
  const turnStartedAtRef = useRef(0);

  const updateSegments = useCallback(
    (update: (prev: LiveSegment[]) => LiveSegment[]) => {
      const next = update(liveSegmentsRef.current);
      liveSegmentsRef.current = next;
      setLiveSegments(next);
    },
    [],
  );

  const clearLive = useCallback(() => {
    liveSegmentsRef.current = [];
    setLiveSegments([]);
  }, []);

  const commitAssistantLine = useCallback(
    (content: string, activity?: TurnActivity) => {
      if (!content) return;
      const line: ChatLine = {
        id: makeId(),
        role: "assistant",
        content,
        timestamp: now(),
        activity,
      };
      setMessages((m) => [...m, line]);
      const sid = currentSessionIdRef.current;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sid
            ? {
                ...s,
                messages: [...s.messages, line],
                msgCount: (s.msgCount ?? 0) + 1,
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleEvent = useCallback((ev: OliEvent) => {
    switch (ev.type) {
      case "text_chunk": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id!;
          setSubAgents((prev) =>
            prev.map((r) => {
              if (r.task_id !== taskId) return r;
              const msgs = [...r.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === "assistant") {
                msgs[msgs.length - 1] = {
                  ...last,
                  content: last.content + ev.data.text,
                };
              } else {
                msgs.push({
                  id: makeId(),
                  role: "assistant",
                  content: ev.data.text,
                  timestamp: now(),
                  subAgentId: taskId,
                  agentName: ev.data.agent_name,
                });
              }
              return { ...r, messages: msgs, activity: "streaming..." };
            }),
          );
          return;
        }
        setIsGenerating(true);
        updateSegments((prev) => appendText(prev, ev.data.text));
        setThinkingOpen(false);
        return;
      }
      case "thinking": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id!;
          setSubAgents((prev) =>
            prev.map((r) =>
              r.task_id === taskId ? { ...r, activity: "thinking..." } : r,
            ),
          );
          return;
        }
        updateSegments((prev) => appendThinking(prev, ev.data.text));
        return;
      }
      case "tool_call_executing": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id!;
          setSubAgents((prev) =>
            prev.map((r) =>
              r.task_id === taskId
                ? {
                    ...r,
                    activity: `calling ${ev.data.name}`,
                    toolCalls: [
                      ...r.toolCalls,
                      {
                        id: makeId(),
                        name: ev.data.name,
                        parameters: ev.data.parameters,
                        startTime: now(),
                      },
                    ],
                  }
                : r,
            ),
          );
          return;
        }
        setIsGenerating(true);
        {
          const call: ToolCall = {
            id: makeId(),
            name: ev.data.name,
            parameters: ev.data.parameters,
            startTime: now(),
          };
          activeToolIds.current.push(call.id);
          updateSegments((prev) => addTool(prev, call));
        }
        return;
      }
      case "tool_call_result": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id!;
          const name = ev.data.name;
          setSubAgents((prev) =>
            prev.map((r) => {
              if (r.task_id !== taskId) return r;
              const finishedAt = now();
              let patched = false;
              const toolCalls = r.toolCalls.map((c) => {
                if (patched || c.result !== undefined) return c;
                patched = true;
                return {
                  ...c,
                  result: ev.data.result,
                  elapsed: (finishedAt - c.startTime) / 1000,
                };
              });
              return { ...r, activity: `tool result: ${name}`, toolCalls };
            }),
          );
          return;
        }
        {
          const id = activeToolIds.current.shift();
          if (id !== undefined) {
            const finishedAt = now();
            updateSegments((prev) =>
              setToolResult(prev, id, ev.data.result, finishedAt),
            );
          }
        }
        return;
      }
      case "assistant_response": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id!;
          setSubAgents((prev) =>
            prev.map((r) =>
              r.task_id === taskId ? { ...r, activity: "streaming..." } : r,
            ),
          );
          return;
        }
        updateSegments((prev) => {
          const last = prev[prev.length - 1];
          const streamed =
            last?.kind === "text" && last.text.trim() !== "" ? prev : null;
          return sealText(
            streamed ?? appendText(prev, ev.data.content ?? ""),
          );
        });
        return;
      }
      case "usage": {
        setUsage((u) => ({
          prompt_tokens: u.prompt_tokens + ev.data.prompt_tokens,
          completion_tokens: u.completion_tokens + ev.data.completion_tokens,
          estimated: u.estimated || ev.data.estimated,
        }));
        return;
      }
      case "error": {
        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: "assistant",
            timestamp: now(),
            content: `\u2717 ${ev.data.message}`,
          },
        ]);
        clearLive();
        activeToolIds.current = [];
        setIsGenerating(false);
        return;
      }
      case "done": {
        const segments = liveSegmentsRef.current;
        const texts = collectText(segments);
        if (texts.length === 0 && ev.data.full_text) {
          texts.push(ev.data.full_text);
        }
        const elapsed = turnStartedAtRef.current
          ? (now() - turnStartedAtRef.current) / 1000
          : undefined;
        // The server records what happened during the turn; prefer it so a
        // reopened session renders exactly like the live one did.
        const recorded = ev.data.activity;
        const collected = collectActivity(segments, elapsed);
        let activity: TurnActivity | undefined = collected;
        if (
          recorded &&
          (recorded.thinking ||
            recorded.tool_calls?.length ||
            recorded.sub_agents?.length)
        ) {
          const converted = activityToTurnActivity(recorded);
          activity = {
            ...converted,
            toolCalls: converted.toolCalls.length
              ? converted.toolCalls
              : (collected?.toolCalls ?? []),
          };
        }
        texts.forEach((text, index) => {
          commitAssistantLine(
            text,
            index === texts.length - 1 ? activity : undefined,
          );
        });
        clearLive();
        setThinkingOpen(true);
        activeToolIds.current = [];
        setIsGenerating(false);
        if (texts.length > 0) {
          listSessions()
            .then(setSessions)
            .catch(() => {});
        }
        return;
      }
      case "session_created": {
        const session = sessionFromMeta(ev.data.session);
        setCurrentSessionId(session.id);
        setSessions((prev) =>
          prev.some((s) => s.id === session.id)
            ? prev.map((s) => (s.id === session.id ? session : s))
            : [session, ...prev],
        );
        return;
      }
      case "cleared": {
        setMessages([]);
        clearLive();
        setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
        setIsGenerating(false);
        activeToolIds.current = [];
        const sid = currentSessionIdRef.current;
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sid ? { ...s, messages: [], msgCount: 0 } : s,
          ),
        );
        listSessions()
          .then(setSessions)
          .catch(() => {});
        return;
      }
      case "connected":
        return;
      case "sub_agent_started": {
        setSubAgents((prev) => [
          ...prev,
          {
            task_id: ev.data.task_id,
            agent_name: ev.data.agent_name,
            pool_name: ev.data.pool_name,
            task: ev.data.task,
            status: "running",
            activity: "queued",
            messages: [],
            toolCalls: [],
          },
        ]);
        return;
      }
      case "sub_agent_progress": {
        setSubAgents((prev) =>
          prev.map((r) =>
            r.task_id === ev.data.task_id
              ? { ...r, status: ev.data.status, activity: ev.data.activity }
              : r,
          ),
        );
        return;
      }
      case "sub_agent_completed": {
        setSubAgents((prev) =>
          prev.map((r) =>
            r.task_id === ev.data.task_id
              ? {
                  ...r,
                  status: ev.data.status,
                  activity: ev.data.status,
                  ...(ev.data.todos ? { todos: ev.data.todos } : {}),
                }
              : r,
          ),
        );
        return;
      }
      case "todo": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id;
          setSubAgents((prev) =>
            prev.map((r) =>
              r.task_id === taskId ? { ...r, todos: ev.data.todos } : r,
            ),
          );
        } else {
          setTodos(ev.data.todos);
        }
        return;
      }
      default:
        return;
    }
  }, [updateSegments, clearLive, commitAssistantLine]);

  const { status, send, clear } = useOliSocket(handleEvent);

  const sendMessage = useCallback(
    (text: string, attachments: PendingAttachment[] = []) => {
      if ((!text.trim() && attachments.length === 0) || isGenerating) return;
      const userMsg: ChatLine = {
        id: makeId(),
        role: "user",
        content: text,
        timestamp: now(),
        attachments: attachments.length ? attachments : undefined,
      };
      setMessages((m) => [...m, userMsg]);
      const sid = currentSessionId;
      let autoName = "";
      const nameSource =
        text.trim() ||
        (attachments[0]?.name ? `[${attachments[0].name}]` : "");
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sid) return s;
          if ((s.msgCount ?? 0) === 0 && /^(untitled)?\s*$/i.test(s.name))
            autoName =
              nameSource.length > 40
                ? nameSource.slice(0, 40) + "\u2026"
                : nameSource;
          return {
            ...s,
            name: autoName || s.name,
            messages: [...s.messages, userMsg],
            msgCount: (s.msgCount ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          };
        }),
      );
      if (autoName)
        renameSession(sid, autoName).catch((e) =>
          console.error("Failed to auto-name session", e),
        );
      clearLive();
      activeToolIds.current = [];
      turnStartedAtRef.current = now();
      setIsGenerating(true);
      send({
        content: text,
        session_id: sid,
        attachments: toWireAttachments(attachments),
      });
    },
    [isGenerating, send, currentSessionId, clearLive],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    clearLive();
    setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
    activeToolIds.current = [];
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [] } : s)),
    );
    clear(currentSessionId);
  }, [clear, currentSessionId, clearLive]);

  const fetchProfiles = useCallback(async () => {
    try {
      setProfiles(await listProfilesApi());
      setProfileError(null);
    } catch (e) {
      console.error("Failed to fetch profiles from server", e);
    }
  }, []);

  // Switching profile changes the system prompt and tool permissions for the
  // shared server-side agent, so the conversation is cleared to avoid mixing
  // two personas in one thread — matching the TUI's `/profile load`.
  const selectProfile = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const active = await selectProfileApi(name);
        setProfiles((prev) =>
          prev.map((p) => ({ ...p, active: p.name === active.name })),
        );
        setConfig((prev) => ({ ...prev, api_profile: active.name }));
        setProfileError(null);
        clearChat();
        return true;
      } catch (e) {
        console.error(`Failed to select profile '${name}'`, e);
        setProfileError(
          e instanceof Error ? e.message : `Failed to select profile '${name}'`,
        );
        return false;
      }
    },
    [clearChat],
  );

  const newSession = useCallback(async () => {
    try {
      const fresh = await createSession();
      setSessions((prev) => [fresh, ...prev]);
      setCurrentSessionId(fresh.id);
      setMessages([]);
      clearLive();
      setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
      setTodos([]);
      setSubAgents([]);
      activeToolIds.current = [];
    } catch (e) {
      console.error("Failed to create session", e);
    }
  }, [clearLive]);

  const switchSession = useCallback(async (id: string) => {
    setCurrentSessionId(id);
    setMessages([]);
    clearLive();
    setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
    activeToolIds.current = [];
    try {
      const s = await getSession(id);
      setMessages(sessionLines(s));
      setTodos(s.todos ?? []);
      setSubAgents(collectSubAgents(s.messages));
    } catch (e) {
      console.error("Failed to load session", e);
    }
  }, [clearLive]);

  const removeSession = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
      } catch (e) {
        console.error("Failed to delete session", e);
        return;
      }
      let remaining = sessions.filter((x) => x.id !== id);
      if (remaining.length < sessions.length) setSessions(remaining);
      if (id === currentSessionId) {
        let next: Session | null = remaining[0] ?? null;
        if (!next) {
          try {
            next = await createSession();
            setSessions([next]);
            remaining = [next];
          } catch (e) {
            console.error("Failed to create session", e);
            return;
          }
        }
        // The session list only carries metadata, so fetch the transcript of
        // the session we are switching to.
        try {
          next = await getSession(next.id);
        } catch (e) {
          console.error("Failed to load session", e);
        }
        setCurrentSessionId(next.id);
        setMessages(sessionLines(next));
        setTodos(next.todos ?? []);
        setSubAgents(collectSubAgents(next.messages));
        clearLive();
        activeToolIds.current = [];
        setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
      }
    },
    [currentSessionId, sessions, clearLive],
  );

  const renameCurrentSession = useCallback(
    (name: string) => {
      const sid = currentSessionId;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sid && name.trim() ? { ...s, name: name.trim() } : s,
        ),
      );
      if (name.trim()) {
        renameSession(sid, name.trim()).catch((e) =>
          console.error("Failed to rename session", e),
        );
      }
    },
    [currentSessionId],
  );

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/v1/config");
      if (!res.ok) return;
      const data = (await res.json()) as Partial<OliConfig>;
      setConfig((prev) => mergeConfig(prev, data));
    } catch (e) {
      console.error("Failed to fetch config from server", e);
    }
  }, []);

  const saveConfig = useCallback(async (cfg: OliConfig): Promise<boolean> => {
    try {
      const res = await fetch("/v1/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as Partial<OliConfig>;
      setConfig((prev) => mergeConfig(prev, data));
      return true;
    } catch (e) {
      console.error("Failed to save config to server", e);
      return false;
    }
  }, []);

  const fetchMcpServers = useCallback(async () => {
    try {
      const res = await fetch("/v1/mcp");
      if (!res.ok) return;
      setMcpServers((await res.json()) as MCPServerConfig[]);
    } catch (e) {
      console.error("Failed to fetch MCP servers from server", e);
    }
  }, []);

  const addMcpServer = useCallback(
    async (cfg: MCPServerConfig): Promise<boolean> => {
      try {
        const res = await fetch("/v1/mcp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        });
        if (!res.ok) return false;
        setMcpServers((await res.json()) as MCPServerConfig[]);
        return true;
      } catch (e) {
        console.error("Failed to add MCP server", e);
        return false;
      }
    },
    [],
  );

  const updateMcpServer = useCallback(
    async (name: string, cfg: MCPServerConfig): Promise<boolean> => {
      try {
        const res = await fetch(`/v1/mcp/${encodeURIComponent(name)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        });
        if (!res.ok) return false;
        setMcpServers((await res.json()) as MCPServerConfig[]);
        return true;
      } catch (e) {
        console.error("Failed to update MCP server", e);
        return false;
      }
    },
    [],
  );

  const removeMcpServer = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const res = await fetch(`/v1/mcp/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        setMcpServers((await res.json()) as MCPServerConfig[]);
        return true;
      } catch (e) {
        console.error("Failed to remove MCP server", e);
        return false;
      }
    },
    [],
  );

  const fetchWorkspace = useCallback(async () => {
    try {
      setWorkspaceState(await fetchWorkspaceApi());
    } catch (e) {
      console.error("Failed to fetch workspace from server", e);
    }
  }, []);

  const setWorkspace = useCallback(async (path: string): Promise<boolean> => {
    try {
      setWorkspaceState(await setWorkspaceApi(path));
      return true;
    } catch (e) {
      console.error("Failed to set workspace on server", e);
      return false;
    }
  }, []);

  const unsetWorkspace = useCallback(async () => {
    try {
      setWorkspaceState(await unsetWorkspaceApi());
    } catch (e) {
      console.error("Failed to clear workspace on server", e);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let list: Session[] = [];
      try {
        list = await listSessions();
      } catch (e) {
        console.error("Failed to list sessions", e);
      }
      if (cancelled) return;
      setSessions(list);
      try {
        const fresh = await createSession();
        if (cancelled) return;
        setSessions((prev) => [fresh, ...prev]);
        setCurrentSessionId(fresh.id);
      } catch (e) {
        console.error("Failed to create session", e);
        const ephemeral: Session = {
          id: `local-${Date.now().toString(36)}`,
          name: "untitled",
          messages: [],
          createdAt: new Date().toISOString(),
        };
        setSessions((prev) => (prev.length ? prev : [ephemeral]));
        setCurrentSessionId((prev) => prev || ephemeral.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const resetUsage = useCallback(
    () =>
      setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false }),
    [],
  );

  const value = useMemo(
    () => ({
      view,
      status,
      messages,
      liveSegments,
      thinkingOpen,
      isGenerating,
      sessions,
      currentSessionId,
      subAgents,
      todos,
      usage,
      config,
      mcpServers,
      profiles,
      profileError,
      fetchProfiles,
      selectProfile,
      workspace,
      fetchWorkspace,
      setWorkspace,
      unsetWorkspace,
      fetchMcpServers,
      addMcpServer,
      updateMcpServer,
      removeMcpServer,
      collapseThinking: setThinkingOpen,
      setView,
      sendMessage,
      clearChat,
      newSession,
      switchSession,
      removeSession,
      renameCurrentSession,
      fetchConfig,
      saveConfig,
      resetUsage,
    }),
    [
      view,
      status,
      messages,
      liveSegments,
      thinkingOpen,
      isGenerating,
      sessions,
      currentSessionId,
      subAgents,
      todos,
      usage,
      config,
      mcpServers,
      profiles,
      profileError,
      fetchProfiles,
      selectProfile,
      workspace,
      fetchWorkspace,
      setWorkspace,
      unsetWorkspace,
      fetchMcpServers,
      addMcpServer,
      updateMcpServer,
      removeMcpServer,
      sendMessage,
      clearChat,
      newSession,
      switchSession,
      removeSession,
      renameCurrentSession,
      fetchConfig,
      saveConfig,
      resetUsage,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
