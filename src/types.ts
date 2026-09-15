export type OliEvent =
  | { type: "connected"; data: Record<string, never> }
  | { type: "text_chunk"; data: { text: string; task_id?: string; agent_name?: string } }
  | { type: "thinking"; data: { text: string; task_id?: string; agent_name?: string } }
  | {
      type: "tool_call_executing";
      data: {
        name: string;
        parameters: Record<string, unknown>;
        task_id?: string;
        agent_name?: string;
      };
    }
  | {
      type: "tool_call_result";
      data: { name: string; result: string; task_id?: string; agent_name?: string };
    }
  | {
      type: "assistant_response";
      data: { content: string; task_id?: string; agent_name?: string };
    }
  | {
      type: "usage";
      data: {
        prompt_tokens: number;
        completion_tokens: number;
        estimated: boolean;
      };
    }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data: { full_text: string } }
  | { type: "cleared"; data: Record<string, never> }
  | {
      type: "sub_agent_started";
      data: {
        task_id: string;
        agent_name: string;
        pool_name: string;
        task: string;
      };
    }
  | {
      type: "sub_agent_progress";
      data: {
        task_id: string;
        agent_name: string;
        activity: string;
        status: "running" | "done" | "error";
      };
    }
  | {
      type: "sub_agent_completed";
      data: {
        task_id: string;
        agent_name: string;
        status: "done" | "error";
        full_text: string;
      };
    }
  | {
      type: "todo";
      data: { todos: TodoItem[]; task_id?: string; agent_name?: string };
    };

export type OliView = "chat" | "config" | "sessions" | "subagents" | "todos";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  subAgentId?: string;
  agentName?: string;
};

export type PendingToolCall = {
  name: string;
  parameters: Record<string, unknown>;
  startTime: number;
  task_id?: string;
  agent_name?: string;
};

export type FinishedToolCall = PendingToolCall & {
  result: string;
  elapsed: number;
};

export type SubAgentRun = {
  task_id: string;
  agent_name: string;
  pool_name: string;
  task: string;
  status: "running" | "done" | "error";
  activity: string;
  messages: ChatMessage[];
  toolCalls: FinishedToolCall[];
  todos?: TodoItem[];
};

export type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
};

export type Session = {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  serverUrl: string;
  totalTokens?: number;
};

export type OliConfig = {
  backend: string;
  openai_api_key: string;
  openai_base_url: string;
  openai_model: string;
  openai_small_model: string;
  ollama_base_url: string;
  ollama_model: string;
  ollama_small_model: string;
  max_tokens: number;
  temperature: number;
  max_tool_iterations: number;
  offline_mode: boolean;
  dry_run: boolean;
  use_agent_pool: boolean;
  log_level: string;
  api_host: string;
  api_port: number;
  api_profile: string;
  api_mode: string;
};

export const COMMANDS = [
  "/help",
  "/clear",
  "/models",
  "/model",
  "/config",
  "/servers",
  "/mode",
  "/profile",
  "/context",
  "/mcp",
  "/sessions",
  "/workspace",
  "/home",
  "/offline",
  "/dry-run",
  "/voice",
] as const;

export const INITIAL_CONFIG: OliConfig = {
  backend: "ollama",
  openai_api_key: "",
  openai_base_url: "https://api.openai.com/v1",
  openai_model: "",
  openai_small_model: "",
  ollama_base_url: "http://localhost:11434",
  ollama_model: "",
  ollama_small_model: "",
  max_tokens: 2048,
  temperature: 0.7,
  max_tool_iterations: 25,
  offline_mode: true,
  dry_run: false,
  use_agent_pool: false,
  log_level: "INFO",
  api_host: "0.0.0.0",
  api_port: 9734,
  api_profile: "default",
  api_mode: "agent",
};
