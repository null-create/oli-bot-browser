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
  openai_vision_style: string;
  openai_optional_headers: Record<string, unknown>;
  ollama_base_url: string;
  ollama_model: string;
  ollama_small_model: string;
  huggingface_base_url: string;
  huggingface_api_key: string;
  huggingface_model: string;
  huggingface_small_model: string;
  huggingface_remote: boolean;
  transformers_model: string;
  transformers_small_model: string;
  transformers_device: string;
  transformers_dtype: string;
  transformers_is_multi_model: boolean;
  voice_whisper_model: string;
  voice_piper_model: string;
  voice_sample_rate: number;
  voice_frame_duration_ms: number;
  voice_vad_aggressiveness: number;
  voice_silence_timeout_ms: number;
  voice_max_record_seconds: number;
  max_tokens: number;
  temperature: number;
  max_retries: number;
  retry_delay: number;
  request_timeout: number;
  max_messages: number;
  max_tool_iterations: number;
  stream_timeout: number;
  model_filters: string;
  truncation_max_chars_small: number;
  truncation_max_chars_large: number;
  dry_run: boolean;
  offline_mode: boolean;
  use_agent_pool: boolean;
  agent_pool_size: number;
  log_level: string;
  log_file: string;
  profiles_dir: string;
  logs_dir: string;
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
  openai_vision_style: "openai",
  openai_optional_headers: {},
  ollama_base_url: "http://localhost:11434",
  ollama_model: "",
  ollama_small_model: "",
  huggingface_base_url: "https://api-inference.huggingface.co",
  huggingface_api_key: "",
  huggingface_model: "",
  huggingface_small_model: "",
  huggingface_remote: false,
  transformers_model: "",
  transformers_small_model: "",
  transformers_device: "auto",
  transformers_dtype: "auto",
  transformers_is_multi_model: false,
  voice_whisper_model: "base",
  voice_piper_model: "en_US-lessac-medium.onnx",
  voice_sample_rate: 16000,
  voice_frame_duration_ms: 30,
  voice_vad_aggressiveness: 2,
  voice_silence_timeout_ms: 800,
  voice_max_record_seconds: 15,
  max_tokens: 2048,
  temperature: 0.7,
  max_retries: 3,
  retry_delay: 1.0,
  request_timeout: 30.0,
  max_messages: 100,
  max_tool_iterations: 25,
  stream_timeout: 240.0,
  model_filters: "",
  truncation_max_chars_small: 4000,
  truncation_max_chars_large: 100000,
  dry_run: false,
  offline_mode: true,
  use_agent_pool: false,
  agent_pool_size: 5,
  log_level: "INFO",
  log_file: "logs/backend.ndjson",
  profiles_dir: "profiles",
  logs_dir: "logs",
  api_host: "0.0.0.0",
  api_port: 9734,
  api_profile: "default",
  api_mode: "agent",
};
