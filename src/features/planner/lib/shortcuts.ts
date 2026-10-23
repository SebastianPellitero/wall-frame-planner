/**
 * Keyboard shortcuts (design-system.md §7): key → action, no React, no DOM. Whether a key may
 * act at all (typing in a field, the current mode) is the caller's job (useShortcuts).
 */

/** The parts of a KeyboardEvent the mapping reads. */
export interface KeyLike {
  key: string;
  /** The physical key, e.g. "KeyZ"; used when `key` is not a Latin letter (other layouts). */
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  repeat: boolean;
}

export type ShortcutAction =
  | { type: "delete" }
  | { type: "duplicate" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "nudge"; dx: number; dy: number }
  | { type: "deselect" }
  /** `+` / `=` and `-`: zoom the photo; acted on in adjust mode only (§5.17). */
  | { type: "zoom"; dir: 1 | -1 };

/** Arrow-key nudge in cm, and with Shift. */
export const NUDGE_CM = 1;
export const NUDGE_SHIFT_CM = 10;

const ARROWS: Record<string, { dx: number; dy: number }> = {
  ArrowRight: { dx: 1, dy: 0 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

/** The lower-case Latin letter the key stands for, falling back to the physical key on other layouts. */
function letterOf(e: KeyLike): string | null {
  if (/^[a-z]$/i.test(e.key)) return e.key.toLowerCase();
  const m = /^Key([A-Z])$/.exec(e.code);
  return m ? m[1].toLowerCase() : null;
}

/**
 * The action for a key press, or null to leave it to the browser. The command modifier is Cmd
 * on a Mac and Ctrl elsewhere; the other one never matches. Held keys repeat nudges and
 * history steps, never one-shot actions.
 */
export function resolveShortcut(e: KeyLike, { mac }: { mac: boolean }): ShortcutAction | null {
  if (e.altKey) return null;
  const mod = mac ? e.metaKey : e.ctrlKey;
  const otherMod = mac ? e.ctrlKey : e.metaKey;
  if (otherMod) return null;

  if (mod) {
    const letter = letterOf(e);
    if (letter === "z") return { type: e.shiftKey ? "redo" : "undo" };
    if (letter === "y" && !mac && !e.shiftKey) return { type: "redo" };
    if (letter === "d" && !e.shiftKey && !e.repeat) return { type: "duplicate" };
    return null;
  }

  const arrow = ARROWS[e.key];
  if (arrow) {
    const step = e.shiftKey ? NUDGE_SHIFT_CM : NUDGE_CM;
    return { type: "nudge", dx: arrow.dx * step, dy: arrow.dy * step };
  }
  // Before the Shift check: "+" needs Shift on many layouts.
  if (e.key === "+" || e.key === "=") return { type: "zoom", dir: 1 };
  if (e.key === "-") return { type: "zoom", dir: -1 };
  if (e.shiftKey || e.repeat) return null;
  if (e.key === "Delete" || e.key === "Backspace") return { type: "delete" };
  if (e.key === "Escape") return { type: "deselect" };
  return null;
}
