import { describe, expect, it } from "vitest";
import { formatToolParams, isToolError } from "./format";

describe("formatToolParams", () => {
  it("joins entries as k=v", () => {
    expect(formatToolParams({ command: "ls -la", workdir: "/tmp" })).toBe(
      "command=ls -la, workdir=/tmp",
    );
  });

  it("stringifies object and null values", () => {
    expect(formatToolParams({ tags: ["a", "b"], empty: null })).toBe(
      'tags=["a","b"], empty=null',
    );
  });

  it("returns empty string for no parameters", () => {
    expect(formatToolParams({})).toBe("");
  });

  it("truncates over 100 chars with ellipsis", () => {
    const long = "x".repeat(120);
    const out = formatToolParams({ arg: long });
    expect(out.length).toBe(101);
    expect(out.endsWith("\u2026")).toBe(true);
  });
});

describe("isToolError", () => {
  it("detects error results case-insensitively", () => {
    expect(isToolError("Error: boom")).toBe(true);
    expect(isToolError("  error  while running")).toBe(true);
    expect(isToolError("ok")).toBe(false);
  });
});