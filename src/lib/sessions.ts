import { Session } from "../types";

const STORAGE_KEY = "oli_sessions";

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function listSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export function getSession(id: string): Session | undefined {
  return listSessions().find((s) => s.id === id);
}

export function saveSession(session: Session): Session {
  const sessions = listSessions();
  const existing = sessions.findIndex((s) => s.id === session.id);
  if (existing >= 0) {
    sessions[existing] = { ...sessions[existing], ...session };
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return session;
}

export function deleteSession(id: string): void {
  const sessions = listSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function renameSession(id: string, name: string): void {
  const sessions = listSessions();
  const s = sessions.find((x) => x.id === id);
  if (s) {
    s.name = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
}

export function createSession(serverUrl: string = ""): Session {
  return {
    id: generateId(),
    name: new Date().toLocaleString(),
    messages: [],
    createdAt: Date.now(),
    serverUrl,
  };
}
