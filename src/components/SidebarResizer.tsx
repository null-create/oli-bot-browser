import { useRef } from "react";
import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  clampSidebarWidth,
} from "../hooks/useSidebarLayout";

const STEP = 16;

type Props = {
  width: number;
  shellRef: React.RefObject<HTMLElement | null>;
  onResize: (px: number) => void;
  onReset: () => void;
  onCollapse: () => void;
};

export function SidebarResizer({
  width,
  shellRef,
  onResize,
  onReset,
  onCollapse,
}: Props) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  const finish = () => {
    dragging.current = false;
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
    const el = shellRef.current;
    if (!el) return;
    const live = Number.parseInt(
      el.style.getPropertyValue("--sidebar-w"),
      10,
    );
    if (Number.isFinite(live)) onResize(live);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // jsdom and older browsers may not implement pointer capture.
    }
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const next = clampSidebarWidth(startWidth.current + (e.clientX - startX.current));
    shellRef.current?.style.setProperty("--sidebar-w", `${next}px`);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    finish();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        onResize(width - STEP);
        break;
      case "ArrowRight":
        e.preventDefault();
        onResize(width + STEP);
        break;
      case "Home":
        e.preventDefault();
        onResize(SIDEBAR_MIN_WIDTH);
        break;
      case "End":
        e.preventDefault();
        onResize(SIDEBAR_MAX_WIDTH);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onCollapse();
        break;
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className="group relative z-10 hidden w-px shrink-0 cursor-col-resize touch-none select-none bg-oli-line hover:bg-oli-accent focus:bg-oli-accent focus:outline-none md:block"
    >
      <span aria-hidden="true" className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
