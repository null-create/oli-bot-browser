import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH_KEY,
  clampSidebarWidth,
  useSidebarLayout,
} from "./useSidebarLayout";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("clampSidebarWidth", () => {
  it("clamps to the min and max bounds", () => {
    expect(clampSidebarWidth(10)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(10_000)).toBe(SIDEBAR_MAX_WIDTH);
    expect(clampSidebarWidth(300)).toBe(300);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_DEFAULT_WIDTH);
  });
});

describe("useSidebarLayout", () => {
  it("starts with the default width, expanded", () => {
    const { result } = renderHook(() => useSidebarLayout());
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(result.current.collapsed).toBe(false);
  });

  it("reads persisted width and collapsed state", () => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, "320");
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
    const { result } = renderHook(() => useSidebarLayout());
    expect(result.current.width).toBe(320);
    expect(result.current.collapsed).toBe(true);
  });

  it("ignores a corrupt persisted width", () => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, "not-a-number");
    const { result } = renderHook(() => useSidebarLayout());
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it("clamps setWidth and persists it", () => {
    const { result } = renderHook(() => useSidebarLayout());
    act(() => result.current.setWidth(5));
    expect(result.current.width).toBe(SIDEBAR_MIN_WIDTH);
    expect(localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe(String(SIDEBAR_MIN_WIDTH));

    act(() => result.current.setWidth(9999));
    expect(result.current.width).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("toggles, collapses, expands and resets", () => {
    const { result } = renderHook(() => useSidebarLayout());

    act(() => result.current.toggle());
    expect(result.current.collapsed).toBe(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe("true");

    act(() => result.current.expand());
    expect(result.current.collapsed).toBe(false);

    act(() => result.current.collapse());
    act(() => result.current.setWidth(400));
    act(() => result.current.reset());
    expect(result.current.collapsed).toBe(false);
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it("falls back silently when localStorage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const { result } = renderHook(() => useSidebarLayout());
    expect(result.current.width).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(result.current.collapsed).toBe(false);
    act(() => result.current.setWidth(300));
    expect(result.current.width).toBe(300);
  });
});
