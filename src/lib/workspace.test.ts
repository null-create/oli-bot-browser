import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWorkspace,
  listDirectory,
  setWorkspace,
  unsetWorkspace,
} from "./workspace";

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

describe("listDirectory", () => {
  it("requests an encoded path", async () => {
    const fetchMock = mockFetch({
      path: "/tmp/foo",
      sensitive: false,
      entries: [{ name: "bar", path: "/tmp/foo/bar", type: "file", sensitive: false }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const listing = await listDirectory("/tmp/foo");

    expect(fetchMock).toHaveBeenCalledWith("/v1/fs/list?path=%2Ftmp%2Ffoo", undefined);
    expect(listing.entries[0].name).toBe("bar");
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 400));

    await expect(listDirectory("/")).rejects.toThrow("400 Bad Request");
  });
});

describe("fetchWorkspace", () => {
  it("GETs the current workspace state", async () => {
    const fetchMock = mockFetch({
      current: "/home/me/proj",
      sensitive: false,
      workspaces: ["/home/me/proj"],
    });
    vi.stubGlobal("fetch", fetchMock);

    const ws = await fetchWorkspace();

    expect(fetchMock).toHaveBeenCalledWith("/v1/workspace", undefined);
    expect(ws.current).toBe("/home/me/proj");
  });
});

describe("setWorkspace", () => {
  it("PUTs the path as JSON", async () => {
    const fetchMock = mockFetch({
      current: "/data",
      sensitive: false,
      workspaces: ["/data"],
    });
    vi.stubGlobal("fetch", fetchMock);

    await setWorkspace("/data");

    expect(fetchMock).toHaveBeenCalledWith("/v1/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/data" }),
    });
  });
});

describe("unsetWorkspace", () => {
  it("DELETEs the workspace", async () => {
    const fetchMock = mockFetch({
      current: null,
      sensitive: false,
      workspaces: [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await unsetWorkspace();

    expect(fetchMock).toHaveBeenCalledWith("/v1/workspace", {
      method: "DELETE",
    });
  });
});