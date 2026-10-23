import { DirectoryListing, WorkspaceState } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body?.detail === "string") detail = body.detail.trim();
    } catch {
      // Non-JSON error bodies fall back to the status line.
    }
    throw new Error(detail || `${res.status} ${res.statusText}`);
  }
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