import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { makeJpeg } from "./helpers/photo";
import { createPointer, drag, type Point } from "./helpers/pointer";
import { WALL, committed, seedProject } from "./helpers/seed";
import { settle } from "./helpers/settle";

const SHOTS = ".superpowers/sdd/2026-10-22-frame-photos-wall-color/shots";

type StoredPhoto = { imageId: string; aspect: number; zoom: number; focusX: number; focusY: number };
type StoredShape = { id: string; mat: boolean; photo?: StoredPhoto };

const frame = (page: Page, id = "a") => page.locator(`[data-testid="frame"][data-shape-id="${id}"]`);
const selection = (page: Page) => page.getByRole("region", { name: "Selected frame" });
const control = (page: Page, name: string) => selection(page).getByRole("button", { name, exact: true });
const photoIn = (page: Page, id = "a") => frame(page, id).getByTestId("frame-photo");

async function storedShapes(page: Page): Promise<StoredShape[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("wallplanner:project")!).state.shapes);
}
const storedPhoto = async (page: Page, id = "a") => (await storedShapes(page)).find((s) => s.id === id)?.photo;

/** The frame's center on screen, from its committed rectangle. */
async function frameCenter(page: Page, id = "a"): Promise<Point> {
  const box = (await page.getByTestId("wall").boundingBox())!;
  const ppc = box.width / WALL.width;
  const r = await committed(frame(page, id));
  return { x: box.x + (r.x + r.w / 2) * ppc, y: box.y + (r.y + r.h / 2) * ppc };
}

/** One large portrait frame, selected by a tap or click. */
async function openWithSelectedFrame(page: Page, testInfo: TestInfo) {
  await seedProject(page, [{ id: "a", x: 40, y: 40, w: 80, h: 100 }]);
  const pointer = await createPointer(page, testInfo);
  const at = await frameCenter(page);
  await pointer.down(at);
  await pointer.up();
  await expect(frame(page)).toHaveAttribute("aria-pressed", "true");
}

