import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchConfig, saveConfig } = vi.hoisted(() => ({
  fetchConfig: vi.fn(),
  saveConfig: vi.fn(),
}));

vi.mock("../context/AppContext", async () => {
  const { INITIAL_CONFIG } = await vi.importActual<typeof import("../types")>(
    "../types",
  );
  return {
    useApp: () => ({ config: INITIAL_CONFIG, fetchConfig, saveConfig }),
  };
});

import { ConfigPage } from "./ConfigPage";
import { FIELDS, groupFields } from "./configFields";
import { INITIAL_CONFIG, OliConfig } from "../types";

function rowFor(label: string): HTMLElement {
  const row = screen.getByText(label).closest("div");
  if (!row) throw new Error(`no field row for "${label}"`);
  return row as HTMLElement;
}

afterEach(cleanup);

describe("ConfigPage field coverage", () => {
  it("renders a field for every config key, exactly once", () => {
    const keys = FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(keys)).toEqual(new Set(Object.keys(INITIAL_CONFIG)));
  });

  it("renders every group heading and field label", () => {
    render(<ConfigPage />);
    for (const group of groupFields(FIELDS).keys()) {
      expect(screen.getByText(group)).toBeTruthy();
    }
    for (const field of FIELDS) {
      expect(screen.getByText(field.label)).toBeTruthy();
    }
  });
});

describe("ConfigPage interactions", () => {
  beforeEach(() => {
    fetchConfig.mockClear();
    saveConfig.mockClear();
    saveConfig.mockResolvedValue(true);
  });

  it("fetches the server config on mount", () => {
    render(<ConfigPage />);
    expect(fetchConfig).toHaveBeenCalledTimes(1);
  });

  it("flips a toggle field", () => {
    render(<ConfigPage />);
    const row = rowFor("dry run");
    expect(within(row).getByText("OFF")).toBeTruthy();
    fireEvent.click(within(row).getByRole("button"));
    expect(within(row).getByText("ON")).toBeTruthy();
  });

  it("saves the edited draft back to the server", async () => {
    render(<ConfigPage />);
    fireEvent.click(within(rowFor("dry run")).getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: /save/ }));

    await waitFor(() => expect(saveConfig).toHaveBeenCalledTimes(1));
    const payload = saveConfig.mock.calls[0][0] as OliConfig;
    expect(payload.dry_run).toBe(true);
    expect(payload.first_chunk_timeout).toBe(
      INITIAL_CONFIG.first_chunk_timeout,
    );
    expect(payload.default_profile).toBe(INITIAL_CONFIG.default_profile);
    expect(payload.openai_optional_headers).toEqual({});
  });

  it("keeps local edits when the server save fails", async () => {
    saveConfig.mockResolvedValue(false);
    render(<ConfigPage />);
    fireEvent.click(within(rowFor("dry run")).getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: /save/ }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save failed/ })).toBeTruthy(),
    );
    expect(within(rowFor("dry run")).getByText("ON")).toBeTruthy();
  });
});
