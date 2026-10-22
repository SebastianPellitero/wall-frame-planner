import { useId, type ReactNode } from "react";

/**
 * One titled group of Settings (Wall, Grid, Photo; design-system.md §5.6): a region named by
 * its serif title, shared by the phones' sheet and the desktop right panel.
 */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="font-serif text-lead text-ink desktop:text-title desktop:font-medium desktop:tracking-title">
        {title}
      </h3>
      {children}
    </section>
  );
}
