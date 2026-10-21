import { cx } from "../ui/cx";

/** "WallPlanner", serif 20/28 (§2.2). */
export function Wordmark({ className }: { className?: string }) {
  return <h1 className={cx("font-serif text-xl font-medium tracking-title text-ink", className)}>WallPlanner</h1>;
}
