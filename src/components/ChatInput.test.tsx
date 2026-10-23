import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessage, setWorkspace, unsetWorkspace, listDirectory, state } =
  vi.hoisted(() => ({
    sendMessage: vi.fn(),
    setWorkspace: vi.fn(),
    unsetWorkspace: vi.fn(),
    listDirectory: vi.fn(),
    state: {
      workspace: {
        current: "/home/me/proj",
        sensitive: false,
        workspaces: ["/home/me/proj", "/tmp"],
      } as null | {
        current: string | null;
        sensitive: boolean;
        workspaces: string[];
      },
    },
  }));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({
    sendMessage,
    isGenerating: false,
    workspace: state.workspace,
    setWorkspace,
    unsetWorkspace,
  }),
}));

vi.mock("../lib/workspace", () => ({ listDirectory }));

import { ChatInput } from "./ChatInput";

function renderInput() {
  return render(<ChatInput onClear={() => {}} />);
}

function attachFile(name: string, type: string, content: BlobPart = "x") {
  const input = document.querySelector(
    'input[type="file"][accept="image/*"]',
  ) as HTMLInputElement;
  const file = new File([content], name, { type });
  fireEvent.change(input, { target: { files: [file] } });
}

function typeAndEnter(text: string) {
  const box = screen.getByRole("textbox");
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: "Enter" });
}

describe("ChatInput attachments", () => {
  beforeEach(() => {
    sendMessage.mockReset();
    setWorkspace.mockReset();
    unsetWorkspace.mockReset();
    listDirectory.mockReset();
    setWorkspace.mockResolvedValue(null);
    unsetWorkspace.mockResolvedValue(null);
    listDirectory.mockResolvedValue({
      path: "/tmp/foo",
      sensitive: false,
      entries: [],
    });
    state.workspace = {
      current: "/home/me/proj",
      sensitive: false,
      workspaces: ["/home/me/proj", "/tmp"],
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the attach menu with image and file options", () => {
    renderInput();
    fireEvent.click(screen.getByTitle("Attach a file"));
    expect(screen.getByRole("menuitem", { name: /image/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /file/i })).toBeTruthy();
  });

  it("shows a chip after selecting a file", async () => {
    const { container } = renderInput();
    const input = container.querySelector(
      'input[accept="image/*"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["hi"], "cat.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(screen.getByText("cat.png")).toBeTruthy());
  });

  it("sends an attachment-only message", async () => {
    renderInput();
    attachFile("notes.txt", "text/plain", "hello");
    await waitFor(() => expect(screen.getByText("notes.txt")).toBeTruthy());

    fireEvent.click(screen.getByTitle("Send"));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    const [text, attachments] = sendMessage.mock.calls[0];
    expect(text).toBe("");
    expect(attachments).toHaveLength(1);
    expect(attachments[0].name).toBe("notes.txt");
    expect(attachments[0].kind).toBe("file");
  });

  it("sends text together with an attachment", async () => {
    const { container } = renderInput();
    const fileInput = container.querySelector(
      'input[accept="image/*"]',
    ) as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["hi"], "cat.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(screen.getByText("cat.png")).toBeTruthy());

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "what is this" },
    });
    fireEvent.click(screen.getByTitle("Send"));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage.mock.calls[0][0]).toBe("what is this");
    expect(sendMessage.mock.calls[0][1]).toHaveLength(1);
  });

  it("removes a chip when its remove button is clicked", async () => {
    renderInput();
    attachFile("notes.txt", "text/plain");
    await waitFor(() => expect(screen.getByText("notes.txt")).toBeTruthy());

    fireEvent.click(screen.getByTitle("Remove notes.txt"));

    await waitFor(() => expect(screen.queryByText("notes.txt")).toBeNull());
  });

  it("sends a slash-prefixed message to the agent", () => {
    renderInput();
    typeAndEnter("/clear");

    expect(sendMessage).toHaveBeenCalledWith("/clear", []);
  });
});

