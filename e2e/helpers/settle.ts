import type { Locator } from "@playwright/test";

/**
 * Resolves once the element's on-screen box has been unchanged for `frames` consecutive animation
 * frames (an entrance or spring has finished), so a screenshot never catches it mid-motion.
 */
export async function settle(target: Locator, frames = 6) {
  await target.evaluate(
    (el, n) =>
      new Promise<void>((resolve) => {
        const key = () => {
          const r = el.getBoundingClientRect();
          return `${r.x}|${r.y}|${r.width}|${r.height}|${getComputedStyle(el).opacity}`;
        };
        let last = key();
        let still = 0;
        const tick = () => {
          const now = key();
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= n) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}
