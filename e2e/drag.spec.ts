import { expect, test, type Page } from "@playwright/test";
import { createPointer, drag, type Point } from "./helpers/pointer";
import { GRID_OFF, GRID_ON, WALL, committed, seedProject, type Seed } from "./helpers/seed";

const seed = (page: Page, shapes: Seed[], grid = GRID_OFF) => seedProject(page, shapes, { grid, colors: false });

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";


async function wallScale(page: Page) {
  const box = (await page.getByTestId("wall").boundingBox())!;
  return { box, ppc: box.width / WALL.width };
}

const frame = (page: Page, id: string) => page.locator(`[data-testid="frame"][data-shape-id="${id}"]`);


/** Screen point at the committed center of a frame. */
async function centerOf(page: Page, id: string): Promise<Point> {
  const { box, ppc } = await wallScale(page);
  const r = await committed(frame(page, id));
  return { x: box.x + (r.x + r.w / 2) * ppc, y: box.y + (r.y + r.h / 2) * ppc };
}

const plus = (p: Point, dx: number, dy: number): Point => ({ x: p.x + dx, y: p.y + dy });

test.describe("frame drag", () => {
  test("moves a frame by the dragged distance", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 50, y: 50 }]);
    const { ppc } = await wallScale(page);
    const pointer = await createPointer(page, testInfo);
    const from = await centerOf(page, "a");
    await drag(pointer, from, plus(from, 60 * ppc, 40 * ppc));

    const r = await committed(frame(page, "a"));
    expect(Math.abs(r.x - 110)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(r.y - 90)).toBeLessThanOrEqual(1.5);
  });

  test("snaps to the grid on release and shows the guide mid-drag", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 50, y: 50 }], GRID_ON);
    const { ppc } = await wallScale(page);
    const pointer = await createPointer(page, testInfo);
    const from = await centerOf(page, "a");
    // Raw top-left (111.5, 51.5): 1.5 cm from the 110 and 50 lines.
    await drag(pointer, from, plus(from, 61.5 * ppc, 1.5 * ppc), async () => {
      await expect(page.getByTestId("snap-guide").first()).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/t5-${testInfo.project.name}-dragging.png` });
    });

    await expect(frame(page, "a")).toHaveAttribute("data-x", "110.0");
    await expect(frame(page, "a")).toHaveAttribute("data-y", "50.0");
    await expect(page.getByTestId("snap-guide")).toHaveCount(0);
  });

  test("dropping onto a neighbor pushes it clear by the gap", async ({ page }, testInfo) => {
    await seed(page, [
      { id: "a", x: 50, y: 100 },
      { id: "b", x: 150, y: 100 },
    ]);
    const { ppc } = await wallScale(page);
    const pointer = await createPointer(page, testInfo);
    const from = await centerOf(page, "a");
    await drag(pointer, from, plus(from, 90 * ppc, 0));

    const a = await committed(frame(page, "a"));
    const b = await committed(frame(page, "b"));
    expect(Math.abs(a.x - 140)).toBeLessThanOrEqual(1.5);
    expect(b).not.toEqual({ x: 150, y: 100, w: 40, h: 50 });
    const gap = WALL.pushGap - 0.01;
    const apart = a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;
    expect(apart).toBe(true);
  });

  test("dragging past the right edge leaves the frame inside the wall", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 200, y: 100 }]);
    const { box } = await wallScale(page);
    const viewport = page.viewportSize()!;
    const pointer = await createPointer(page, testInfo);
    const from = await centerOf(page, "a");
    const to = { x: Math.min(box.x + box.width + 80, viewport.width - 4), y: from.y };
    await drag(pointer, from, to, async () => {
      // Rubber band: drawn past the edge while held.
      const held = (await frame(page, "a").boundingBox())!;
      expect(held.x + held.width).toBeGreaterThan(box.x + box.width);
    });

    await expect(frame(page, "a")).toHaveAttribute("data-x", "260.0");
    await expect
      .poll(async () => {
        const f = (await frame(page, "a").boundingBox())!;
        return f.x + f.width <= box.x + box.width + 0.5;
      })
      .toBe(true);
  });

  test("a drag never scrolls the page", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 100, y: 50 }]);
    const { ppc } = await wallScale(page);
    const pointer = await createPointer(page, testInfo);
    const from = await centerOf(page, "a");
    await drag(pointer, from, plus(from, 10 * ppc, 120 * ppc), async () => {
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(Math.abs((await committed(frame(page, "a"))).y - 170)).toBeLessThanOrEqual(1.5);
  });

  test("a reload keeps the committed position", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 50, y: 50 }]);
    const { ppc } = await wallScale(page);
    const pointer = await createPointer(page, testInfo);
    const from = await centerOf(page, "a");
    await drag(pointer, from, plus(from, 80 * ppc, 30 * ppc));
    const before = await committed(frame(page, "a"));
    expect(before.x).not.toBe(50);

    await page.reload();
    await expect(frame(page, "a")).toHaveAttribute("data-x", before.x.toFixed(1));
    await expect(frame(page, "a")).toHaveAttribute("data-y", before.y.toFixed(1));
  });
});
