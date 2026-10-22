import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { makeJpeg } from "./helpers/photo";
import { createPointer, drag, type Pointer, type Point } from "./helpers/pointer";
import { WALL, committed } from "./helpers/seed";

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";
/** ghostTouchLiftPx (lib/physics.ts): on touch the ghost's bottom edge sits this far above the finger. */
const TOUCH_LIFT_PX = 12;

const frames = (page: Page) => page.getByTestId("frame");
const creator = (page: Page) => page.getByRole("region", { name: "Frame creator" });
const selection = (page: Page) => page.getByRole("region", { name: "Selected frame" });
const preview = (page: Page) => page.getByRole("button", { name: /^Add (rectangle|square|circle), / });
const photoTools = (page: Page) => page.getByRole("region", { name: "Photo tools" });
const photo = (page: Page) => page.getByTestId("background-photo");
const mode = (page: Page, name: string) => page.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name, exact: true });

type Grid = { enabled: boolean; snap: boolean; spacingX: number; spacingY: number; originX: number; originY: number };
type Stored = { grid: Grid; background: { hasImage: boolean; width: number }; shapes: { id: string }[] };
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("wallplanner:project")!).state as Stored);

const center = async (l: Locator): Promise<Point> => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function tap(pointer: Pointer, l: Locator) {
  await l.scrollIntoViewIfNeeded();
  await pointer.down(await center(l));
  await pointer.up();
}

async function typeCm(page: Page, name: string, value: string) {
  const field = page.getByRole("textbox", { name, exact: true });
  await field.fill(value);
  await field.press("Tab");
}

/** Where the finger (or cursor) goes so the ghost's center lands on `target`. */
function pointerFor(target: Point, ghostHeightPx: number, testInfo: TestInfo): Point {
  if (!testInfo.project.use.hasTouch) return target;
  return { x: target.x, y: target.y + TOUCH_LIFT_PX + ghostHeightPx / 2 };
}

/** The Deselect button on the phone landscape rail, Esc on desktop (which has none). */
async function deselect(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name === "desktop") await page.keyboard.press("Escape");
  else await selection(page).getByRole("button", { name: "Deselect" }).click();
  await expect(selection(page)).toHaveCount(0);
}

