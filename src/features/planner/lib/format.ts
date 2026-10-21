import { round1 } from "./geometry";

/** A length in cm as shown to the user: at most one decimal, no trailing ".0" (design-system.md §3.3). */
export function formatCm(cm: number): string {
  return String(round1(cm));
}
