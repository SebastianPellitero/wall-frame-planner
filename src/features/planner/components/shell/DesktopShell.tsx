import type { ReactNode } from "react";
import { ContextPanel } from "../ContextPanel";
import { HistoryButtons } from "../HistoryButtons";
import { ModeSwitch } from "../ModeSwitch";
import { RightPanel } from "../panel/RightPanel";
import { Wordmark } from "./Wordmark";

/** Top bar, left sidebar, stage and an always-open right panel (design-system.md §4.4). */
export function DesktopShell({ stage }: { stage: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-chrome shrink-0 border-b border-line bg-surface pt-safe-top">
        <div className="grid h-bar-lg grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
          <Wordmark />
          <ModeSwitch orientation="horizontal" />
          <HistoryButtons shell="desktop" className="justify-self-end" />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="relative z-chrome flex w-sidebar shrink-0 flex-col border-r border-line bg-surface p-4 pb-[calc(16px+var(--spacing-safe-bottom))]">
          <ContextPanel shell="desktop" />
        </div>
        {stage}
        <RightPanel />
      </div>
    </div>
  );
}
