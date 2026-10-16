import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessage } = vi.hoisted(() => ({
  sendMessage: vi.fn(),
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => ({ sendMessage, isGenerating: false }),
}));

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

describe("ChatInput attachments", () => {
  beforeEach(() => {
    sendMessage.mockClear();
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
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "/clear" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });

    expect(sendMessage).toHaveBeenCalledWith("/clear", []);
  });
});
