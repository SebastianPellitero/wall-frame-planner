import { round1 } from "./geometry";

/** A length in cm as shown to the user: at most one decimal, no trailing ".0" (design-system.md §3.3). */
export function formatCm(cm: number): string {
  return String(round1(cm));
}

/** The grid origin readout (design-system.md §4.6), e.g. "Grid starts at 20 × 40 cm". */
export function gridOriginReadout(x: number, y: number): string {
  return `Grid starts at ${formatCm(x)} × ${formatCm(y)} cm`;
}
