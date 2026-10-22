import type { ReactNode } from "react";
import { useDesktopNarrow } from "../../hooks/useShell";
import { ContextPanel } from "../ContextPanel";
import { HistoryButtons } from "../HistoryButtons";
import { ModeSwitch } from "../ModeSwitch";
import { RightPanel } from "../panel/RightPanel";
import { SettingsSheet } from "../panel/SettingsSheet";
import { Wordmark } from "./Wordmark";

/**
 * Top bar, left sidebar, stage and an always-open right panel (design-system.md §4.4). Below
 * 1280px wide (narrow desktop) the right panel gives its width to the wall: Settings opens the
 * landscape side sheet from the top bar, and a selection takes the sidebar. The chrome is
 * touch-none and its scrolling parts touch-pan-y, so no pinch zooms the page (touch laptops).
 */
export function DesktopShell({ stage }: { stage: ReactNode }) {
  const narrow = useDesktopNarrow();
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-chrome shrink-0 touch-none border-b border-line bg-surface pt-safe-top">
        <div className="grid h-bar-lg grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
          <Wordmark />
          <ModeSwitch orientation="horizontal" />
          <div className="flex justify-self-end">
            <HistoryButtons shell="desktop" />
            {narrow && <SettingsSheet shell="landscape" />}
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="relative z-chrome flex w-sidebar shrink-0 touch-none flex-col border-r border-line bg-surface p-4 pb-[calc(16px+var(--spacing-safe-bottom))]">
          <ContextPanel shell="desktop" narrow={narrow} />
        </div>
        {stage}
        {!narrow && <RightPanel />}
      </div>
    </div>
  );
}
