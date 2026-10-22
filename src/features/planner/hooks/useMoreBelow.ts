import { useCallback } from "react";

/**
 * A callback ref for a scroller: sets `data-more` while content sits below the fold, so CSS
 * (`data-more:`) can fade the bottom edge (§4.3). Kept current on scroll and on resize of the
 * scroller or its content. Writes the attribute directly, so scrolling never re-renders.
 */
export function useMoreBelow<T extends HTMLElement>(enabled = true) {
  return useCallback(
    (el: T | null) => {
      if (!el || !enabled) return;
      const update = () => {
        const more = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
        el.toggleAttribute("data-more", more);
      };
      update();
      el.addEventListener("scroll", update, { passive: true });
      const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
      observer?.observe(el);
      if (el.firstElementChild) observer?.observe(el.firstElementChild);
      return () => {
        el.removeEventListener("scroll", update);
        observer?.disconnect();
      };
    },
    [enabled],
  );
}
