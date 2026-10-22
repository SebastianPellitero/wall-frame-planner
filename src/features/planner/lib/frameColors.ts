/**
 * The ten curated frame finishes (design-system.md §3.2). A frame stores its index and renders
 * `data-frame-color="N"`; globals.css derives the moulding, opening and label from it.
 */
export const FRAME_COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type FrameColor = (typeof FRAME_COLORS)[number];

export function isFrameColor(v: unknown): v is FrameColor {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= FRAME_COLORS.length;
}

/** A uniform pick from the finishes, never `prev` (§5.1: `{1…10} \ {current}`). */
export function pickFrameColor(prev?: FrameColor, rng: () => number = Math.random): FrameColor {
  const pool = prev === undefined ? FRAME_COLORS : FRAME_COLORS.filter((c) => c !== prev);
  const i = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
  return pool[Math.max(0, i)];
}

/** A stable color for a frame saved before colors existed: FNV-1a of the id, onto 1–10. */
export function colorFromId(id: string): FrameColor {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return FRAME_COLORS[(hash >>> 0) % FRAME_COLORS.length];
}
