import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createPointer, drag, type Pointer, type Point } from "./helpers/pointer";

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";
const WALL = { width: 300, height: 250 };
/** ghostTouchLiftPx (lib/physics.ts): on touch the ghost's bottom edge sits this far above the finger. */
const TOUCH_LIFT_PX = 12;

async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("wall")).toBeVisible();
  const box = (await page.getByTestId("wall").boundingBox())!;
  return { box, ppc: box.width / WALL.width };
}

const center = async (l: Locator): Promise<Point> => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

const frames = (page: Page) => page.getByTestId("frame");
const preview = (page: Page) => page.getByRole("button", { name: /^Add (rectangle|square|circle), / });
const creator = (page: Page) => page.getByRole("region", { name: "Frame creator" });

async function committed(f: Locator) {
  const [x, y, w, h] = await Promise.all(["data-x", "data-y", "data-w", "data-h"].map(async (a) => Number(await f.getAttribute(a))));
  return { x, y, w, h };
}

/** Where the finger (or cursor) goes so the ghost's center lands on `target`. */
function pointerFor(target: Point, ghostHeightPx: number, testInfo: TestInfo): Point {
  if (!testInfo.project.use.hasTouch) return target;
  return { x: target.x, y: target.y + TOUCH_LIFT_PX + ghostHeightPx / 2 };
}

async function typeCm(page: Page, name: string, value: string) {
  const field = page.getByRole("textbox", { name, exact: true });
  await field.fill(value);
  await field.press("Tab");
}

async function generate(page: Page) {
  await creator(page).getByRole("button", { name: "Generate" }).click();
}

async function tap(pointer: Pointer, l: Locator) {
  await l.scrollIntoViewIfNeeded();
  await pointer.down(await center(l));
  await pointer.up();
}

test.describe("frame creator", () => {
  test("Height 60 / Width 40 → Generate → drag the preview: a 40 × 60 frame in the preview's color lands at the drop point", async ({ page }, testInfo) => {
    const { box, ppc } = await open(page);
    await typeCm(page, "Height (cm)", "60");
    await typeCm(page, "Width (cm)", "40");
    // Typed sizes are drafts until Generate.
    await expect(preview(page)).toHaveAccessibleName("Add rectangle, 40 × 50 cm");
    const before = await preview(page).getAttribute("data-frame-color");
    await generate(page);
    await expect(preview(page)).toHaveAccessibleName("Add rectangle, 40 × 60 cm");
    const color = await preview(page).getAttribute("data-frame-color");
    expect(color).not.toBe(before);

    const pointer = await createPointer(page, testInfo);
    const targetCm = { x: 120, y: 100 };
    const target = { x: box.x + targetCm.x * ppc, y: box.y + targetCm.y * ppc };
    await drag(pointer, await center(preview(page)), pointerFor(target, 60 * ppc, testInfo), async () => {
      await expect(page.getByTestId("drag-ghost")).toHaveAttribute("data-frame-color", color!);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/t6c-${testInfo.project.name}-ghost.png` });
    });

    await expect(frames(page)).toHaveCount(1);
    await expect(page.getByTestId("drag-ghost")).toHaveCount(0);
    const f = frames(page).first();
    await expect(f).toHaveAttribute("data-w", "40.0");
    await expect(f).toHaveAttribute("data-h", "60.0");
    await expect(f).toHaveAttribute("data-frame-color", color!);
    const r = await committed(f);
    expect(Math.abs(r.x + r.w / 2 - targetCm.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.y + r.h / 2 - targetCm.y)).toBeLessThanOrEqual(2);
    // A drop selects the frame; stacked and landscape swap the creator for the selection panel.
    await expect(f).toHaveAttribute("aria-pressed", "true");
  });

  test("the next frame added has a different color", async ({ page }, testInfo) => {
    await open(page);
    const pointer = await createPointer(page, testInfo);
    await tap(pointer, preview(page));
    await expect(frames(page)).toHaveCount(1);
    await tap(pointer, preview(page));
    await expect(frames(page)).toHaveCount(2);
    const [a, b] = await Promise.all([0, 1].map((i) => frames(page).nth(i).getAttribute("data-frame-color")));
    expect(a).toMatch(/^([1-9]|10)$/);
    expect(b).not.toBe(a);
    // The preview already wears the next color.
    expect(await preview(page).getAttribute("data-frame-color")).not.toBe(b);
  });

  test("Circle → Diameter 30 → Generate → tap the preview adds a circle", async ({ page }, testInfo) => {
    await open(page);
    await creator(page).getByRole("radio", { name: "Circle" }).click();
    await expect(page.getByRole("textbox", { name: "Height (cm)", exact: true })).toHaveCount(0);
    await typeCm(page, "Diameter (cm)", "30");
    await generate(page);
    await expect(preview(page)).toHaveAccessibleName("Add circle, Ø 30 cm");
    const pointer = await createPointer(page, testInfo);
    await tap(pointer, preview(page));
    await expect(page.locator('[data-testid="frame"][data-kind="circle"][data-w="30.0"]')).toHaveCount(1);
    await expect(frames(page).first()).toHaveAttribute("aria-pressed", "false");
  });

  test("dropping off the wall adds nothing and the ghost flies back", async ({ page }, testInfo) => {
    const { box } = await open(page);
    const pointer = await createPointer(page, testInfo);
    const color = await preview(page).getAttribute("data-frame-color");
    const offWall = { x: box.x - 6, y: box.y + box.height / 2 };
    await drag(pointer, await center(preview(page)), offWall, async () => {
      await expect(page.getByTestId("drag-ghost")).toBeVisible();
    });
    await expect(page.getByTestId("drag-ghost")).toHaveCount(0);
    await expect(frames(page)).toHaveCount(0);
    // No add, no roll.
    await expect(preview(page)).toHaveAttribute("data-frame-color", color!);
  });

  test("tapping twice adds two unselected squares that don't overlap", async ({ page }, testInfo) => {
    await open(page);
    await creator(page).getByRole("radio", { name: "Square" }).click();
    const pointer = await createPointer(page, testInfo);
    for (let i = 0; i < 2; i++) {
      await tap(pointer, preview(page));
      await expect(frames(page)).toHaveCount(i + 1);
    }
    const [a, b] = await Promise.all([committed(frames(page).nth(0)), committed(frames(page).nth(1))]);
    const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
    expect(apart).toBe(true);
    await expect(page.locator('[data-testid="frame"][data-kind="square"][aria-pressed="false"]')).toHaveCount(2);
    await expect(creator(page).getByRole("radio", { name: "Square" })).toHaveAttribute("aria-checked", "true");
  });

  test("Matrix: Grid width 20, Grid height 25, Show grid on → lines at those spacings; colored square frames", async ({ page }, testInfo) => {
    const { ppc } = await open(page);
    const matrix = page.getByRole("region", { name: "Matrix control" });
    await typeCm(page, "Grid width (cm)", "20");
    await typeCm(page, "Grid height (cm)", "25");
    await expect(page.getByTestId("grid")).toHaveCount(0);
    const show = matrix.getByRole("switch", { name: "Show grid" });
    await show.click();
    await expect(show).toHaveAttribute("aria-checked", "true");

    const lines = await page.getByTestId("grid").locator("line[data-line]").evaluateAll((els) =>
      els.map((l) => ({ x1: Number(l.getAttribute("x1")), x2: Number(l.getAttribute("x2")), y1: Number(l.getAttribute("y1")), y2: Number(l.getAttribute("y2")) })),
    );
    const xs = lines.filter((l) => l.x1 === l.x2).map((l) => l.x1).sort((a, b) => a - b);
    const ys = lines.filter((l) => l.y1 === l.y2).map((l) => l.y1).sort((a, b) => a - b);
    // Origin (0, 0): 0, 20, … 300 and 0, 25, … 250.
    expect(xs).toHaveLength(WALL.width / 20 + 1);
    expect(ys).toHaveLength(WALL.height / 25 + 1);
    for (let i = 1; i < xs.length; i++) expect(Math.abs(xs[i] - xs[i - 1] - 20 * ppc)).toBeLessThanOrEqual(1);
    for (let i = 1; i < ys.length; i++) expect(Math.abs(ys[i] - ys[i - 1] - 25 * ppc)).toBeLessThanOrEqual(1);

    // Three frames, each a different finish, with square corners.
    const pointer = await createPointer(page, testInfo);
    for (let i = 0; i < 3; i++) {
      await tap(pointer, preview(page));
      await expect(frames(page)).toHaveCount(i + 1);
    }
    const colors = await frames(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-frame-color")));
    expect(colors[1]).not.toBe(colors[0]);
    expect(colors[2]).not.toBe(colors[1]);
    const radii = await page.locator('[data-testid="frame"][data-kind="rect"], [data-testid="frame"][data-kind="rect"] *').evaluateAll((els) =>
      [...new Set(els.map((el) => getComputedStyle(el).borderRadius))],
    );
    expect(radii).toEqual(["0px"]);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/t6c-${testInfo.project.name}.png` });
  });
});

