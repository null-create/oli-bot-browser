import { ProfileInfo } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function listProfiles(): Promise<ProfileInfo[]> {
  return request<ProfileInfo[]>("/v1/profiles");
}

export async function selectProfile(name: string): Promise<ProfileInfo> {
  return request<ProfileInfo>(`/v1/profiles/${encodeURIComponent(name)}`, {
    method: "PUT",
  });
}
