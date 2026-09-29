import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileInfo } from "../types";
import { listProfiles, selectProfile } from "./profiles";

function profile(overrides: Partial<ProfileInfo> = {}): ProfileInfo {
  return {
    name: "coder",
    active: false,
    description: "",
    version: "0.1.0",
    default_model_tier: "large",
    allow_tools: ["builtin__*"],
    deny_tools: [],
    ...overrides,
  };
}

function mockFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Not Found",
    json: () => Promise.resolve(response),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listProfiles", () => {
  it("returns the profiles array from the server", async () => {
    const fetchMock = mockFetch([profile({ active: true, name: "default" }), profile()]);
    vi.stubGlobal("fetch", fetchMock);

    const profiles = await listProfiles();

    expect(fetchMock).toHaveBeenCalledWith("/v1/profiles", undefined);
    expect(profiles).toHaveLength(2);
    expect(profiles[0].active).toBe(true);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 404));

    await expect(listProfiles()).rejects.toThrow("404 Not Found");
  });
});

describe("selectProfile", () => {
  it("PUTs to the encoded profile name", async () => {
    const fetchMock = mockFetch(profile({ active: true }));
    vi.stubGlobal("fetch", fetchMock);

    const selected = await selectProfile("code reviewer/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/profiles/code%20reviewer%2F1",
      { method: "PUT" },
    );
    expect(selected.active).toBe(true);
  });

  it("throws when the profile is unknown", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 404));

    await expect(selectProfile("nope")).rejects.toThrow("404 Not Found");
  });
});
