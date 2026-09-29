import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export function ThemeMenu() {
  const { theme, themes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeIdx = themes.findIndex((t) => t.id === theme);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelectedIdx(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const pick = useCallback(
    (id: (typeof themes)[number]["id"]) => {
      setOpen(false);
      setSelectedIdx(-1);
      if (id !== theme) setTheme(id);
    },
    [theme, setTheme],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % themes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i <= 0 ? themes.length - 1 : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedIdx(themes.length - 1);
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      pick(themes[selectedIdx].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setSelectedIdx(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change the colour theme"
        className={`flex cursor-pointer items-center gap-1 hover:text-oli-fg ${
          open ? "text-oli-accent" : "text-oli-muted"
        }`}
      >
        <span
          data-theme={theme}
          aria-hidden="true"
          className="flex h-2.5 w-2.5 shrink-0 overflow-hidden border border-oli-line"
        >
          <span className="h-full w-1/2 bg-oli-accent" />
          <span className="h-full w-1/2 bg-oli-bg" />
        </span>
        <ChevronDown size={10} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Colour theme"
          className="absolute top-full right-0 z-50 mt-1 max-h-72 w-56 overflow-y-auto border border-oli-line-strong bg-oli-elevated shadow-lg"
        >
          {themes.map((t, i) => {
            const isActive = t.id === theme;
            return (
              <div
                key={t.id}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(t.id);
                }}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`flex cursor-pointer items-start gap-1.5 px-2 py-1.5 text-[11px] ${
                  i === selectedIdx ? "bg-oli-selected" : ""
                }`}
              >
                <span className="w-[0.6rem] shrink-0 text-oli-accent">
                  {isActive ? "▸" : ""}
                </span>
                <span
                  data-theme={t.id}
                  className="mt-[1px] flex h-3 w-3 shrink-0 overflow-hidden border border-oli-line"
                >
                  <span className="h-full w-1/3 bg-oli-bg" />
                  <span className="h-full w-1/3 bg-oli-accent" />
                  <span className="h-full w-1/3 bg-oli-fg" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-bold ${
                      isActive ? "text-oli-accent" : "text-oli-fg"
                    }`}
                  >
                    {t.label}
                  </span>
                  <span className="block truncate text-oli-muted">
                    {t.description}
                  </span>
                </span>
              </div>
            );
          })}
          <div className="border-t border-oli-line px-2 py-1 text-[10px] text-oli-muted">
            {themes.length} themes — ↑↓ to browse, ⏎ to apply
            {activeIdx >= 0 ? `, ${activeIdx + 1}/${themes.length} active` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
