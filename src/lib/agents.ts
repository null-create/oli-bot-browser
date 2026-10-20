import { AgentPoolConfig } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function listAgents(): Promise<AgentPoolConfig> {
  return request<AgentPoolConfig>("/v1/agents");
}
