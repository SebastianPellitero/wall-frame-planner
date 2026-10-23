import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

const isDesktop = (testInfo: TestInfo) => testInfo.project.name === "desktop";
const wall = (page: Page) => page.getByTestId("wall");
const paint = (page: Page) => wall(page).evaluate((el) => getComputedStyle(el).backgroundColor);

/** The Wall color row lives in the Settings sheet on phones (opened here), the right panel on desktop. */
async function openSettings(page: Page, testInfo: TestInfo): Promise<Page | Locator> {
  if (isDesktop(testInfo)) return page;
  await page.getByRole("button", { name: "Settings" }).click();
  const sheet = page.getByRole("dialog", { name: "Settings" });
  await expect(sheet).toBeVisible();
  return sheet;
}

test.describe("wall color", () => {
  test("a swatch repaints the wall, flips the tone, and survives a reload", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect.poll(() => paint(page)).toBe("rgb(244, 245, 241)");
    await expect(wall(page)).toHaveAttribute("data-wall-tone", "light");

    const settings = await openSettings(page, testInfo);
    const group = settings.getByRole("radiogroup", { name: "Wall color" });
    await group.getByRole("radio", { name: "Charcoal" }).click();
    await expect(group.getByRole("radio", { name: "Charcoal" })).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => paint(page)).toBe("rgb(52, 56, 59)");
    await expect(wall(page)).toHaveAttribute("data-wall-tone", "dark");

    await page.reload();
    await expect.poll(() => paint(page)).toBe("rgb(52, 56, 59)");
    await expect(wall(page)).toHaveAttribute("data-wall-tone", "dark");
  });

  test("Custom sets an exact hex, and Reset wall restores Gallery white", async ({ page }, testInfo) => {
    await page.goto("/");
    let settings = await openSettings(page, testInfo);
    await settings.getByLabel("Custom").fill("#8a6f5c");
    await expect.poll(() => paint(page)).toBe("rgb(138, 111, 92)");
    await expect(settings.getByText("Custom #8a6f5c")).toBeVisible();
    await expect(settings.getByRole("radiogroup", { name: "Wall color" }).getByRole("radio", { checked: true })).toHaveCount(0);

    await settings.getByRole("button", { name: "Reset wall" }).click();
    await page.getByRole("alertdialog", { name: "Reset the wall?" }).getByRole("button", { name: "Reset wall" }).click();
    await expect.poll(() => paint(page)).toBe("rgb(244, 245, 241)");

    await page.reload();
    await expect.poll(() => paint(page)).toBe("rgb(244, 245, 241)");
    settings = await openSettings(page, testInfo);
    await expect(settings.getByRole("radio", { name: "Gallery white" })).toHaveAttribute("aria-checked", "true");
  });
});
