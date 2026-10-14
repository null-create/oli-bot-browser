import { PendingAttachment } from "../types";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fileToAttachment(file: File): Promise<PendingAttachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      reject(
        new Error(
          `${file.name} exceeds the ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB limit`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        reject(new Error(`Could not read ${file.name}`));
        return;
      }
      resolve({
        id: makeId(),
        kind: isImageFile(file) ? "image" : "file",
        name: file.name || "upload",
        mediaType: file.type || "application/octet-stream",
        dataUrl,
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function stripDataUri(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

export type WireAttachment = {
  name: string;
  media_type: string;
  data: string;
};

export function toWireAttachments(
  attachments: PendingAttachment[],
): WireAttachment[] {
  return attachments.map((a) => ({
    name: a.name,
    media_type: a.mediaType,
    data: stripDataUri(a.dataUrl),
  }));
}
