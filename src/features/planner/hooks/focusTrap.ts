const FOCUSABLE = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** False for elements that are hidden themselves or under a hidden ancestor (`hidden`, display:none, visibility:hidden). */
function isShown(el: HTMLElement, container: HTMLElement): boolean {
  if (getComputedStyle(el).visibility === "hidden") return false;
  for (let node: HTMLElement | null = el; node && node !== container.parentElement; node = node.parentElement) {
    if (node.hidden || getComputedStyle(node).display === "none") return false;
  }
  return true;
}

/**
 * Keeps Tab inside `container` (a modal dialog, §5.6): from the last focusable element Tab
 * wraps to the first, and Shift+Tab from the first wraps to the last; from outside the container
 * (focus fell to <body>) Tab enters at the first and Shift+Tab at the last. Other keys pass through.
 */
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault(): void }, container: HTMLElement): void {
  if (e.key !== "Tab") return;
  const items = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest("[inert]") && isShown(el, container),
  );
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
