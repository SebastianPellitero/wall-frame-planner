import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { makeJpeg, storedImage } from "./helpers/photo";
import { settle } from "./helpers/settle";

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";
const KEY = "wallplanner:project";

const CORRUPT_COPY = "Saved data couldn't be read, so the wall started fresh. A backup was kept.";
const QUOTA_COPY = "Storage is full, so changes aren't being saved. They stay until you close this tab.";

const frames = (page: Page) => page.getByTestId("frame");
const toasts = (page: Page) => page.getByTestId("toast-region");
const isDesktop = (testInfo: TestInfo) => testInfo.project.name === "desktop";

/** Runs `script` before the app loads, on the first load of this tab only (a sessionStorage guard). */
async function onFirstLoad(page: Page, script: string) {
  await page.addInitScript((body) => {
    if (sessionStorage.getItem("e2e:init")) return;
    sessionStorage.setItem("e2e:init", "1");
    new Function(body)();
  }, script);
}

/** The wall's on-screen aspect ratio: 300 × 250 cm by default. */
async function wallAspect(page: Page) {
  const box = (await page.getByTestId("wall").boundingBox())!;
  return box.width / box.height;
}

async function openSettings(page: Page, testInfo: TestInfo) {
  if (isDesktop(testInfo)) return page;
  const sheet = page.getByRole("dialog", { name: "Settings" });
  // A sheet that just closed (after an upload) finishes sliding out first.
  await expect(sheet).toHaveCount(0);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(sheet).toBeVisible();
  return sheet;
}

test.describe("resilience", () => {
  test("a corrupt save starts fresh, keeps a backup and says so", async ({ page }, testInfo) => {
    await onFirstLoad(page, `localStorage.setItem(${JSON.stringify(KEY)}, "{not json");`);
    await page.goto("/");
    await expect(page.getByTestId("wall")).toBeVisible();

    const toast = toasts(page).getByRole("alert");
    await expect(toast).toHaveText(CORRUPT_COPY);
    const backups = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("wallplanner:corrupt-")));
    expect(backups).toHaveLength(1);
    expect(await page.evaluate((k) => localStorage.getItem(k), backups[0])).toBe("{not json");
    await expect(frames(page)).toHaveCount(0);
    expect(await wallAspect(page)).toBeCloseTo(300 / 250, 1);

    // Clear of the bottom edge and inside the stage.
    const stage = (await page.getByTestId("stage").boundingBox())!;
    const box = (await toast.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height - 8);
    expect(box.width).toBeLessThanOrEqual(360);
    await settle(toast);
    await page.screenshot({ path: `${SHOTS}/t10-${testInfo.project.name}-toast.png` });

    await toast.getByRole("button", { name: "Dismiss" }).click();
    await expect(toasts(page).getByRole("alert")).toHaveCount(0);
  });

  test("a full storage keeps the frame in memory and warns once", async ({ page }) => {
    await page.addInitScript((key) => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k === key) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        return setItem.call(this, k, v);
      };
    }, KEY);
    await page.goto("/");
    await expect(page.getByTestId("wall")).toBeVisible();

    await page.getByRole("button", { name: /^Add rectangle/ }).click();
    await expect(frames(page)).toHaveCount(1);
    await expect(page.getByTestId("announcer")).toHaveText("Frame added");
    await expect(toasts(page).getByRole("alert")).toHaveText(QUOTA_COPY);

    // Throttled: more failed saves do not stack more toasts.
    await page.getByRole("button", { name: /^Add rectangle/ }).click();
    await expect(frames(page)).toHaveCount(2);
    await expect(toasts(page).getByRole("alert")).toHaveCount(1);
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
  });

  test("Reset wall clears frames, settings and the photo, and it sticks after a reload", async ({ page }, testInfo) => {
    const state = {
      wall: { width: 400, height: 260, pushGap: 8 },
      grid: { enabled: true, snap: false, spacingX: 25, spacingY: 25, originX: 0, originY: 0 },
      background: { hasImage: false, x: 0, y: 0, width: 300, aspect: 1, opacity: 1, visible: true },
      shapes: [
        { id: "a", kind: "rect", x: 20, y: 20, w: 40, h: 50, color: 1 },
        { id: "b", kind: "circle", x: 120, y: 40, w: 30, h: 30, color: 2 },
      ],
      paletteSizes: { rect: { w: 60, h: 70 }, square: { w: 30, h: 30 }, circle: { w: 30, h: 30 } },
    };
    await onFirstLoad(page, `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(JSON.stringify({ state, version: 1 }))});`);
    await page.goto("/");
    await expect(frames(page)).toHaveCount(2);

    // A photo, uploaded through Settings > Photo.
    let settings = await openSettings(page, testInfo);
    const chooser = page.waitForEvent("filechooser");
    await settings.getByRole("button", { name: "Upload photo" }).click();
    await (await chooser).setFiles({ name: "wall.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page, { width: 600, height: 400 }) });
    await expect(page.getByTestId("background-photo")).toBeVisible();
    await expect.poll(() => storedImage(page)).toBe(true);

    settings = await openSettings(page, testInfo);
    await settings.getByRole("button", { name: "Reset wall" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Reset the wall?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Reset wall" }).click();

    await expect(confirm).toHaveCount(0);
    if (!isDesktop(testInfo)) await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
    await expect(toasts(page).getByRole("status")).toHaveText("Wall reset.");
    await expect(frames(page)).toHaveCount(0);
    await expect(page.getByTestId("background-photo")).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "Arrange" })).toBeChecked();
    await expect.poll(() => storedImage(page)).toBe(false);

    const expectDefaults = async () => {
      const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).state, KEY);
      expect(saved).toMatchObject({
        wall: { width: 300, height: 250, pushGap: 3 },
        grid: { enabled: false, snap: true, spacingX: 10, spacingY: 10, originX: 0, originY: 0 },
        background: { hasImage: false },
        shapes: [],
        paletteSizes: { rect: { w: 40, h: 50 } },
      });
      expect(await wallAspect(page)).toBeCloseTo(300 / 250, 1);
    };
    await expectDefaults();

    await page.reload();
    await expect(page.getByTestId("wall")).toBeVisible();
    await expect(frames(page)).toHaveCount(0);
    await expect(page.getByTestId("background-photo")).toHaveCount(0);
    await expectDefaults();
  });
});
