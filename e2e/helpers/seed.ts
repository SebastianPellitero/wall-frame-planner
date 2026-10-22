import { expect, type Locator, type Page } from "@playwright/test";

export const WALL = { width: 300, height: 250, pushGap: 3 };
export const GRID_OFF = { enabled: false, snap: true, spacingX: 10, spacingY: 10, originX: 0, originY: 0 };
export const GRID_ON = { ...GRID_OFF, enabled: true };

export type Seed = { id: string; x: number; y: number; w?: number; h?: number };

/**
 * Writes the persisted project once per tab (sessionStorage guard, so a reload keeps edits), then opens the app.
 * Pass `colors: false` for shapes without a stored color.
 */
export async function seedProject(page: Page, shapes: Seed[], opts: { grid?: typeof GRID_OFF; colors?: boolean } = {}) {
  const { grid = GRID_OFF, colors = true } = opts;
  const state = {
    wall: WALL,
    grid,
    background: { hasImage: false, x: 0, y: 0, width: 300, aspect: 1, opacity: 1, visible: true },
    shapes: shapes.map((s, i) => ({ kind: "rect", w: 40, h: 50, ...(colors ? { color: i + 1 } : {}), ...s })),
    paletteSizes: { rect: { w: 40, h: 50 }, square: { w: 30, h: 30 }, circle: { w: 30, h: 30 } },
  };
  await page.addInitScript((value) => {
    if (sessionStorage.getItem("e2e:seeded")) return;
    localStorage.setItem("wallplanner:project", value);
    sessionStorage.setItem("e2e:seeded", "1");
  }, JSON.stringify({ state, version: 1 }));
  await page.goto("/");
  await expect(page.getByTestId("wall")).toBeVisible();
}

/** A frame's committed rectangle in cm, read from its data attributes. */
export async function committed(f: Locator) {
  const [x, y, w, h] = await Promise.all(["data-x", "data-y", "data-w", "data-h"].map(async (a) => Number(await f.getAttribute(a))));
  return { x, y, w, h };
}
