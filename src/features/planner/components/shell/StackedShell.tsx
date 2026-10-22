import type { ReactNode } from "react";
import { ContextPanel } from "../ContextPanel";
import { HistoryButtons } from "../HistoryButtons";
import { ModeSwitch } from "../ModeSwitch";
import { SettingsSheet } from "../panel/SettingsSheet";
import { Wordmark } from "./Wordmark";

/** Phone portrait, tablets in portrait and narrow windows (design-system.md §4.2). */
export function StackedShell({ stage }: { stage: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-chrome shrink-0 border-b border-line bg-surface pt-safe-top pr-[max(var(--spacing-gutter),var(--spacing-safe-right))] pl-[max(var(--spacing-gutter),var(--spacing-safe-left))]">
        <div className="flex h-bar items-center gap-4">
          <Wordmark className="hidden sm:block" />
          <ModeSwitch orientation="horizontal" />
          {/* The bottom sheet; its Grid section holds the Matrix control on stacked (§5.6). */}
          <SettingsSheet shell="stacked" className="ml-auto -mr-2.5" />
        </div>
      </header>
      {stage}
      <div className="relative z-chrome shrink-0 border-t border-line bg-surface px-gutter pt-2 pb-[calc(8px+var(--spacing-safe-bottom))]">
        <div className="relative mx-auto w-full sm:max-w-[560px]">
          <ContextPanel shell="stacked" />
          {/* The right end of dock row A (56px), outside the cross-fading content so it never flickers;
              the creator and selection leave it 96px. Hidden outside Arrange, where Done takes the slot (§4.2, §4.6). */}
          <HistoryButtons shell="stacked" className="absolute top-1.5 right-0" />
        </div>
      </div>
    </div>
  );
}
