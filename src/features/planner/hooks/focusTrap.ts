const FOCUSABLE = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Keeps Tab inside `container` (a modal dialog, §5.6): from the last focusable element Tab
 * wraps to the first, and Shift+Tab from the first wraps to the last. Call from the
 * container's keydown; other keys pass through.
 */
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault(): void }, container: HTMLElement): void {
  if (e.key !== "Tab") return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest("[inert]"));
  if (items.length === 0) {
    e.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  const inside = active instanceof HTMLElement && container.contains(active);
  if (e.shiftKey && (active === first || !inside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !inside)) {
    e.preventDefault();
    first.focus();
  }
}
