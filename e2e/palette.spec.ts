import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createPointer, drag, type Point } from "./helpers/pointer";

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

async function committed(f: Locator) {
  const [x, y, w, h] = await Promise.all(["data-x", "data-y", "data-w", "data-h"].map(async (a) => Number(await f.getAttribute(a))));
  return { x, y, w, h };
}

/** Where the finger (or cursor) goes so the ghost's center lands on `target`. */
function pointerFor(target: Point, ghostHeightPx: number, testInfo: TestInfo): Point {
  if (!testInfo.project.use.hasTouch) return target;
  return { x: target.x, y: target.y + TOUCH_LIFT_PX + ghostHeightPx / 2 };
}

test.describe("palette", () => {
  test("dragging the Rectangle tile drops a selected frame centered on the drop point", async ({ page }, testInfo) => {
    const { box, ppc } = await open(page);
    const pointer = await createPointer(page, testInfo);
    const tile = page.getByRole("button", { name: "Add rectangle, 40 × 50 cm" });
    const targetCm = { x: 120, y: 100 };
    const target = { x: box.x + targetCm.x * ppc, y: box.y + targetCm.y * ppc };

    await drag(pointer, await center(tile), pointerFor(target, 50 * ppc, testInfo), async () => {
      await expect(page.getByTestId("drag-ghost")).toBeVisible();
      // Let the ghost finish growing to its true size before the shot.
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/t6-${testInfo.project.name}-ghost.png` });
    });

    await expect(frames(page)).toHaveCount(1);
    await expect(page.getByTestId("drag-ghost")).toHaveCount(0);
    const r = await committed(frames(page).first());
    expect(r).toMatchObject({ w: 40, h: 50 });
    expect(Math.abs(r.x + r.w / 2 - targetCm.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(r.y + r.h / 2 - targetCm.y)).toBeLessThanOrEqual(2);
    // Stacked and landscape swap the palette for the selection panel; the frame itself says so everywhere.
    await expect(frames(page).first()).toHaveAttribute("aria-pressed", "true");
  });

  test("dropping off the wall adds nothing and the ghost flies away", async ({ page }, testInfo) => {
    const { box } = await open(page);
    const pointer = await createPointer(page, testInfo);
    const tile = page.getByRole("button", { name: /^Add square/ });
    // Just left of the wall, on the stage.
    const offWall = { x: box.x - 6, y: box.y + box.height / 2 };

    await drag(pointer, await center(tile), offWall, async () => {
      await expect(page.getByTestId("drag-ghost")).toBeVisible();
    });

    await expect(page.getByTestId("drag-ghost")).toHaveCount(0);
    await expect(frames(page)).toHaveCount(0);
  });

  test("tapping Square twice adds two unselected squares that don't overlap", async ({ page }, testInfo) => {
    await open(page);
    const pointer = await createPointer(page, testInfo);
    const tile = page.getByRole("button", { name: /^Add square/ });
    for (let i = 0; i < 2; i++) {
      await pointer.down(await center(tile));
      await pointer.up();
      await expect(frames(page)).toHaveCount(i + 1);
    }

    const [a, b] = await Promise.all([committed(frames(page).nth(0)), committed(frames(page).nth(1))]);
    const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
    expect(apart).toBe(true);
    await expect(page.locator('[data-testid="frame"][data-kind="square"][aria-pressed="false"]')).toHaveCount(2);
    await expect(tile).toHaveAttribute("aria-pressed", "true");
  });

  test("a typed width of 60 makes the next dragged rectangle 60 wide", async ({ page }, testInfo) => {
    const { box, ppc } = await open(page);
    const width = page.getByRole("textbox", { name: "Width (cm)" });
    await width.fill("60");
    await width.press("Enter");
    const tile = page.getByRole("button", { name: "Add rectangle, 60 × 50 cm" });
    await expect(tile).toBeVisible();

    const pointer = await createPointer(page, testInfo);
    const target = { x: box.x + 150 * ppc, y: box.y + 125 * ppc };
    await drag(pointer, await center(tile), pointerFor(target, 50 * ppc, testInfo));

    await expect(frames(page)).toHaveCount(1);
    expect(await committed(frames(page).first())).toMatchObject({ w: 60, h: 50 });
  });
});
