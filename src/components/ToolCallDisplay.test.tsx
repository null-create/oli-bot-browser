import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolCall } from "../types";
import { ToolCallDisplay } from "./ToolCallDisplay";

const NOW = new Date("2026-01-01T00:00:00Z").getTime();

const base: ToolCall = {
  id: "c1",
  name: "bash",
  parameters: { command: "ls -la" },
  startTime: NOW - 1000,
};

// The running duration is measured against the wall clock, so the clock has
// to stand still for the pending state to read exactly one second.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("ToolCallDisplay", () => {
  it("shows pending state with name and params", () => {
    render(<ToolCallDisplay call={base} />);
    expect(screen.getByText("bash")).toBeTruthy();
    expect(screen.getByText("\u00b7 command=ls -la")).toBeTruthy();
    expect(screen.getByText("\u00b7 1.0s")).toBeTruthy();
  });

  it("shows completed state with real elapsed", () => {
    render(<ToolCallDisplay call={{ ...base, result: "ok", elapsed: 2.5 }} />);
    expect(screen.getByText("\u00b7 2.5s")).toBeTruthy();
    expect(screen.queryByText("ok")).toBeNull();
  });

  it("surfaces error results", () => {
    render(
      <ToolCallDisplay call={{ ...base, result: "Error: nope", elapsed: 0.4 }} />,
    );
    expect(screen.getByText("Error: nope")).toBeTruthy();
  });

  it("omits the params separator when there are none", () => {
    render(
      <ToolCallDisplay
        call={{ ...base, parameters: {}, result: "ok", elapsed: 1 }}
      />,
    );
    expect(screen.getByText("bash")).toBeTruthy();
    expect(screen.getByText("\u00b7 1.0s")).toBeTruthy();
    expect(screen.queryByText(/^\u00b7 $/)).toBeNull();
  });

  it("shows no duration for a restored call that never recorded one", () => {
    render(<ToolCallDisplay call={{ ...base, result: "ok" }} />);
    expect(screen.getByText("\u00b7 0.0s")).toBeTruthy();
  });
});