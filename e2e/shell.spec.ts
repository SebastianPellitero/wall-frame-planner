import { expect, test, type Page } from "@playwright/test";

const SHOTS = ".superpowers/sdd/2026-10-21-wall-planner-design/shots";
const WALL_RATIO = 300 / 250;

async function expectWallToScale(page: Page) {
  const wall = page.getByTestId("wall");
  await expect(wall).toBeVisible();
  const box = (await wall.boundingBox())!;
  expect(Math.abs(box.width / box.height - WALL_RATIO) / WALL_RATIO).toBeLessThan(0.01);
  return box;
}

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.describe("shell", () => {
  test("draws the wall to scale with no horizontal scroll", async ({ page }, testInfo) => {
    await page.goto("/");
    await expectWallToScale(page);
    await expectNoHorizontalScroll(page);
    const shell = testInfo.project.name === "phone-landscape" ? "landscape" : "desktop";
    await page.screenshot({ path: `${SHOTS}/t4-${shell}.png` });
  });

  test("mode radios are reachable and switch, without rescaling the wall", async ({ page }) => {
    await page.goto("/");
    const before = await expectWallToScale(page);
    const radio = (name: string) => page.getByRole("radiogroup", { name: "Mode" }).getByRole("radio", { name, exact: true });

    await expect(radio("Arrange")).toBeChecked();
    await radio("Photo").click();
    await expect(radio("Photo")).toBeChecked();
    await expect(radio("Arrange")).not.toBeChecked();
    await expect(page.getByRole("region", { name: "Photo" })).toBeAttached();

    await radio("Grid origin").click();
    await expect(radio("Grid origin")).toBeChecked();
    await expect(page.getByRole("region", { name: "Grid origin" })).toBeAttached();

    // Keyboard: the checked radio holds focus and arrows wrap around.
    await radio("Grid origin").focus();
    await page.keyboard.press("ArrowRight");
    await expect(radio("Arrange")).toBeChecked();
    await expect(radio("Arrange")).toBeFocused();

    expect(await page.getByTestId("wall").boundingBox()).toEqual(before);
  });
});

test.describe("phone portrait", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("stacks the shell and shows a dismissible rotate hint", async ({ page }) => {
    await page.goto("/");
    await expectWallToScale(page);
    await expectNoHorizontalScroll(page);

    const hint = page.getByText("Rotate for a bigger wall");
    await expect(hint).toBeVisible();
    // Wait for the 600ms fade-in before the screenshot.
    await expect.poll(() => hint.evaluate((el) => getComputedStyle(el.parentElement!).opacity)).toBe("1");
    await page.screenshot({ path: `${SHOTS}/t4-stacked.png` });

    await page.getByRole("button", { name: "Dismiss" }).tap();
    await expect(hint).toBeHidden();
    await page.reload();
    await expectWallToScale(page);
    await expect(hint).toBeHidden();
  });
});
