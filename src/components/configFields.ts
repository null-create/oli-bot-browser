import { OliConfig } from "../types";

export type Field = {
  key: keyof OliConfig;
  label: string;
  type?: "text" | "number" | "toggle" | "json";
  group: string;
};

export const FIELDS: Field[] = [
  { key: "backend", label: "backend", group: "Backend" },

  { key: "openai_api_key", label: "openai api key", group: "OpenAI" },
  { key: "openai_base_url", label: "openai base url", group: "OpenAI" },
  { key: "openai_model", label: "openai model", group: "OpenAI" },
  { key: "openai_small_model", label: "openai small model", group: "OpenAI" },
  { key: "openai_vision_style", label: "openai vision style", group: "OpenAI" },
  {
    key: "openai_optional_headers",
    label: "openai optional headers",
    type: "json",
    group: "OpenAI",
  },
  {
    key: "openai_responses_enabled",
    label: "responses api",
    type: "toggle",
    group: "OpenAI",
  },

  { key: "ollama_base_url", label: "ollama base url", group: "Ollama" },
  { key: "ollama_model", label: "ollama model", group: "Ollama" },
  { key: "ollama_small_model", label: "ollama small model", group: "Ollama" },
  {
    key: "ollama_context_window",
    label: "context window",
    type: "number",
    group: "Ollama",
  },

  {
    key: "huggingface_base_url",
    label: "huggingface base url",
    group: "HuggingFace",
  },
  {
    key: "huggingface_api_key",
    label: "huggingface api key",
    group: "HuggingFace",
  },
  {
    key: "huggingface_model",
    label: "huggingface model",
    group: "HuggingFace",
  },
  {
    key: "huggingface_small_model",
    label: "huggingface small model",
    group: "HuggingFace",
  },
  {
    key: "huggingface_remote",
    label: "huggingface remote",
    type: "toggle",
    group: "HuggingFace",
  },

  {
    key: "transformers_model",
    label: "transformers model",
    group: "Transformers",
  },
  {
    key: "transformers_small_model",
    label: "transformers small model",
    group: "Transformers",
  },
  {
    key: "transformers_device",
    label: "transformers device",
    group: "Transformers",
  },
  {
    key: "transformers_dtype",
    label: "transformers dtype",
    group: "Transformers",
  },
  {
    key: "transformers_is_multi_model",
    label: "transformers is multi model",
    type: "toggle",
    group: "Transformers",
  },

  {
    key: "max_tokens",
    label: "max tokens",
    type: "number",
    group: "Generation",
  },
  {
    key: "temperature",
    label: "temperature",
    type: "number",
    group: "Generation",
  },
  {
    key: "max_retries",
    label: "max retries",
    type: "number",
    group: "Generation",
  },
  {
    key: "retry_delay",
    label: "retry delay",
    type: "number",
    group: "Generation",
  },
  {
    key: "request_timeout",
    label: "request timeout",
    type: "number",
    group: "Generation",
  },
  {
    key: "stream_timeout",
    label: "stream timeout",
    type: "number",
    group: "Generation",
  },
  {
    key: "first_chunk_timeout",
    label: "first chunk timeout",
    type: "number",
    group: "Generation",
  },

  {
    key: "max_messages",
    label: "max messages",
    type: "number",
    group: "Agent",
  },
  {
    key: "max_tool_iterations",
    label: "max tool iterations",
    type: "number",
    group: "Agent",
  },
  {
    key: "offline_mode",
    label: "offline mode",
    type: "toggle",
    group: "Agent",
  },
  { key: "dry_run", label: "dry run", type: "toggle", group: "Agent" },
  { key: "model_filters", label: "model filters", group: "Agent" },
  {
    key: "truncation_max_chars_small",
    label: "truncation small",
    type: "number",
    group: "Agent",
  },
  {
    key: "truncation_max_chars_large",
    label: "truncation large",
    type: "number",
    group: "Agent",
  },

  {
    key: "use_oauth",
    label: "oauth for http mcp",
    type: "toggle",
    group: "OAuth",
  },

  {
    key: "use_agent_pool",
    label: "use agent pool",
    type: "toggle",
    group: "Agent Pool",
  },
  {
    key: "agent_pool_size",
    label: "agent pool size",
    type: "number",
    group: "Agent Pool",
  },
  { key: "agents_yaml", label: "agents.yaml path", group: "Agent Pool" },

  {
    key: "voice_whisper_model",
    label: "whisper model",
    group: "Voice",
  },
  { key: "voice_piper_model", label: "piper model", group: "Voice" },
  {
    key: "voice_sample_rate",
    label: "sample rate",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_frame_duration_ms",
    label: "frame duration ms",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_vad_aggressiveness",
    label: "vad aggressiveness",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_silence_timeout_ms",
    label: "silence timeout ms",
    type: "number",
    group: "Voice",
  },
  {
    key: "voice_max_record_seconds",
    label: "max record seconds",
    type: "number",
    group: "Voice",
  },

  { key: "log_level", label: "log level", group: "Logging" },
  { key: "log_file", label: "log file", group: "Logging" },

  { key: "api_host", label: "api host", group: "API Server" },
  { key: "api_port", label: "api port", type: "number", group: "API Server" },
  { key: "api_profile", label: "api profile", group: "API Server" },
  { key: "api_mode", label: "api mode", group: "API Server" },

  {
    key: "default_profile",
    label: "default profile",
    group: "Session & Workspace",
  },
  {
    key: "session_auto_save",
    label: "auto save sessions",
    type: "toggle",
    group: "Session & Workspace",
  },
  {
    key: "session_resume_prompt",
    label: "resume prompt",
    type: "toggle",
    group: "Session & Workspace",
  },
  {
    key: "workspace_max_workspaces",
    label: "max workspaces",
    type: "number",
    group: "Session & Workspace",
  },

  { key: "profiles_dir", label: "profiles dir", group: "System" },
  { key: "logs_dir", label: "logs dir", group: "System" },
];

export function groupFields(fields: Field[]): Map<string, Field[]> {
  const groups = new Map<string, Field[]>();
  for (const f of fields) {
    const list = groups.get(f.group) || [];
    list.push(f);
    groups.set(f.group, list);
  }
  return groups;
}
