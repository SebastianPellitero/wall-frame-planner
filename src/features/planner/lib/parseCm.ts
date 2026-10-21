import { round1 } from "./geometry";

export type ParsedCm = { ok: true; value: number } | { ok: false };

/** A plain decimal: digits with at most one "." or "," separator. No exponents, units or hex. */
const DECIMAL = /^-?(\d+([.,]\d*)?|[.,]\d+)$/;

/** A typed length in cm (design-system.md §5.2): trimmed, "," or "." decimals, rounded to 0.1, within [min, max]. */
export function parseCm(text: string, min: number, max: number): ParsedCm {
  const trimmed = text.trim();
  if (!DECIMAL.test(trimmed)) return { ok: false };
  const value = round1(Number(trimmed.replace(",", ".")));
  return value >= min && value <= max ? { ok: true, value } : { ok: false };
}