describe("ChatInput /ws command", () => {
  beforeEach(() => {
    sendMessage.mockReset();
    setWorkspace.mockReset();
    unsetWorkspace.mockReset();
    listDirectory.mockReset();
    setWorkspace.mockResolvedValue(null);
    unsetWorkspace.mockResolvedValue(null);
    listDirectory.mockResolvedValue({
      path: "/tmp/foo",
      sensitive: false,
      entries: [],
    });
    state.workspace = {
      current: "/home/me/proj",
      sensitive: false,
      workspaces: ["/home/me/proj", "/tmp"],
    };
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sets the workspace without sending a message", async () => {
    renderInput();
    typeAndEnter("/ws /tmp/foo");

    await waitFor(() =>
      expect(setWorkspace).toHaveBeenCalledWith("/tmp/foo"),
    );
    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText(/workspace set to \/tmp\/foo/)).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });

  it("asks for confirmation before setting a sensitive path", async () => {
    listDirectory.mockResolvedValue({
      path: "/etc",
      sensitive: true,
      entries: [],
    });
    renderInput();
    typeAndEnter("/ws /etc");

    await waitFor(() => expect(screen.getByText("sensitive path")).toBeTruthy());
    expect(setWorkspace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "confirm" }));

    await waitFor(() => expect(setWorkspace).toHaveBeenCalledWith("/etc"));
  });

  it("shows the current and recent workspaces", () => {
    renderInput();
    typeAndEnter("/ws");

    expect(screen.getByText(/workspace: \/home\/me\/proj/)).toBeTruthy();
    expect(screen.getByText(/recent: \/home\/me\/proj/)).toBeTruthy();
    expect(screen.getByText(/usage: \/ws <path>/)).toBeTruthy();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("clears the workspace", async () => {
    renderInput();
    typeAndEnter("/ws off");

    await waitFor(() => expect(unsetWorkspace).toHaveBeenCalledTimes(1));
    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByText("workspace cleared")).toBeTruthy();
  });

  it("shows the server error when setting fails", async () => {
    setWorkspace.mockResolvedValue("Not a valid directory: /nope");
    renderInput();
    typeAndEnter("/ws /nope");

    await waitFor(() =>
      expect(
        screen.getByText(/workspace not set: Not a valid directory/),
      ).toBeTruthy(),
    );
  });
});

describe("ChatInput command highlight", () => {
  beforeEach(() => {
    sendMessage.mockReset();
    setWorkspace.mockReset();
    unsetWorkspace.mockReset();
    listDirectory.mockReset();
    setWorkspace.mockResolvedValue(null);
    unsetWorkspace.mockResolvedValue(null);
    listDirectory.mockResolvedValue({
      path: "/tmp/foo",
      sensitive: false,
      entries: [],
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("highlights a recognised command token", () => {
    renderInput();
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;

    fireEvent.change(box, { target: { value: "/ws" } });

    const overlay = screen.getByTestId("chat-input-highlight");
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect(overlay.textContent).toBe("/ws");
    expect(
      overlay.querySelector(".text-oli-accent-bright")?.textContent,
    ).toBe("/ws");
    expect(box.className).toContain("text-transparent");
    expect(box.className).toContain("caret-oli-accent");
  });

  it("keeps the argument separate from the highlighted token", () => {
    renderInput();
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;

    fireEvent.change(box, { target: { value: "/ws /tmp/foo" } });

    const spans = screen.getByTestId("chat-input-highlight").querySelectorAll("span");
    expect(spans[0].textContent).toBe("/ws");
    expect(spans[1].textContent).toBe(" /tmp/foo");
  });

  it("does not highlight partial or unknown commands", () => {
    renderInput();
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;

    for (const value of ["/w", "/clear", "hello /ws"]) {
      fireEvent.change(box, { target: { value } });
      expect(screen.queryByTestId("chat-input-highlight")).toBeNull();
      expect(box.className).toContain("text-oli-fg");
      expect(box.className).not.toContain("text-transparent");
    }
  });

  it("keeps the highlight layer in sync when the textarea scrolls", () => {
    renderInput();
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "/ws /tmp/foo" } });

    const overlay = screen.getByTestId("chat-input-highlight");
    Object.defineProperty(box, "scrollTop", {
      configurable: true,
      value: 24,
    });
    Object.defineProperty(overlay, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    fireEvent.scroll(box);

    expect(overlay.scrollTop).toBe(24);
  });
});

describe("ChatInput auto-size", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("grows the textarea up to the max height", () => {
    renderInput();
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    Object.defineProperty(box, "scrollHeight", {
      configurable: true,
      get: () => 600,
    });

    fireEvent.change(box, { target: { value: "a\n".repeat(40) } });

    expect(box.style.height).toBe("160px");
    expect(box.style.overflowY).toBe("auto");
  });

  it("keeps short input at one line", () => {
    renderInput();
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    Object.defineProperty(box, "scrollHeight", {
      configurable: true,
      get: () => 20,
    });

    fireEvent.change(box, { target: { value: "hello" } });

    expect(box.style.height).toBe("20px");
    expect(box.style.overflowY).toBe("hidden");
  });
});
