/**
 * Button styles (design-system.md §5.5). Every hover is wrapped in `can-hover:`; every hit
 * box is at least `touch` (44px).
 */

/** Secondary: bordered, on surface. Text buttons put an 18px icon 6px before the label. */
export const SECONDARY_BUTTON =
  "inline-flex h-touch shrink-0 items-center justify-center gap-1.5 rounded-control border border-line-strong bg-surface px-3.5 text-ui font-medium text-ink transition-colors duration-quick can-hover:hover:bg-surface-pressed active:bg-surface-pressed";

/** Icon button: borderless, 44×44, 20px icon; `text-ink-disabled` when disabled. */
export const ICON_BUTTON =
  "grid size-touch shrink-0 place-items-center rounded-control text-ink transition-colors duration-quick can-hover:enabled:hover:bg-surface-pressed active:enabled:bg-surface-pressed disabled:text-ink-disabled";
