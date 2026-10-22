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

/** Primary: the accent fill, for the main action of a group (Generate, Done). */
export const PRIMARY_BUTTON =
  "inline-flex h-touch shrink-0 items-center justify-center gap-1.5 rounded-control bg-accent px-3.5 text-ui font-medium text-on-accent transition-colors duration-quick can-hover:hover:bg-accent-hover active:bg-accent-pressed";

/** Danger: the destructive confirm in a confirm dialog only (Reset wall, Remove photo). */
export const DANGER_BUTTON =
  "inline-flex h-touch shrink-0 items-center justify-center gap-1.5 rounded-control bg-danger px-3.5 text-ui font-medium text-on-danger transition-colors duration-quick";

/** Quiet danger: borderless red text, e.g. Remove photo in the panels. */
export const QUIET_DANGER_BUTTON =
  "inline-flex h-touch shrink-0 items-center justify-center gap-1.5 rounded-control px-3.5 text-ui font-medium text-danger transition-colors duration-quick can-hover:hover:bg-surface-pressed active:bg-surface-pressed";

/**
 * The danger-red variants of a base style. Never add `text-danger` next to a base's `text-ink`:
 * both would apply and `text-ink`, which Tailwind emits later, wins. Swap the color instead.
 */
const inDanger = (base: string) => base.replace(/(^|\s)text-ink(?=\s|$)/, "$1text-danger");

/** Secondary in `text-danger`: Delete in the selection bar, Reset wall in Settings. */
export const SECONDARY_DANGER_BUTTON = inDanger(SECONDARY_BUTTON);

/** Icon button in `text-danger` (Remove photo). */
export const DANGER_ICON_BUTTON = inDanger(ICON_BUTTON);
