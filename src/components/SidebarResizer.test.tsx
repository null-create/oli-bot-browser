import { cleanup, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarResizer } from "./SidebarResizer";
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "../hooks/useSidebarLayout";

function setup(width = 256) {
  const shellRef = createRef<HTMLDivElement>();
  const onResize = vi.fn();
  const onReset = vi.fn();
  const onCollapse = vi.fn();
  render(
    <div ref={shellRef}>
      <SidebarResizer
        width={width}
        shellRef={shellRef}
        onResize={onResize}
        onReset={onReset}
        onCollapse={onCollapse}
      />
    </div>,
  );
  const handle = document.querySelector('[role="separator"]') as HTMLElement;
  return { shellRef, onResize, onReset, onCollapse, handle };
}

afterEach(cleanup);

describe("SidebarResizer", () => {
  it("exposes separator semantics with the current width", () => {
    const { handle } = setup(300);
    expect(handle.getAttribute("aria-orientation")).toBe("vertical");
    expect(handle.getAttribute("aria-valuenow")).toBe("300");
    expect(handle.getAttribute("aria-valuemin")).toBe(String(SIDEBAR_MIN_WIDTH));
    expect(handle.getAttribute("aria-valuemax")).toBe(String(SIDEBAR_MAX_WIDTH));
  });

  it("resizes with arrow keys", () => {
    const { onResize, handle } = setup(256);
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(onResize).toHaveBeenLastCalledWith(272);
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(onResize).toHaveBeenLastCalledWith(240);
  });

  it("jumps to the bounds with Home/End and collapses on Enter", () => {
    const { onResize, onCollapse, handle } = setup(256);
    fireEvent.keyDown(handle, { key: "Home" });
    expect(onResize).toHaveBeenLastCalledWith(SIDEBAR_MIN_WIDTH);
    fireEvent.keyDown(handle, { key: "End" });
    expect(onResize).toHaveBeenLastCalledWith(SIDEBAR_MAX_WIDTH);
    fireEvent.keyDown(handle, { key: "Enter" });
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it("resets on double-click", () => {
    const { onReset, handle } = setup(256);
    fireEvent.doubleClick(handle);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("drags to a new width and commits on release", () => {
    const { shellRef, onResize, handle } = setup(256);
    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 140, pointerId: 1 });
    expect(shellRef.current?.style.getPropertyValue("--sidebar-w")).toBe("296px");
    fireEvent.pointerUp(handle, { clientX: 140, pointerId: 1 });
    expect(onResize).toHaveBeenCalledWith(296);
  });
});
