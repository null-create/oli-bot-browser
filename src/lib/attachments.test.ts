import { describe, expect, it } from "vitest";
import {
  fileToAttachment,
  isImageFile,
  MAX_ATTACHMENT_BYTES,
  stripDataUri,
  toWireAttachments,
} from "./attachments";
import { PendingAttachment } from "../types";

describe("isImageFile", () => {
  it("detects image media types", () => {
    expect(isImageFile(new File(["x"], "a.png", { type: "image/png" }))).toBe(
      true,
    );
    expect(isImageFile(new File(["x"], "a.txt", { type: "text/plain" }))).toBe(
      false,
    );
  });
});

describe("stripDataUri", () => {
  it("removes the data-uri prefix", () => {
    expect(stripDataUri("data:text/plain;base64,aGVsbG8=")).toBe("aGVsbG8=");
  });

  it("returns the input unchanged when there is no comma", () => {
    expect(stripDataUri("aGVsbG8=")).toBe("aGVsbG8=");
  });
});

describe("fileToAttachment", () => {
  it("reads a text file into a data URL attachment", async () => {
    const file = new File(["hello"], "a.txt", { type: "text/plain" });

    const att = await fileToAttachment(file);

    expect(att.kind).toBe("file");
    expect(att.name).toBe("a.txt");
    expect(att.mediaType).toBe("text/plain");
    expect(att.dataUrl.startsWith("data:")).toBe(true);
    expect(stripDataUri(att.dataUrl)).toBe("aGVsbG8=");
    expect(att.id).toBeTruthy();
  });

  it("marks image files with kind 'image'", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", {
      type: "image/png",
    });

    const att = await fileToAttachment(file);

    expect(att.kind).toBe("image");
    expect(att.mediaType).toBe("image/png");
  });

  it("rejects files above the size limit", async () => {
    const file = new File(["x"], "big.bin");
    Object.defineProperty(file, "size", { value: MAX_ATTACHMENT_BYTES + 1 });

    await expect(fileToAttachment(file)).rejects.toThrow(/limit/);
  });
});

describe("toWireAttachments", () => {
  it("maps attachments to the server wire shape", () => {
    const attachment: PendingAttachment = {
      id: "1",
      kind: "file",
      name: "a.txt",
      mediaType: "text/plain",
      dataUrl: "data:text/plain;base64,aGVsbG8=",
      size: 5,
    };

    expect(toWireAttachments([attachment])).toEqual([
      { name: "a.txt", media_type: "text/plain", data: "aGVsbG8=" },
    ]);
  });
});
