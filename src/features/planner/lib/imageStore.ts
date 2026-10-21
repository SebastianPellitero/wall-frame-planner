import { del, get, set } from "idb-keyval";

const KEY = "wallplanner:background";
const SMALL_FILE_BYTES = 1.5 * 1024 * 1024;

/** Thrown when IndexedDB cannot be used, so the UI can say the photo only lasts for this session. */
export class ImageStoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Image storage is unavailable", { cause });
    this.name = "ImageStoreUnavailableError";
  }
}

/** Scales (w, h) down so the long edge is at most `maxEdge`, keeping the aspect ratio. Never upscales. */
export function fitWithin(w: number, h: number, maxEdge: number): { w: number; h: number } {
  const longEdge = Math.max(w, h);
  if (longEdge <= maxEdge) return { w, h };
  const scale = maxEdge / longEdge;
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

async function encodeJpeg(bitmap: ImageBitmap, w: number, h: number, quality: number): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("JPEG encoding failed"))), "image/jpeg", quality);
  });
}

/** Shrinks a photo to at most `maxEdge` px on its long edge as JPEG; small files that already fit are returned untouched. */
export async function downscaleImage(
  file: Blob,
  maxEdge = 2560,
  quality = 0.85,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const fit = fitWithin(width, height, maxEdge);
    if (fit.w === width && fit.h === height && file.size <= SMALL_FILE_BYTES) {
      return { blob: file, width, height };
    }
    const blob = await encodeJpeg(bitmap, fit.w, fit.h, quality);
    return { blob, width: fit.w, height: fit.h };
  } finally {
    bitmap.close();
  }
}

async function guarded<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (error) {
    throw new ImageStoreUnavailableError(error);
  }
}

export const saveBackgroundImage = (blob: Blob): Promise<void> => guarded(() => set(KEY, blob));

export const loadBackgroundImage = (): Promise<Blob | undefined> => guarded(() => get<Blob>(KEY));

export const deleteBackgroundImage = (): Promise<void> => guarded(() => del(KEY));
