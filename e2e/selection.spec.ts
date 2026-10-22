import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createPointer, type Point } from "./helpers/pointer";
import { WALL, committed, seedProject, type Seed } from "./helpers/seed";

const seed = (page: Page, shapes: Seed[]) => seedProject(page, shapes);

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";

const frame = (page: Page, id: string) => page.locator(`[data-testid="frame"][data-shape-id="${id}"]`);
const frames = (page: Page) => page.getByTestId("frame");
const selection = (page: Page) => page.getByRole("region", { name: "Selected frame" });
const creator = (page: Page) => page.getByRole("region", { name: "Frame creator" });
const selField = (page: Page, name: string) => selection(page).getByRole("textbox", { name, exact: true });

type Box = Awaited<ReturnType<typeof committed>>;
const apart = (a: Box, b: Box, gap = WALL.pushGap - 0.01) =>
  a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;

/** A tap (touch projects) or click (desktop) on the frame's committed center: selects it. */
async function selectFrame(page: Page, testInfo: TestInfo, id: string) {
  const box = (await page.getByTestId("wall").boundingBox())!;
  const ppc = box.width / WALL.width;
  const r = await committed(frame(page, id));
  const at: Point = { x: box.x + (r.x + r.w / 2) * ppc, y: box.y + (r.y + r.h / 2) * ppc };
  const pointer = await createPointer(page, testInfo);
  await pointer.down(at);
  await pointer.up();
  await expect(frame(page, id)).toHaveAttribute("aria-pressed", "true");
  await expect(selection(page)).toBeVisible();
}

async function typeAndEnter(page: Page, name: string, value: string) {
  const field = selField(page, name);
  await field.fill(value);
  await field.press("Enter");
}

test.describe("selection", () => {
  test("selecting a frame shows the selection UI", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 50, y: 50 }]);
    await expect(selection(page)).toHaveCount(0);
    await selectFrame(page, testInfo, "a");
    await expect(selection(page).getByRole("button", { name: "Duplicate" })).toBeVisible();
    await expect(selection(page).getByRole("button", { name: "Delete" })).toBeVisible();
    await expect(selField(page, "Width (cm)")).toHaveValue("40");
    await expect(selField(page, "X (cm)")).toHaveValue("50");
    await page.screenshot({ path: `${SHOTS}/t7-${testInfo.project.name}-selected.png` });
  });

  test("Duplicate creates a selected copy to the right with no overlap", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 50, y: 50 }]);
    await selectFrame(page, testInfo, "a");
    await selection(page).getByRole("button", { name: "Duplicate" }).click();

    await expect(frames(page)).toHaveCount(2);
    const copy = page.locator('[data-testid="frame"]:not([data-shape-id="a"])');
    await expect(copy).toHaveAttribute("aria-pressed", "true");
    await expect(frame(page, "a")).toHaveAttribute("aria-pressed", "false");
    await expect(copy).toHaveAttribute("data-frame-color", "1");
    const a = await committed(frame(page, "a"));
    const b = await committed(copy);
    expect(b.x).toBeGreaterThan(a.x + a.w);
    expect(apart(a, b)).toBe(true);
  });

  test("Delete removes the frame and returns to the Frame creator", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 50, y: 50 }]);
    await selectFrame(page, testInfo, "a");
    await selection(page).getByRole("button", { name: "Delete" }).click();
    await expect(page.locator('[data-shape-id="a"]')).toHaveCount(0);
    await expect(selection(page)).toHaveCount(0);
    await expect(creator(page)).toBeVisible();
  });

  test("Width 80 + Enter resizes the frame and pushes its neighbor clear", async ({ page }, testInfo) => {
    await seed(page, [
      { id: "a", x: 50, y: 100 },
      { id: "b", x: 100, y: 100 },
    ]);
    await selectFrame(page, testInfo, "a");
    await typeAndEnter(page, "Width (cm)", "80");

    await expect(frame(page, "a")).toHaveAttribute("data-w", "80.0");
    const a = await committed(frame(page, "a"));
    const b = await committed(frame(page, "b"));
    expect(a.x).toBe(50);
    expect(b.x).not.toBe(100);
    expect(apart(a, b)).toBe(true);
  });

  test("X 10 moves the frame; Undo restores it and Redo re-applies it", async ({ page }, testInfo) => {
    await seed(page, [{ id: "a", x: 50, y: 60 }]);
    await selectFrame(page, testInfo, "a");
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    await typeAndEnter(page, "X (cm)", "10");
    await expect(frame(page, "a")).toHaveAttribute("data-x", "10.0");
    await expect(frame(page, "a")).toHaveAttribute("data-y", "60.0");

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(frame(page, "a")).toHaveAttribute("data-x", "50.0");
    await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(frame(page, "a")).toHaveAttribute("data-x", "10.0");
    await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
    // Frames animate to restored spots; the drawn position ends at the committed one.
    const box = (await page.getByTestId("wall").boundingBox())!;
    await expect.poll(async () => Math.round((await frame(page, "a").boundingBox())!.x - box.x)).toBe(Math.round((10 * box.width) / WALL.width));
  });

  test("keyboard: arrows nudge, Ctrl+D duplicates, Delete deletes, Esc deselects", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "keyboard shortcuts are a desktop feature");
    await seed(page, [{ id: "a", x: 50, y: 60 }]);
    await selectFrame(page, testInfo, "a");

    await page.keyboard.press("ArrowRight");
    await expect(frame(page, "a")).toHaveAttribute("data-x", "51.0");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(frame(page, "a")).toHaveAttribute("data-x", "61.0");
    await page.keyboard.press("ArrowDown");
    await expect(frame(page, "a")).toHaveAttribute("data-y", "61.0");

    await page.keyboard.press("Control+d");
    await expect(frames(page)).toHaveCount(2);
    const copy = page.locator('[data-testid="frame"]:not([data-shape-id="a"])');
    await expect(copy).toHaveAttribute("aria-pressed", "true");

    // Delete from the copy itself, so the focused element is the one that goes away.
    await copy.focus();
    await page.keyboard.press("Delete");
    await expect(frames(page)).toHaveCount(1);
    await expect(frame(page, "a")).toBeVisible();
    // Focus never falls to <body>: after the copy's exit, the rescue (next frame) puts it on the Frame creator.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName))
      .toBe("Rectangle");

    await selectFrame(page, testInfo, "a");
    await page.keyboard.press("Escape");
    await expect(frame(page, "a")).toHaveAttribute("aria-pressed", "false");
    await expect(selection(page)).toHaveCount(0);

    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await expect(frames(page)).toHaveCount(2);
  });

  test("phone landscape: Deselect returns to the Frame creator", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "phone-landscape", "only the landscape rail has Deselect");
    await seed(page, [{ id: "a", x: 50, y: 50 }]);
    await selectFrame(page, testInfo, "a");
    await expect(selection(page).getByText("40 × 50 cm")).toBeVisible();
    await selection(page).getByRole("button", { name: "Deselect" }).click();
    await expect(selection(page)).toHaveCount(0);
    await expect(creator(page)).toBeVisible();
    await expect(frame(page, "a")).toHaveAttribute("aria-pressed", "false");
  });
});
