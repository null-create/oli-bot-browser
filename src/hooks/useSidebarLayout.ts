import { useCallback, useEffect, useState } from "react";

export const SIDEBAR_WIDTH_KEY = "oli-sidebar-width";
export const SIDEBAR_COLLAPSED_KEY = "oli-sidebar-collapsed";

export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 480;
export const SIDEBAR_DEFAULT_WIDTH = 256;

export type SidebarLayout = {
  width: number;
  setWidth: (px: number) => void;
  collapsed: boolean;
  collapse: () => void;
  expand: () => void;
  toggle: () => void;
  reset: () => void;
};

export function clampSidebarWidth(px: number): number {
  if (!Number.isFinite(px)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(px)));
}

function readWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (raw !== null) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) return clampSidebarWidth(parsed);
    }
  } catch {
    // localStorage can be unavailable in private modes; fall back silently.
  }
  return SIDEBAR_DEFAULT_WIDTH;
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Persisting is best-effort; the layout still applies for this session.
  }
}

export function useSidebarLayout(): SidebarLayout {
  const [width, setWidthState] = useState(readWidth);
  const [collapsed, setCollapsedState] = useState(readCollapsed);

  useEffect(() => {
    writeStored(SIDEBAR_WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    writeStored(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false");
  }, [collapsed]);

  const setWidth = useCallback((px: number) => {
    setWidthState(clampSidebarWidth(px));
  }, []);

  const collapse = useCallback(() => setCollapsedState(true), []);
  const expand = useCallback(() => setCollapsedState(false), []);
  const toggle = useCallback(() => setCollapsedState((c) => !c), []);
  const reset = useCallback(() => {
    setWidthState(SIDEBAR_DEFAULT_WIDTH);
    setCollapsedState(false);
  }, []);

  return { width, setWidth, collapsed, collapse, expand, toggle, reset };
}
