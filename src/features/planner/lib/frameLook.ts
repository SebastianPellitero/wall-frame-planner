/**
 * Frame look rules from docs/design/design-system.md §3. All sizes are screen px;
 * `s` is the frame's shorter on-screen side.
 */
import type { ShapeKind } from "../types";
import { formatCm } from "./format";
import { clamp } from "./geometry";

export type LabelTier = "full" | "compact" | "hidden";

/** Moulding (border) thickness `t` (§3.2). */
export function mouldingPx(s: number): number {
  return clamp(Math.round(s * 0.06), 2, 10);
}

/** Mat padding `m` (§3.2). Small frames drop the mat. */
export function matPx(s: number): number {
  return s >= 48 ? clamp(Math.round(s * 0.1), 3, 24) : 0;
}

/** Arm length of each selection bracket (§3.6). */
export function bracketArmPx(s: number): number {
  return clamp(Math.round(s * 0.2), 8, 14);
}

/** The size label text for a tier (§3.3): `40 × 50` / `40×50`, `Ø 40` / `Ø40`. */
export function frameLabel(kind: ShapeKind, wCm: number, hCm: number, tier: Exclude<LabelTier, "hidden">): string {
  const sep = tier === "full" ? " " : "";
  if (kind === "circle") return `Ø${sep}${formatCm(wCm)}`;
  return `${formatCm(wCm)}${sep}×${sep}${formatCm(hCm)}`;
}

export const KIND_NAME: Record<ShapeKind, string> = { rect: "Rectangle", square: "Square", circle: "Circle" };

/** Accessible name (§7), e.g. "Rectangle 40 × 50 cm". */
export function frameName(kind: ShapeKind, wCm: number, hCm: number): string {
  return `${KIND_NAME[kind]} ${frameLabel(kind, wCm, hCm, "full")} cm`;
}

/** The Frame creator preview's caption (§5.1), e.g. "40 × 50 cm" or "Ø 40 cm". */
export function previewCaption(kind: ShapeKind, wCm: number, hCm: number): string {
  return `${frameLabel(kind, wCm, hCm, "full")} cm`;
}

/** The preview's accessible name (§8), e.g. "Add rectangle, 40 × 50 cm". */
export function previewName(kind: ShapeKind, wCm: number, hCm: number): string {
  return `Add ${KIND_NAME[kind].toLowerCase()}, ${previewCaption(kind, wCm, hCm)}`;
}

/** Room for the label inside the moulding: `w − 2t`, or `0.8 × (d − 2t)` for circles. */
function available(kind: ShapeKind, sidePx: number, t: number): number {
  const inner = sidePx - 2 * t;
  return kind === "circle" ? 0.8 * inner : inner;
}

/** Full, then compact, otherwise hidden, by the on-screen room (§3.3). */
export function labelTier(kind: ShapeKind, wCm: number, hCm: number, wPx: number, hPx: number): LabelTier {
  const t = mouldingPx(Math.min(wPx, hPx));
  const aw = available(kind, wPx, t);
  const ah = available(kind, hPx, t);
  const full = frameLabel(kind, wCm, hCm, "full").length;
  if (aw >= full * 0.55 * 12 + 8 && ah >= 18) return "full";
  const compact = frameLabel(kind, wCm, hCm, "compact").length;
  if (aw >= compact * 0.5 * 11 + 4 && ah >= 16) return "compact";
  return "hidden";
}
