import { useSyncExternalStore } from "react";

export type Shell = "stacked" | "landscape" | "desktop";

/** The design-system §4.1 queries, identical to the `phone-landscape:`, `desktop:` and `desktop-narrow:` variants in globals.css. */
export const SHELL_QUERIES = {
  landscape: "(orientation: landscape) and (max-height: 500px)",
  desktop: "(min-width: 1024px) and (min-height: 501px)",
  desktopNarrow: "(min-width: 1024px) and (max-width: 1279px) and (min-height: 501px)",
} as const;

function subscribe(onChange: () => void): () => void {
  const lists = [window.matchMedia(SHELL_QUERIES.landscape), window.matchMedia(SHELL_QUERIES.desktop)];
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}

function getSnapshot(): Shell {
  if (window.matchMedia(SHELL_QUERIES.landscape).matches) return "landscape";
  if (window.matchMedia(SHELL_QUERIES.desktop).matches) return "desktop";
  return "stacked";
}

/** The editor never renders on the server; this only satisfies the API. */
const getServerSnapshot = (): Shell => "stacked";

/** Which of the three layouts (§4.2–4.4) the viewport calls for. Client-only. */
export function useShell(): Shell {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribeNarrow(onChange: () => void): () => void {
  const list = window.matchMedia(SHELL_QUERIES.desktopNarrow);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

const getNarrowSnapshot = () => window.matchMedia(SHELL_QUERIES.desktopNarrow).matches;
const getNarrowServerSnapshot = () => false;

/**
 * Narrow desktop (§4.4, 1024–1279px wide): no right panel; Settings opens the side sheet from
 * the top bar and a selection takes the sidebar. Client-only.
 */
export function useDesktopNarrow(): boolean {
  return useSyncExternalStore(subscribeNarrow, getNarrowSnapshot, getNarrowServerSnapshot);
}
