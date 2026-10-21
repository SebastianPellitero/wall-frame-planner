import type { ReactNode } from "react";
import { ContextPanel } from "../ContextPanel";
import { ModeSwitch } from "../ModeSwitch";
import { Wordmark } from "./Wordmark";

/** Phone portrait, tablets in portrait and narrow windows (design-system.md §4.2). */
export function StackedShell({ stage }: { stage: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-chrome shrink-0 border-b border-line bg-surface pt-safe-top pr-[max(var(--spacing-gutter),var(--spacing-safe-right))] pl-[max(var(--spacing-gutter),var(--spacing-safe-left))]">
        <div className="flex h-bar items-center gap-4">
          <Wordmark className="hidden sm:block" />
          <ModeSwitch orientation="horizontal" />
          {/* T8: Settings button (right end) and the settings bottom sheet */}
        </div>
      </header>
      {stage}
      <div className="relative z-chrome shrink-0 border-t border-line bg-surface px-gutter pt-2 pb-[calc(8px+var(--spacing-safe-bottom))]">
        <div className="mx-auto w-full sm:max-w-[560px]">
          <ContextPanel shell="stacked" />
          {/* T7: Undo/Redo at the right end of dock row A, Arrange only (Photo and Grid origin show Done there) */}
        </div>
      </div>
    </div>
  );
}
