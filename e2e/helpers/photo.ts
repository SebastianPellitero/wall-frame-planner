import type { Page } from "@playwright/test";

/** A JPEG drawn in the page, to upload as the wall photo. 1200×800 is wider than the 300×250 wall. */
export async function makeJpeg(page: Page, size = { width: 1200, height: 800 }): Promise<Buffer> {
  const b64 = await page.evaluate(({ width, height }) => {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, "#c9b79c");
    g.addColorStop(1, "#8a7a66");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#5b4636";
    ctx.fillRect(0, height * 0.8, width, height * 0.2);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  }, size);
  return Buffer.from(b64, "base64");
}

/** Whether idb-keyval's store still holds the photo. */
export function storedImage(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      new Promise<boolean>((resolve, reject) => {
        const open = indexedDB.open("keyval-store");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("keyval")) return resolve(false);
          const req = db.transaction("keyval").objectStore("keyval").get("wallplanner:background");
          req.onsuccess = () => resolve(req.result !== undefined);
          req.onerror = () => reject(req.error);
        };
      }),
  );
}
