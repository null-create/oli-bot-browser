import { describe, expect, it } from "vitest";
import { matchCommand, parseSlashCommand } from "./commands";

describe("parseSlashCommand", () => {
  it("returns null for non-workspace input", () => {
    expect(parseSlashCommand("/clear")).toBeNull();
    expect(parseSlashCommand("/workspace set /tmp")).toBeNull();
    expect(parseSlashCommand("/wssomething")).toBeNull();
    expect(parseSlashCommand("hello /ws")).toBeNull();
  });

  it("shows the workspace for a bare command", () => {
    expect(parseSlashCommand("/ws")).toEqual({ kind: "workspace-show" });
    expect(parseSlashCommand("  /ws   ")).toEqual({ kind: "workspace-show" });
  });

  it("parses a path", () => {
    expect(parseSlashCommand("/ws /tmp/foo")).toEqual({
      kind: "workspace-set",
      path: "/tmp/foo",
    });
  });

  it("keeps spaces in the path and expands ~ untouched", () => {
    expect(parseSlashCommand("/ws ~/my projects/oli")).toEqual({
      kind: "workspace-set",
      path: "~/my projects/oli",
    });
  });

  it("strips matching quotes", () => {
    expect(parseSlashCommand('/ws "/tmp/my project"')).toEqual({
      kind: "workspace-set",
      path: "/tmp/my project",
    });
    expect(parseSlashCommand("/ws '/tmp/other project'")).toEqual({
      kind: "workspace-set",
      path: "/tmp/other project",
    });
  });

  it("recognises off and unset", () => {
    expect(parseSlashCommand("/ws off")).toEqual({ kind: "workspace-unset" });
    expect(parseSlashCommand("/ws unset")).toEqual({ kind: "workspace-unset" });
    expect(parseSlashCommand("/ws OFF")).toEqual({ kind: "workspace-unset" });
  });
});

describe("matchCommand", () => {
  it("matches a registered command at the start", () => {
    expect(matchCommand("/ws")).toMatchObject({
      token: "/ws",
      rest: "",
      start: 0,
      end: 3,
    });
  });

  it("matches case-insensitively and keeps the argument", () => {
    expect(matchCommand("/WS /tmp/foo")).toMatchObject({
      token: "/WS",
      rest: " /tmp/foo",
    });
  });

  it("allows leading whitespace before the command", () => {
    expect(matchCommand("  /ws")).toMatchObject({
      token: "/ws",
      rest: "",
      start: 2,
      end: 5,
    });
  });

  it("ignores partial, unknown and embedded commands", () => {
    expect(matchCommand("/w")).toBeNull();
    expect(matchCommand("/wsx")).toBeNull();
    expect(matchCommand("/clear")).toBeNull();
    expect(matchCommand("hello /ws")).toBeNull();
  });
});
