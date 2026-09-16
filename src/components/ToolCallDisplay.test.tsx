import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ToolCall } from "../types";
import { ToolCallDisplay } from "./ToolCallDisplay";

const base: ToolCall = {
  id: "c1",
  name: "bash",
  parameters: { command: "ls -la" },
  startTime: Date.now() - 1000,
};

afterEach(cleanup);

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
});