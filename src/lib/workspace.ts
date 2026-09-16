import { DirectoryListing, WorkspaceState } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function listDirectory(path: string): Promise<DirectoryListing> {
  return request<DirectoryListing>(
    `/v1/fs/list?path=${encodeURIComponent(path)}`,
  );
}

export async function fetchWorkspace(): Promise<WorkspaceState> {
  return request<WorkspaceState>("/v1/workspace");
}

export async function setWorkspace(path: string): Promise<WorkspaceState> {
  return request<WorkspaceState>("/v1/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}

export async function unsetWorkspace(): Promise<WorkspaceState> {
  return request<WorkspaceState>("/v1/workspace", {
    method: "DELETE",
  });
}