/** Add photo to frame through the file chooser; a landscape photo, so the portrait opening crops its sides. */
async function addPhoto(page: Page) {
  const chooser = page.waitForEvent("filechooser");
  await control(page, "Add photo to frame").click();
  await (await chooser).setFiles({ name: "frame.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page) });
  await expect(photoIn(page)).toBeVisible();
  await expect(frame(page)).toHaveAttribute("data-has-photo", "true");
  await expect.poll(async () => (await storedPhoto(page))?.imageId).toBeTruthy();
}

test.describe("frame photos", () => {
  test("add a photo to a frame; it is still there after a reload", async ({ page }, testInfo) => {
    await openWithSelectedFrame(page, testInfo);
    await expect(frame(page)).toHaveAttribute("data-has-photo", "false");
    await addPhoto(page);
    await expect(page.getByTestId("announcer")).toHaveText("Photo added");
    await expect(page.getByRole("button", { name: "Rectangle 80 × 100 cm with photo" })).toBeVisible();
    // 1200 × 800 is wider than the opening: covered, cropped at the sides.
    expect(await storedPhoto(page)).toMatchObject({ aspect: 800 / 1200, zoom: 1, focusX: 0.5, focusY: 0.5 });
    await settle(frame(page));
    await page.screenshot({ path: `${SHOTS}/t3-${testInfo.project.name}-photo-selected.png` });

    await page.reload();
    await expect(photoIn(page)).toBeVisible();
    await expect(photoIn(page)).toHaveAttribute("src", /^blob:/);
    await expect(frame(page)).toHaveAttribute("data-has-photo", "true");
    await page.screenshot({ path: `${SHOTS}/t3-${testInfo.project.name}-photo-rest.png` });
  });

  test("a duplicate shares the photo (same image, same src)", async ({ page }, testInfo) => {
    await openWithSelectedFrame(page, testInfo);
    await addPhoto(page);
    await control(page, "Duplicate").click();
    await expect(page.getByTestId("frame")).toHaveCount(2);
    const shapes = await storedShapes(page);
    expect(shapes).toHaveLength(2);
    expect(shapes[0].photo!.imageId).toBe(shapes[1].photo!.imageId);
    const srcs = await page.getByTestId("frame-photo").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")));
    expect(srcs).toHaveLength(2);
    expect(srcs[0]).toBe(srcs[1]);
  });

  test("adjust: dragging changes the crop, the frame stays put, and Undo restores it", async ({ page }, testInfo) => {
    await openWithSelectedFrame(page, testInfo);
    await addPhoto(page);
    const before = await committed(frame(page));
    await control(page, "Adjust frame photo").click();
    await expect(page.getByTestId("adjust-veil")).toBeVisible();
    await expect(selection(page).getByRole("slider", { name: "Zoom" })).toHaveAttribute("aria-valuetext", "100%");
    await expect(frame(page)).toBeFocused();

    const c = await frameCenter(page);
    const pointer = await createPointer(page, testInfo);
    await drag(pointer, c, { x: c.x + 30, y: c.y }, async () => {
      await page.screenshot({ path: `${SHOTS}/t3-${testInfo.project.name}-adjusting.png` });
    });
    // The image follows the pointer to the right: the focus moves left.
    await expect.poll(async () => (await storedPhoto(page))!.focusX).toBeLessThan(0.49);
    expect(await committed(frame(page))).toEqual(before);
    await expect(page.getByTestId("adjust-veil")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(async () => (await storedPhoto(page))!.focusX).toBe(0.5);

    await control(page, "Done").click();
    await expect(page.getByTestId("adjust-veil")).toHaveCount(0);
    await expect(control(page, "Adjust frame photo")).toBeFocused();
  });

  test("a tap on the veil ends adjust mode and keeps the selection", async ({ page }, testInfo) => {
    await openWithSelectedFrame(page, testInfo);
    await addPhoto(page);
    await control(page, "Adjust frame photo").click();
    const wall = (await page.getByTestId("wall").boundingBox())!;
    const pointer = await createPointer(page, testInfo);
    await pointer.down({ x: wall.x + wall.width - 20, y: wall.y + wall.height - 20 });
    await pointer.up();
    await expect(page.getByTestId("adjust-veil")).toHaveCount(0);
    await expect(frame(page)).toHaveAttribute("aria-pressed", "true");
    expect((await storedPhoto(page))!.focusX).toBe(0.5);
  });

  test("Mat off: the photo fills everything inside the moulding", async ({ page }, testInfo) => {
    await openWithSelectedFrame(page, testInfo);
    await addPhoto(page);
    const opening = frame(page).locator("[data-photo-opening]");
    const on = (await opening.boundingBox())!;
    const mat = selection(page).getByRole("switch", { name: "Mat" });
    await expect(mat).toHaveAttribute("aria-checked", "true");
    await mat.click();
    await expect(frame(page)).toHaveAttribute("data-mat", "false");
    await expect(mat).toHaveAttribute("aria-checked", "false");
    const off = (await opening.boundingBox())!;
    expect(off.width).toBeGreaterThan(on.width + 4);
    expect(off.height).toBeGreaterThan(on.height + 4);
    expect((await storedShapes(page))[0].mat).toBe(false);
    await page.screenshot({ path: `${SHOTS}/t3-${testInfo.project.name}-mat-off.png` });
  });

  test("Remove frame photo, then Undo brings it back", async ({ page }, testInfo) => {
    await openWithSelectedFrame(page, testInfo);
    await addPhoto(page);
    await control(page, "Remove frame photo").click();
    await expect(frame(page)).toHaveAttribute("data-has-photo", "false");
    await expect(photoIn(page)).toHaveCount(0);
    await expect(control(page, "Add photo to frame")).toBeFocused();
    expect(await storedPhoto(page)).toBeUndefined();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(frame(page)).toHaveAttribute("data-has-photo", "true");
    await expect(photoIn(page)).toBeVisible();
    expect(await storedPhoto(page)).toBeDefined();
  });
});