/** Every frame's id, rectangle and color as drawn in the DOM, sorted by id. */
function snapshot(page: Page) {
  return frames(page).evaluateAll((els) =>
    els
      .map((el) => ({
        id: el.getAttribute("data-shape-id")!,
        x: el.getAttribute("data-x"),
        y: el.getAttribute("data-y"),
        w: el.getAttribute("data-w"),
        h: el.getAttribute("data-h"),
        color: el.getAttribute("data-frame-color"),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

type Box = { x: number; y: number; w: number; h: number };
const apart = (a: Box, b: Box, gap = WALL.pushGap - 0.01) =>
  a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;

/** Whether `v` sits on a 10 cm grid line that starts at `origin` (to the 0.1 cm the store rounds to). */
const onLine = (v: number, origin: number) => {
  const r = (((v - origin) % 10) + 10) % 10;
  return Math.min(r, 10 - r) < 0.06;
};

test("journey: photo, grid, frames, snap, push, history, reload", async ({ page }, testInfo) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto("/");
  await expect(page.getByTestId("wall")).toBeVisible();
  const pointer = await createPointer(page, testInfo);
  const box = (await page.getByTestId("wall").boundingBox())!;
  const ppc = box.width / WALL.width;
  const onWall = (cm: Point): Point => ({ x: box.x + cm.x * ppc, y: box.y + cm.y * ppc });

  // 1. Photo: upload, scale a little, Done.
  await mode(page, "Photo").click();
  const chooser = page.waitForEvent("filechooser");
  await photoTools(page).getByRole("button", { name: "Upload photo" }).click();
  await (await chooser).setFiles({ name: "wall.jpg", mimeType: "image/jpeg", buffer: await makeJpeg(page) });
  await expect(photo(page)).toBeVisible();
  await expect.poll(async () => (await stored(page)).background.hasImage).toBe(true);
  const widthBefore = (await stored(page)).background.width;
  await photoTools(page).getByRole("slider", { name: "Scale" }).press("ArrowRight");
  await expect.poll(async () => (await stored(page)).background.width).toBeGreaterThan(widthBefore);
  await photoTools(page).getByRole("button", { name: "Done" }).click();
  await expect(mode(page, "Arrange")).toBeChecked();

  // 2. Matrix control: 10 x 10, grid on.
  await typeCm(page, "Grid width (cm)", "10");
  await typeCm(page, "Grid height (cm)", "10");
  const show = page.getByRole("region", { name: "Matrix control" }).getByRole("switch", { name: "Show grid" });
  await show.click();
  await expect(show).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("grid").locator("line[data-line]").first()).toBeAttached();

  // 3. Grid origin: tap the wall's center, Done.
  await mode(page, "Grid origin").click();
  const originTools = page.getByRole("region", { name: "Grid origin" });
  await tap(pointer, page.getByTestId("wall"));
  await expect(originTools.getByText(/^Grid starts at/)).not.toHaveText("Grid starts at 0 × 0 cm");
  await originTools.getByRole("button", { name: "Done" }).click();
  await expect(mode(page, "Arrange")).toBeChecked();
  const grid = (await stored(page)).grid;
  expect(grid).toMatchObject({ enabled: true, snap: true, spacingX: 10, spacingY: 10 });
  expect(Math.abs(grid.originX - WALL.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(grid.originY - WALL.height / 2)).toBeLessThanOrEqual(1);

  // 4. Generate 40 x 60, drag the preview onto the wall.
  await typeCm(page, "Height (cm)", "60");
  await typeCm(page, "Width (cm)", "40");
  await creator(page).getByRole("button", { name: "Generate" }).click();
  await expect(preview(page)).toHaveAccessibleName("Add rectangle, 40 × 60 cm");
  await drag(pointer, await center(preview(page)), pointerFor(onWall({ x: 80, y: 70 }), 60 * ppc, testInfo));
  await expect(frames(page)).toHaveCount(1);
  const rect = frames(page).first();
  await expect(rect).toHaveAttribute("data-w", "40.0");
  await expect(rect).toHaveAttribute("data-h", "60.0");
  await expect(rect).toHaveAttribute("aria-pressed", "true");
  const rectId = (await rect.getAttribute("data-shape-id"))!;
  await deselect(page, testInfo);

  // 5. A 30 cm square, tapped in twice.
  await creator(page).getByRole("radio", { name: "Square" }).click();
  await typeCm(page, "Side (cm)", "30");
  await creator(page).getByRole("button", { name: "Generate" }).click();
  await expect(preview(page)).toHaveAccessibleName("Add square, 30 × 30 cm");
  for (let i = 0; i < 2; i++) {
    await tap(pointer, preview(page));
    await expect(frames(page)).toHaveCount(i + 2);
  }
  const squares = page.locator('[data-testid="frame"][data-kind="square"]');
  await expect(squares).toHaveCount(2);
  const colors = await frames(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-frame-color")));
  // Colors are random but never repeat back to back, so each frame differs from the one added before it.
  for (const c of colors) expect(c).toMatch(/^([1-9]|10)$/);
  expect(colors[1]).not.toBe(colors[0]);
  expect(colors[2]).not.toBe(colors[1]);

  const centerOnScreen = async (l: Locator) => {
    const r = await committed(l);
    return { r, at: onWall({ x: r.x + r.w / 2, y: r.y + r.h / 2 }) };
  };

  // 6a. Snap: release 1.5 cm past a grid line on both axes; the frame lands on the line.
  {
    const { r, at } = await centerOnScreen(rect);
    const wantX = grid.originX + 10 * Math.round((r.x + 30 - grid.originX) / 10) + 1.5;
    const wantY = grid.originY + 10 * Math.round((r.y + 30 - grid.originY) / 10) + 1.5;
    await drag(pointer, at, { x: at.x + (wantX - r.x) * ppc, y: at.y + (wantY - r.y) * ppc }, async () => {
      await expect(page.getByTestId("snap-guide").first()).toBeVisible();
    });
    await expect(page.getByTestId("snap-guide")).toHaveCount(0);
    await expect
      .poll(async () => {
        const s = await committed(rect);
        return onLine(s.x, grid.originX) && onLine(s.y, grid.originY);
      })
      .toBe(true);
    await deselect(page, testInfo);
  }

  // 6b. Push: drop the rectangle onto a square; the square is pushed clear.
  {
    const square = squares.first();
    const squareBefore = await committed(square);
    const { at } = await centerOnScreen(rect);
    await drag(pointer, at, onWall({ x: squareBefore.x + squareBefore.w / 2, y: squareBefore.y + squareBefore.h / 2 }));
    await expect
      .poll(async () => {
        const s = await committed(square);
        return s.x !== squareBefore.x || s.y !== squareBefore.y;
      })
      .toBe(true);
    const all = await Promise.all([0, 1, 2].map((i) => committed(frames(page).nth(i))));
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(apart(all[i], all[j])).toBe(true);
    await deselect(page, testInfo);
  }

  // 7. Duplicate, delete the copy; Undo brings it back, Redo removes it again.
  await tap(pointer, rect);
  await expect(rect).toHaveAttribute("aria-pressed", "true");
  await selection(page).getByRole("button", { name: "Duplicate" }).click();
  await expect(frames(page)).toHaveCount(4);
  const copy = page.locator(`[data-testid="frame"][aria-pressed="true"]:not([data-shape-id="${rectId}"])`);
  await expect(copy).toHaveCount(1);
  const copyId = (await copy.getAttribute("data-shape-id"))!;
  await selection(page).getByRole("button", { name: "Delete" }).click();
  await expect(frames(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(frames(page)).toHaveCount(4);
  await expect(page.locator(`[data-shape-id="${copyId}"]`)).toHaveCount(1);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(frames(page)).toHaveCount(3);
  await expect(page.locator(`[data-shape-id="${copyId}"]`)).toHaveCount(0);

  // 8. Reload: frames, grid, origin and photo all come back.
  await expect(async () => {
    const ids = (await stored(page)).shapes.map((s) => s.id).sort();
    expect(ids).toEqual((await snapshot(page)).map((f) => f.id));
  }).toPass();
  const before = { frames: await snapshot(page), state: await stored(page), photoBox: (await photo(page).boundingBox())! };
  await page.screenshot({ path: `${SHOTS}/t11-${testInfo.project.name}-journey.png` });

  await page.reload();
  await expect(page.getByTestId("wall")).toBeVisible();
  await expect(frames(page)).toHaveCount(3);
  await expect(photo(page)).toBeVisible();
  expect(await snapshot(page)).toEqual(before.frames);
  const after = await stored(page);
  expect(after.grid).toEqual(before.state.grid);
  expect(after.background).toEqual(before.state.background);
  await expect(page.getByRole("switch", { name: "Show grid" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("textbox", { name: "Grid width (cm)", exact: true })).toHaveValue("10");
  await expect(page.getByRole("textbox", { name: "Grid height (cm)", exact: true })).toHaveValue("10");
  await expect(page.getByTestId("grid").locator("line[data-line]").first()).toBeAttached();
  await expect
    .poll(async () => {
      const b = (await photo(page).boundingBox())!;
      return Math.abs(b.x - before.photoBox.x) + Math.abs(b.y - before.photoBox.y) + Math.abs(b.width - before.photoBox.width);
    })
    .toBeLessThan(2);

  // No sideways scroll, no console errors, no page errors.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(problems).toEqual([]);
});
