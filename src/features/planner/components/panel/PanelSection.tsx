import type { ReactNode } from "react";
import { cx } from "../ui/cx";

/**
 * A named context-panel section. The serif title shows in the desktop sidebar and right
 * panel; on phones it stays for screen readers only (§4.2–4.4). `label` overrides the region
 * name where the title alone would clash (desktop: "Photo tools" beside Settings > "Photo").
 */
export function PanelSection({ title, label, children, className }: { title: string; label?: string; children?: ReactNode; className?: string }) {
  return (
    <section aria-label={label ?? title} className={cx("flex flex-col gap-3", className)}>
      <h2 className="sr-only font-serif text-title font-medium tracking-title desktop:not-sr-only">{title}</h2>
      {children}
    </section>
  );
}
