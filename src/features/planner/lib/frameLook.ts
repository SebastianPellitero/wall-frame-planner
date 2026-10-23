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

/** Accessible name (§7, §8), e.g. "Rectangle 40 × 50 cm", or "… cm with photo" for a frame holding one. */
export function frameName(kind: ShapeKind, wCm: number, hCm: number, withPhoto = false): string {
  return `${KIND_NAME[kind]} ${frameLabel(kind, wCm, hCm, "full")} cm${withPhoto ? " with photo" : ""}`;
}

/**
 * The picture opening (§3.8): its inset from the frame's outer edge and its size, in px. Mat on:
 * inside the moulding and the mat (`t + m`); mat off: everything inside the moulding (`t`).
 * Circles use the same box (the mat sits at `inset: t` with padding `m`).
 */
export function openingBox(wPx: number, hPx: number, mat: boolean): { offset: number; w: number; h: number } {
  const s = Math.min(wPx, hPx);
  const offset = mouldingPx(s) + (mat ? matPx(s) : 0);
  return { offset, w: Math.max(0, wPx - 2 * offset), h: Math.max(0, hPx - 2 * offset) };
}

/** Where the size plate sits on a photo (§3.8): 4px above the opening's bottom, or centered on short openings and circles. */
export function platePlacement(kind: ShapeKind, openingHPx: number): "bottom" | "center" {
  return kind === "circle" || openingHPx < 40 ? "center" : "bottom";
}

/** The Frame creator preview's caption (§5.1), e.g. "40 × 50 cm" or "Ø 40 cm". */
export function previewCaption(kind: ShapeKind, wCm: number, hCm: number): string {
  return `${frameLabel(kind, wCm, hCm, "full")} cm`;
}

/** The preview's accessible name (§8), e.g. "Add rectangle, 40 × 50 cm". */
export function previewName(kind: ShapeKind, wCm: number, hCm: number): string {
  return `Add ${KIND_NAME[kind].toLowerCase()}, ${previewCaption(kind, wCm, hCm)}`;
}

/** The live-region line after Generate (§5.1, §8), e.g. "Ready: rectangle, 40 × 50 cm". */
export function readyAnnouncement(kind: ShapeKind, wCm: number, hCm: number): string {
  return `Ready: ${KIND_NAME[kind].toLowerCase()}, ${previewCaption(kind, wCm, hCm)}`;
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
