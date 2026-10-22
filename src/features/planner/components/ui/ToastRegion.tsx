import { AnimatePresence } from "motion/react";
import { useEffect, type ReactNode } from "react";
import type { Shell } from "../../hooks/useShell";
import { connectStorageToasts } from "../../state/storageToasts";
import { useToasts } from "../../state/toasts";
import { cx } from "./cx";
import { Toast } from "./Toast";

/**
 * Bottom-center of the stage (design-system.md §4.5): the stage is `relative`. Landscape's stage
 * runs to the screen's bottom edge, so it also clears the bottom safe-area inset; on stacked the
 * dock absorbs it, and desktop has none.
 */
const BOTTOM: Record<Shell, string> = {
  stacked: "bottom-3",
  landscape: "bottom-[calc(12px+var(--spacing-safe-bottom))]",
  desktop: "bottom-3",
};

/**
 * The toast stack (§5.9): a polite live region, oldest on top and newest at the bottom, 8px
 * apart. It also turns storage events into toasts, including those buffered while the store
 * hydrated. `children` sit under the toasts (the rotate hint on stacked, §4.5).
 */
export function ToastRegion({ shell, children }: { shell: Shell; children?: ReactNode }) {
  const toasts = useToasts((s) => s.toasts);
  useEffect(() => connectStorageToasts(), []);

  return (
    <div className={cx("pointer-events-none absolute inset-x-0 z-toast flex flex-col items-center gap-2 px-3", BOTTOM[shell])}>
      <div data-testid="toast-region" aria-live="polite" className="flex w-full flex-col items-center gap-2 empty:hidden">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} />
          ))}
        </AnimatePresence>
      </div>
      {children}
    </div>
  );
}
