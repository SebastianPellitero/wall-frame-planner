import type { ReactNode } from "react";

/**
 * A named context-panel section. The serif title shows in the desktop sidebar and right
 * panel; on phones it stays for screen readers only (§4.2–4.4).
 */
export function PanelSection({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="sr-only font-serif text-title font-medium tracking-title desktop:not-sr-only">{title}</h2>
      {children}
    </section>
  );
}
