import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createPointer, drag } from "./helpers/pointer";

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";

type StoredBackground = { hasImage: boolean; x: number; y: number; width: number; aspect: number; opacity: number; visible: boolean };

/** A 1200×800 JPEG drawn in the page: wider than the 300×250 wall, so it overflows left and right. */
async function makeJpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 1200, 800);
    g.addColorStop(0, "#c9b79c");
    g.addColorStop(1, "#8a7a66");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1200, 800);
    ctx.fillStyle = "#5b4636";
    ctx.fillRect(0, 640, 1200, 160);
    ctx.fillStyle = "#e9e2d4";
    ctx.fillRect(520, 140, 160, 220);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  });
  return Buffer.from(b64, "base64");
}

const photoTools = (page: Page) => page.getByRole("region", { name: "Photo tools" });
const photo = (page: Page) => page.getByTestId("background-photo");

async function storedBackground(page: Page): Promise<StoredBackground> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("wallplanner:project")!).state.background);
}

/** Opens the app, enters Photo mode and uploads the fixture through the Upload photo button. */
async function uploadPhoto(page: Page) {
  if (page.url() === "about:blank") await page.goto("/");
  await expect(page.getByTestId("wall")).toBeVisible();
  await page.getByRole("radio", { name: "Photo" }).click();
  const chooser = page.waitForEvent("filechooser");
  await photoTools(page).getByRole("button", { name: "Upload photo" }).click();
  await (await chooser).setFiles({ name: "wall.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page) });
  await expect(photo(page)).toBeVisible();
  await expect.poll(async () => (await storedBackground(page)).hasImage).toBe(true);
}

async function wallCenter(page: Page) {
  const box = (await page.getByTestId("wall").boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

test.describe("background photo", () => {
  test("upload covers the wall, enters Photo mode and veils the overflow", async ({ page }, testInfo) => {
    await page.goto("/");
    await uploadPhoto(page);
    await expect(page.getByRole("radio", { name: "Photo" })).toBeChecked();
    const bg = await storedBackground(page);
    // 1200×800 on 300×250: cover-fit width 375, centered.
    expect(bg).toMatchObject({ hasImage: true, width: 375, x: -37.5, y: 0, opacity: 1, visible: true });
    const { box } = await wallCenter(page);
    const img = (await photo(page).boundingBox())!;
    expect(img.x).toBeLessThan(box.x);
    expect(img.x + img.width).toBeGreaterThan(box.x + box.width);
    expect(Math.abs(img.height - box.height)).toBeLessThan(1.5);
    await expect(page.getByTestId("photo-veil")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/t9-${testInfo.project.name}-photo.png` });

    await photoTools(page).getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("radio", { name: "Arrange" })).toBeChecked();
    await expect(page.getByTestId("photo-veil")).toHaveCount(0);
    await expect(page.getByTestId("background")).toHaveClass(/overflow-hidden/);
    await page.screenshot({ path: `${SHOTS}/t9-${testInfo.project.name}-arrange.png` });
  });

  test("a one-pointer drag pans the photo (mouse on desktop, a finger on the phone)", async ({ page }, testInfo) => {
    await page.goto("/");
    await uploadPhoto(page);
    const before = await storedBackground(page);
    const c = await wallCenter(page);
    const pointer = await createPointer(page, testInfo);
    await drag(pointer, { x: c.x, y: c.y }, { x: c.x + 60, y: c.y + 20 });
    await expect.poll(async () => (await storedBackground(page)).x).toBeGreaterThan(before.x + 5);
    const after = await storedBackground(page);
    expect(after.y).toBeGreaterThan(before.y);
    expect(after.width).toBe(before.width);
  });

  test("a two-finger pinch scales the photo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone-landscape", "real touch on the phone project");
    await page.goto("/");
    await uploadPhoto(page);
    const before = await storedBackground(page);
    const c = await wallCenter(page);
    const cdp = await page.context().newCDPSession(page);
    const points = (spread: number) => [
      { x: Math.round(c.x - spread), y: Math.round(c.y), id: 1 },
      { x: Math.round(c.x + spread), y: Math.round(c.y), id: 2 },
    ];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(30) });
    for (let spread = 35; spread <= 90; spread += 5) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(spread) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(async () => (await storedBackground(page)).width).toBeGreaterThan(before.width * 2);
  });

  test("the mouse wheel zooms about the cursor (desktop)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "wheel is a desktop gesture");
    await page.goto("/");
    await uploadPhoto(page);
    const before = await storedBackground(page);
    const c = await wallCenter(page);
    await page.mouse.move(c.x, c.y);
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await storedBackground(page)).width).toBeGreaterThan(before.width);
  });

  test("the Opacity slider sets the photo's opacity", async ({ page }) => {
    await page.goto("/");
    await uploadPhoto(page);
    await photoTools(page).getByRole("slider", { name: "Opacity" }).fill("40");
    await expect(photo(page)).toHaveCSS("opacity", "0.4");
    expect((await storedBackground(page)).opacity).toBeCloseTo(0.4);
  });

  test("the photo and its placement survive a reload (IndexedDB)", async ({ page }, testInfo) => {
    await page.goto("/");
    await uploadPhoto(page);
    const c = await wallCenter(page);
    await drag(await createPointer(page, testInfo), { x: c.x, y: c.y }, { x: c.x - 40, y: c.y });
    await expect.poll(async () => (await storedBackground(page)).x).toBeLessThan(-37.5);
    const placed = await storedBackground(page);
    const box = (await photo(page).boundingBox())!;

    await page.reload();
    await expect(photo(page)).toBeVisible();
    expect(await storedBackground(page)).toEqual(placed);
    const again = (await photo(page).boundingBox())!;
    expect(Math.abs(again.x - box.x)).toBeLessThan(1);
    expect(Math.abs(again.width - box.width)).toBeLessThan(1);
  });

  test("Remove photo asks first, then the photo is gone, after a reload too", async ({ page }) => {
    await page.goto("/");
    await uploadPhoto(page);
    await photoTools(page).getByRole("button", { name: "Remove photo" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Remove the photo?" });
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
    await dialog.getByRole("button", { name: "Remove photo" }).click();
    await expect(dialog).toBeHidden();
    await expect(photo(page)).toHaveCount(0);
    await expect(photoTools(page).getByRole("button", { name: "Upload photo" })).toBeFocused();

    await page.reload();
    await expect(page.getByTestId("wall")).toBeVisible();
    await expect(photo(page)).toHaveCount(0);
    expect((await storedBackground(page)).hasImage).toBe(false);
    const stored = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const req = indexedDB.open("keyval-store");
          req.onsuccess = () => {
            const get = req.result.transaction("keyval").objectStore("keyval").get("wallplanner:background");
            get.onsuccess = () => resolve(get.result ?? null);
          };
        }),
    );
    expect(stored).toBeNull();
  });

  test("frames can't be dragged in Photo mode; the drag pans the photo instead", async ({ page }, testInfo: TestInfo) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Add rectangle/ }).click();
    const frame = page.getByRole("button", { name: "Rectangle 40 × 50 cm" });
    await expect(frame).toBeVisible();
    const shapesBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("wallplanner:project")!).state.shapes);
    await uploadPhoto(page);
    const bgBefore = await storedBackground(page);
    const box = (await frame.boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await drag(await createPointer(page, testInfo), from, { x: from.x + 50, y: from.y + 30 });
    await expect.poll(async () => (await storedBackground(page)).x).toBeGreaterThan(bgBefore.x);
    const shapesAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("wallplanner:project")!).state.shapes);
    expect(shapesAfter).toEqual(shapesBefore);
  });
});
