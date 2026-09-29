import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useApp } from "../context/AppContext";

export function ProfileMenu() {
  const { config, profiles, profileError, selectProfile, status, isGenerating } =
    useApp();
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const activeName = profiles.find((p) => p.active)?.name ?? config.api_profile ?? "default";
  const busy = status !== "connected" || isGenerating;
  const entries = profiles.length > 0 ? profiles : [{ name: activeName }];

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
    (name: string) => {
      setOpen(false);
      setSelectedIdx(-1);
      if (name !== activeName) selectProfile(name);
    },
    [activeName, selectProfile],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % entries.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i <= 0 ? entries.length - 1 : i - 1));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      pick(entries[selectedIdx].name);
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
        title="Select the agent profile"
        className={`flex items-center gap-0.5 hover:text-oli-fg ${
          open ? "text-oli-accent" : "text-oli-muted"
        } ${busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span>:: {activeName}</span>
        <ChevronDown size={10} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full right-0 z-50 mb-1 max-h-56 w-56 overflow-y-auto border border-oli-line-strong bg-oli-elevated shadow-lg"
        >
          {entries.map((p, i) => {
            const isActive = p.name === activeName;
            const unavailable =
              "description" in p && p.description.startsWith("unavailable:");
            return (
              <div
                key={p.name}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!unavailable) pick(p.name);
                }}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`cursor-pointer px-2 py-1 text-[11px] ${
                  i === selectedIdx
                    ? "bg-oli-elevated text-oli-fg"
                    : "text-oli-muted"
                } ${unavailable ? "text-oli-warn" : ""}`}
              >
                <div className="flex items-center gap-1">
                  {isActive ? (
                    <span className="text-oli-accent">▸</span>
                  ) : (
                    <span className="w-[0.6rem]" />
                  )}
                  <span
                    className={`truncate font-bold ${
                      isActive ? "text-oli-accent" : "text-oli-fg"
                    }`}
                  >
                    {p.name}
                  </span>
                </div>
                {"description" in p && p.description && (
                  <div
                    className="ml-[0.6rem] truncate pl-1 text-oli-muted"
                    title={p.description}
                  >
                    {p.description}
                  </div>
                )}
              </div>
            );
          })}
          {busy && (
            <div className="border-t border-oli-line px-2 py-1 text-[10px] text-oli-warn">
              profile switches apply to the next turn
            </div>
          )}
          {profileError && (
            <div className="border-t border-oli-line px-2 py-1 text-[10px] text-oli-danger">
              ✗ {profileError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
