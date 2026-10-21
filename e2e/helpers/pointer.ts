import type { CDPSession, Page, TestInfo } from "@playwright/test";

export interface Point {
  x: number;
  y: number;
}

/** One pointer that can press, move in steps, and release; mouse or real touch. */
export interface Pointer {
  down(at: Point): Promise<void>;
  move(to: Point, steps?: number): Promise<void>;
  up(): Promise<void>;
}

/**
 * Mouse via `page.mouse` on projects without touch; touch via CDP `Input.dispatchTouchEvent`
 * on projects with `hasTouch`, which produces real touch pointer events (capture works and
 * `pointerType` is "touch").
 */
export async function createPointer(page: Page, testInfo: TestInfo): Promise<Pointer> {
  if (!testInfo.project.use.hasTouch) return mousePointer(page);
  return touchPointer(page, await page.context().newCDPSession(page));
}

function mousePointer(page: Page): Pointer {
  return {
    async down(at) {
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
    },
    async move(to, steps = 10) {
      await page.mouse.move(to.x, to.y, { steps });
    },
    async up() {
      await page.mouse.up();
    },
  };
}

function touchPointer(page: Page, cdp: CDPSession): Pointer {
  let last: Point = { x: 0, y: 0 };
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", at?: Point) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: at ? [{ x: Math.round(at.x), y: Math.round(at.y), id: 1 }] : [],
    });
  return {
    async down(at) {
      last = at;
      await touch("touchStart", at);
    },
    async move(to, steps = 10) {
      const from = last;
      for (let i = 1; i <= steps; i++) {
        await touch("touchMove", { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
      }
      last = to;
      // Let the frame render the last move.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    },
    async up() {
      await touch("touchEnd");
    },
  };
}

/** Press at `from`, move to `to`, run `midDrag` (assertions, screenshots), release. */
export async function drag(pointer: Pointer, from: Point, to: Point, midDrag?: () => Promise<void>) {
  await pointer.down(from);
  await pointer.move(to);
  if (midDrag) await midDrag();
  await pointer.up();
}
