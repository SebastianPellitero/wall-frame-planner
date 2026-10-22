import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { createPointer, createTouchPointer } from "./helpers/pointer";

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";

type Seed = { id: string; x: number; y: number; w?: number; h?: number };

/** Writes the persisted project once per tab (sessionStorage guard), then opens the app. */
async function seed(page: Page, shapes: Seed[]) {
  const state = {
    wall: { width: 300, height: 250, pushGap: 3 },
    grid: { enabled: false, snap: true, spacingX: 10, spacingY: 10, originX: 0, originY: 0 },
    background: { hasImage: false, x: 0, y: 0, width: 300, aspect: 1, opacity: 1, visible: true },
    shapes: shapes.map((s, i) => ({ kind: "rect", w: 40, h: 50, color: i + 1, ...s })),
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

const isDesktop = (testInfo: TestInfo) => testInfo.project.name === "desktop";
const settingsDialog = (page: Page) => page.getByRole("dialog", { name: "Settings" });

/** Where the settings live: the sheet on phones (opened here), the right panel on desktop. */
async function openSettings(page: Page, testInfo: TestInfo): Promise<Page | Locator> {
  if (isDesktop(testInfo)) return page;
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(settingsDialog(page)).toBeVisible();
  return settingsDialog(page);
}

async function wallBox(page: Page) {
  return (await page.getByTestId("wall").boundingBox())!;
}

/** The sheet's right or bottom edge, once its slide-in has settled. */
async function edge(sheet: Locator, side: "right" | "bottom") {
  const box = (await sheet.boundingBox())!;
  return Math.round(side === "right" ? box.x + box.width : box.y + box.height);
}

async function commit(scope: Page | Locator, name: string, value: string) {
  const field = scope.getByRole("textbox", { name, exact: true });
  await field.fill(value);
  await field.press("Enter");
}

test.describe("settings", () => {
  test("phone landscape: a right side sheet that leaves the wall partly visible; Esc closes it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone-landscape", "landscape only");
    await page.goto("/");
    const wall = await wallBox(page);
    await openSettings(page, testInfo);
    const sheet = settingsDialog(page);
    const viewport = page.viewportSize()!;
    await expect.poll(() => edge(sheet, "right")).toBe(viewport.width);
    const box = (await sheet.boundingBox())!;
    expect(wall.x).toBeLessThan(box.x - 40);
    await expect(sheet.getByRole("textbox", { name: "Wall width (cm)" })).toBeVisible();
    // The Matrix control lives in the left rail here, never twice.
    await expect(sheet.getByRole("region", { name: "Matrix control" })).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/t8-${testInfo.project.name}-settings.png` });

    // A tap on plain text keeps focus in the dialog, so Tab and Esc still belong to it.
    await sheet.getByText("Space kept between frames when they push each other apart.").click();
    await expect(sheet).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(sheet.getByRole("button", { name: "Close settings" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(settingsDialog(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "Settings" })).toBeFocused();
  });

  test("desktop: the sections sit in the right panel, with no Settings button", async ({ page }, testInfo) => {
    test.skip(!isDesktop(testInfo), "desktop only");
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Wall" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Grid", exact: true })).toBeVisible();
    await expect(page.getByRole("switch", { name: "Snap to grid" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Set origin on the wall" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Wall width (cm)", exact: true })).toHaveCount(1);
    await expect(page.getByRole("textbox", { name: "Grid width (cm)", exact: true })).toHaveCount(1);
    await expect(page.getByRole("switch", { name: "Show grid", exact: true })).toHaveCount(1);
    await page.screenshot({ path: `${SHOTS}/t8-${testInfo.project.name}-settings.png` });
  });

  test("a 200 cm wall width redraws the wall at 200:250 and clamps a frame inside", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 250, y: 20 }]);
    const scope = await openSettings(page, testInfo);
    await commit(scope, "Wall width (cm)", "200");

    await expect
      .poll(async () => {
        const box = await wallBox(page);
        return Math.abs(box.width / box.height - 200 / 250) / (200 / 250);
      })
      .toBeLessThan(0.01);
    const frame = page.locator('[data-testid="frame"][data-shape-id="a"]');
    await expect.poll(async () => Number(await frame.getAttribute("data-x"))).toBe(160);
    // Drawn inside the wall too, once it has slid in (where the scale is unchanged, a clamp is a plain move).
    const wall = await wallBox(page);
    await expect
      .poll(async () => {
        const f = (await frame.boundingBox())!;
        return f.x + f.width <= wall.x + wall.width + 1;
      })
      .toBe(true);
  });

  test("Show grid with 20 cm spacing draws the lines", async ({ page }) => {
    await page.goto("/");
    // Landscape and desktop: the Matrix control sits in the left panel.
    const lines = page.getByTestId("grid").locator("line[data-line]");
    await expect(lines).toHaveCount(0);
    await page.getByRole("switch", { name: "Show grid" }).click();
    await commit(page, "Grid width (cm)", "20");
    await commit(page, "Grid height (cm)", "20");
    // x: 0, 20, … 300 (16 lines); y: 0, 20, … 240 (13 lines), the two through the origin included.
    await expect(lines).toHaveCount(16 + 13);
    await expect(page.getByTestId("grid").locator("line[data-line='origin']")).toHaveCount(2);
  });

  test("Grid origin: a tap on the wall sets the origin, and Done returns to Arrange", async ({ page }, testInfo) => {
    await page.goto("/");
    const radio = (name: string) => page.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name, exact: true });
    await radio("Grid origin").click();
    const tools = page.getByRole("region", { name: "Grid origin" });
    await expect(tools.getByText("Tap the wall where the grid should start.")).toBeVisible();
    // Entering the mode turns the grid on.
    await expect(page.getByTestId("grid").locator("line[data-line]").first()).toBeAttached();

    const box = await wallBox(page);
    const ppc = box.width / 300;
    const pointer = await createPointer(page, testInfo);
    await pointer.down({ x: box.x + 60 * ppc, y: box.y + 40 * ppc });
    await pointer.up();

    const readout = tools.getByText(/^Grid starts at/);
    await expect(readout).not.toHaveText("Grid starts at 0 × 0 cm");
    const [x, y] = ((await readout.textContent()) ?? "").match(/[\d.]+/g)!.map(Number);
    expect(Math.abs(x - 60)).toBeLessThanOrEqual(1);
    expect(Math.abs(y - 40)).toBeLessThanOrEqual(1);
    await expect(radio("Grid origin")).toBeChecked();

    await tools.getByRole("button", { name: "Done" }).click();
    await expect(radio("Arrange")).toBeChecked();
  });
});

test.describe("settings, phone portrait", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  async function openSheet(page: Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).tap();
    const sheet = settingsDialog(page);
    await expect(sheet).toBeVisible();
    await expect.poll(() => edge(sheet, "bottom")).toBe(844);
    return sheet;
  }

  /** A real touch drag from the sheet's grab handle, away from the Close button. */
  async function dragHeader(page: Page, sheet: Locator, steps: { dy: number; pauseMs: number }[]) {
    const header = (await sheet.getByTestId("settings-header").boundingBox())!;
    const pointer = await createTouchPointer(page);
    const from = { x: header.x + header.width * 0.4, y: header.y + 10 };
    await pointer.down(from);
    for (const { dy, pauseMs } of steps) {
      await pointer.move({ x: from.x, y: from.y + dy }, 4);
      if (pauseMs) await page.waitForTimeout(pauseMs);
    }
    await pointer.up();
  }

  test("the bottom sheet scrolls to its last section and closes when its header is dragged down", async ({ page }, testInfo) => {
    const sheet = await openSheet(page);
    // Stacked: the Matrix control is in here.
    await expect(sheet.getByRole("switch", { name: "Show grid" })).toBeVisible();
    if (isDesktop(testInfo)) await page.screenshot({ path: `${SHOTS}/t8-portrait-settings.png` });

    const body = sheet.getByTestId("settings-body");
    const { scrollHeight, clientHeight } = await body.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    const last = sheet.getByRole("button", { name: "Set origin on the wall" });
    await expect(last).not.toBeInViewport();
    await body.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect(last).toBeInViewport();

    await dragHeader(page, sheet, [{ dy: 260, pauseMs: 0 }]);
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: "Settings" })).toBeFocused();
  });

  test("a short, slow header drag springs the sheet back open", async ({ page }) => {
    const sheet = await openSheet(page);
    // Under 25% of the sheet's height, and still at the end, so no flick.
    await dragHeader(page, sheet, [
      { dy: 20, pauseMs: 60 },
      { dy: 40, pauseMs: 200 },
    ]);
    await expect.poll(() => edge(sheet, "bottom")).toBe(844);
    await expect(sheet).toBeVisible();
  });
});
