import { expect, test, type Locator } from "@playwright/test";
import { createTouchPointer } from "./helpers/pointer";

/**
 * Touch-action on the chrome: the stage and the rails are touch-none, so a pinch beside the wall
 * never zooms the page, while the rails' scrolling bodies are pan-y and keep their vertical
 * scroll. (Headless Chromium does not emulate page pinch-zoom, so the pinch side is checked
 * through the computed touch-action; the scroll is a real finger.)
 */
test.describe("touch chrome", () => {
  test.skip(({ hasTouch }) => !hasTouch, "touch only");

  const touchAction = (l: Locator) => l.evaluate((el) => getComputedStyle(el).touchAction);
  /** The rail (or bar) that holds `l`. */
  const railOf = (l: Locator) => l.evaluate((el) => getComputedStyle(el.closest(".z-chrome")!).touchAction);

  test("the stage and rails block page zoom, and the left rail still scrolls with a finger", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("wall")).toBeVisible();
    const scroller = page.getByTestId("context-scroller");
    expect(await touchAction(page.getByTestId("stage"))).toBe("none");
    expect(await railOf(page.getByTestId("context-panel"))).toBe("none");
    expect(await touchAction(scroller)).toBe("pan-y");
    // The right rail scrolls itself when it overflows, so it pans vertically only.
    expect(await railOf(page.getByRole("radiogroup", { name: "Mode" }))).toBe("pan-y");

    const { scrollHeight, clientHeight } = await scroller.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);
    // A swipe up from a field (the preview and sliders are touch-none on purpose: they drag).
    const box = (await page.getByRole("textbox", { name: "Width (cm)", exact: true }).boundingBox())!;
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const finger = await createTouchPointer(page);
    await finger.down(from);
    await finger.move({ x: from.x, y: from.y - 150 }, 15);
    await finger.up();
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });
});