test.describe("frame colors", () => {
  test("a frame's shadow keyline follows its color (utilities on the colored subtree)", async ({ page }) => {
    const shape = { kind: "rect", y: 50, w: 40, h: 50 };
    const state = { shapes: [{ ...shape, id: "one", x: 30, color: 1 }, { ...shape, id: "three", x: 150, color: 3 }] };
    await page.addInitScript((value) => localStorage.setItem("wallplanner:project", value), JSON.stringify({ state, version: 1 }));
    await open(page);
    const shadow = (id: string) =>
      page.locator(`[data-testid="frame"][data-shape-id="${id}"] [data-frame-body]`).evaluate((el) => getComputedStyle(el).boxShadow);
    const [one, three] = [await shadow("one"), await shadow("three")];
    expect(one).not.toBe("none");
    expect(one).not.toBe(three);
    await expect(frames(page).nth(0)).toHaveAttribute("data-frame-color", "1");
    await expect(frames(page).nth(1)).toHaveAttribute("data-frame-color", "3");
  });
});

test.describe("phone portrait dock", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("shows the creator's fields and Generate, and an invalid value's helper, inside the dock", async ({ page }) => {
    await open(page);
    const dock = (await page.getByTestId("context-panel").boundingBox())!;
    const inDock = async (l: Locator) => {
      await expect(l).toBeVisible();
      const b = (await l.boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(dock.y - 0.5);
      expect(b.y + b.height).toBeLessThanOrEqual(dock.y + dock.height + 0.5);
    };
    for (const l of [
      page.getByRole("textbox", { name: "Width (cm)", exact: true }),
      page.getByRole("textbox", { name: "Height (cm)", exact: true }),
      creator(page).getByRole("button", { name: "Generate" }),
      preview(page),
      creator(page).getByRole("radio", { name: "Rectangle" }),
    ]) {
      await inDock(l);
    }
    const width = page.getByRole("textbox", { name: "Width (cm)", exact: true });
    await width.fill("999");
    await width.press("Enter");
    await expect(width).toHaveAttribute("aria-invalid", "true");
    await inDock(page.getByText("Use 1–300 cm"));
    await page.screenshot({ path: `${SHOTS}/t6c-stacked.png` });
  });
});
