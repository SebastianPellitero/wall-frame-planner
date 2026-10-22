/** Utilities that start with `text-` but set size, wrapping or alignment, not color. */
const NOT_COLOR = new Set(["micro", "caption", "ui", "body", "lead", "title", "balance", "pretty", "wrap", "nowrap", "left", "center", "right"]);

/** The unprefixed text-color utilities in a class string (hover and other variants excluded). Tests only. */
export function textColors(className: string): string[] {
  return className.split(/\s+/).filter((c) => c.startsWith("text-") && !NOT_COLOR.has(c.slice(5)));
}
