import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listAgents } from "./agents";

function mockFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    json: () => Promise.resolve(response),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listAgents", () => {
  it("GETs the agent pool configuration", async () => {
    const config = {
      enabled: true,
      source: "/home/user/.config/oli/agents.yaml",
      pools: [
        {
          name: "default",
          agents: [
            {
              name: "coder",
              profile: "default",
              backend: {
                type: "openai",
                model: "gpt-4o-mini",
                base_url: "https://api.openai.com/v1",
                api_key: "set",
              },
            },
          ],
        },
      ],
    };
    const fetchMock = mockFetch(config);
    vi.stubGlobal("fetch", fetchMock);

    const result = await listAgents();

    expect(fetchMock).toHaveBeenCalledWith("/v1/agents", undefined);
    expect(result).toEqual(config);
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 400));

    await expect(listAgents()).rejects.toThrow("400 Bad Request");
  });
});
