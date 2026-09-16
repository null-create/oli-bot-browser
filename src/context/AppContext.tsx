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
  MCPServerConfig,
  OliConfig,
  OliEvent,
  OliView,
  Session,
  SubAgentRun,
  TodoItem,
  INITIAL_CONFIG,
} from "../types";

type ChatLine = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type AppState = {
  view: OliView;
  status: WsStatus;
  messages: ChatLine[];
  pendingText: string;
  pendingThinking: string;
  thinkingOpen: boolean;
  isGenerating: boolean;
  activeToolCalls: Map<number, string>;
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
  fetchMcpServers: () => Promise<void>;
  addMcpServer: (cfg: MCPServerConfig) => Promise<boolean>;
  updateMcpServer: (name: string, cfg: MCPServerConfig) => Promise<boolean>;
  removeMcpServer: (name: string) => Promise<boolean>;
  collapseThinking: (open: boolean) => void;
  setView: (view: OliView) => void;
  sendMessage: (text: string) => void;
  runCommand: (text: string) => boolean;
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

function visibleLines(session?: Session): ChatLine[] {
  return (session?.messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.subAgentId ? m.subAgentId : m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: m.timestamp,
    }));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<OliView>("chat");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const currentSessionIdRef = useRef<string>(currentSessionId);
  currentSessionIdRef.current = currentSessionId;
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [pendingText, setPendingText] = useState("");
  const [pendingThinking, setPendingThinking] = useState("");
  const [thinkingOpen, setThinkingOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<Map<number, string>>(
    new Map(),
  );
  const [subAgents, setSubAgents] = useState<SubAgentRun[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServerConfig[]>([]);
  const [usage, setUsage] = useState({
    prompt_tokens: 0,
    completion_tokens: 0,
    estimated: false,
  });
  const [config, setConfig] = useState<OliConfig>(INITIAL_CONFIG);

  const pendingTextRef = useRef("");
  const pendingToolStart = useRef<number>(0);
  const activeToolQueue = useRef<number[]>([]);

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
        pendingTextRef.current += ev.data.text;
        setPendingText(pendingTextRef.current);
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
        setPendingThinking((t) => t + ev.data.text);
        return;
      }
      case "tool_call_executing": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id!;
          const name = ev.data.name;
          setSubAgents((prev) =>
            prev.map((r) =>
              r.task_id === taskId ? { ...r, activity: `calling ${name}` } : r,
            ),
          );
          return;
        }
        setIsGenerating(true);
        pendingToolStart.current = now();
        {
          const startedAt = pendingToolStart.current;
          activeToolQueue.current.push(startedAt);
          setActiveToolCalls((prev) => {
            const next = new Map(prev);
            next.set(startedAt, ev.data.name);
            return next;
          });
        }
        return;
      }
      case "tool_call_result": {
        if (ev.data.task_id) {
          const taskId = ev.data.task_id!;
          const name = ev.data.name;
          setSubAgents((prev) =>
            prev.map((r) =>
              r.task_id === taskId
                ? {
                    ...r,
                    activity: `tool result: ${name}`,
                    toolCalls: [
                      ...r.toolCalls,
                      {
                        name,
                        parameters: {},
                        startTime: 0,
                        result: ev.data.result,
                        elapsed: 0,
                      },
                    ],
                  }
                : r,
            ),
          );
          return;
        }
        {
          const startedAt = activeToolQueue.current.shift();
          if (startedAt !== undefined) {
            setActiveToolCalls((prev) => {
              if (!prev.has(startedAt)) return prev;
              const next = new Map(prev);
              next.delete(startedAt);
              return next;
            });
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
        if (ev.data.content && !pendingTextRef.current) {
          pendingTextRef.current = ev.data.content;
          setPendingText(pendingTextRef.current);
        }
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
        pendingTextRef.current = "";
        setPendingText("");
        setIsGenerating(false);
        return;
      }
      case "done": {
        if (ev.data.full_text) {
          const text =
            pendingTextRef.current &&
            pendingTextRef.current !== ev.data.full_text
              ? pendingTextRef.current + ev.data.full_text
              : ev.data.full_text;
          const line: ChatLine = {
            id: makeId(),
            role: "assistant",
            content: text,
            timestamp: now(),
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
          listSessions()
            .then(setSessions)
            .catch(() => {});
        }
        pendingTextRef.current = "";
        setPendingText("");
        setPendingThinking("");
        setThinkingOpen(true);
        activeToolQueue.current = [];
        setActiveToolCalls(new Map());
        setIsGenerating(false);
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
        pendingTextRef.current = "";
        setPendingText("");
        setPendingThinking("");
        setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
        setIsGenerating(false);
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
              ? { ...r, status: ev.data.status, activity: ev.data.status }
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
  }, []);

  const { status, send, clear } = useOliSocket(handleEvent);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isGenerating) return;
      const userMsg: ChatLine = {
        id: makeId(),
        role: "user",
        content: text,
        timestamp: now(),
      };
      setMessages((m) => [...m, userMsg]);
      const sid = currentSessionId;
      let autoName = "";
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sid) return s;
          if ((s.msgCount ?? 0) === 0 && /^(untitled)?\s*$/i.test(s.name))
            autoName = text.length > 40 ? text.slice(0, 40) + "\u2026" : text;
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
      pendingTextRef.current = "";
      setPendingText("");
      setPendingThinking("");
      setIsGenerating(true);
      send({ content: text, session_id: sid });
    },
    [isGenerating, send, currentSessionId],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    pendingTextRef.current = "";
    setPendingText("");
    setPendingThinking("");
    setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, messages: [] } : s)),
    );
    clear(currentSessionId);
  }, [clear, currentSessionId]);

  const runCommand = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed.startsWith("/")) return false;
      const cmd = trimmed.split(/\s+/)[0].toLowerCase();
      switch (cmd) {
        case "/clear":
          clearChat();
          return true;
        case "/config":
          setView("config");
          return true;
        case "/sessions":
          setView("sessions");
          return true;
        case "/todos":
          setView("todos");
          return true;
        case "/subagents":
          setView("subagents");
          return true;
        case "/mcp":
          setView("mcp");
          fetchMcpServers();
          return true;
        case "/help": {
          setMessages((m) => [
            ...m,
            {
              id: makeId(),
              role: "assistant",
              timestamp: now(),
              content:
                "**oli commands**\n\n" +
                "- `/clear` — clear the conversation\n" +
                "- `/config` — open the config view\n" +
                "- `/sessions` — open the sessions view\n" +
                "- `/todos` — open the to-do view\n" +
                "- `/subagents` — open the sub-agents view\n" +
                "- `/mcp` — open the MCP server configuration view\n\n" +
                "Any other command (`/model`, `/servers`, …) is sent to the agent.",
            },
          ]);
          return true;
        }
        default:
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
      pendingTextRef.current = "";
      setPendingText("");
      setPendingThinking("");
      setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
    } catch (e) {
      console.error("Failed to create session", e);
    }
  }, []);

  const switchSession = useCallback(async (id: string) => {
    setCurrentSessionId(id);
    setMessages([]);
    pendingTextRef.current = "";
    setPendingText("");
    setPendingThinking("");
    setUsage({ prompt_tokens: 0, completion_tokens: 0, estimated: false });
    try {
      const s = await getSession(id);
      setMessages(visibleLines(s));
    } catch (e) {
      console.error("Failed to load session", e);
    }
  }, []);

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
        setCurrentSessionId(next.id);
        setMessages(visibleLines(next));
      }
    },
    [currentSessionId, sessions],
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
      const data = (await res.json()) as OliConfig;
      setConfig((prev) => ({ ...prev, ...data }));
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
      const data = (await res.json()) as OliConfig;
      setConfig(data);
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

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

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
      pendingText,
      pendingThinking,
      thinkingOpen,
      isGenerating,
      activeToolCalls,
      sessions,
      currentSessionId,
      subAgents,
      todos,
      usage,
      config,
      mcpServers,
      fetchMcpServers,
      addMcpServer,
      updateMcpServer,
      removeMcpServer,
      collapseThinking: setThinkingOpen,
      setView,
      sendMessage,
      runCommand,
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
      pendingText,
      pendingThinking,
      thinkingOpen,
      isGenerating,
      activeToolCalls,
      sessions,
      currentSessionId,
      subAgents,
      todos,
      usage,
      config,
      mcpServers,
      fetchMcpServers,
      addMcpServer,
      updateMcpServer,
      removeMcpServer,
      sendMessage,
      runCommand,
      clearChat,
      newSession,
      switchSession,
      removeSession,
      renameCurrentSession,
      fetchConfig,
      saveConfig,
      fetchMcpServers,
      addMcpServer,
      updateMcpServer,
      removeMcpServer,
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
