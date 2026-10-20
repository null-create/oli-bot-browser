import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TurnActivity } from "../types";
import { TurnActivityBlock } from "./TurnActivityBlock";

const activity: TurnActivity = {
  thinking: "checking the workspace",
  elapsed: 4.2,
  toolCalls: [
    {
      id: "t1",
      name: "bash",
      parameters: { command: "ls" },
      startTime: Date.now() - 1000,
      result: "ok",
      elapsed: 1,
    },
  ],
};

afterEach(cleanup);

describe("TurnActivityBlock", () => {
  it("shows a collapsed summary with counts and elapsed time", () => {
    render(<TurnActivityBlock activity={activity} />);
    expect(screen.getByText("1 tool call \u00b7 thinking \u00b7 4.2s")).toBeTruthy();
    expect(screen.queryByText("bash")).toBeNull();
  });

  it("reveals thinking and tool calls when expanded", () => {
    render(<TurnActivityBlock activity={activity} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("checking the workspace")).toBeTruthy();
    expect(screen.getByText("bash")).toBeTruthy();
  });
});
