import type { ReactNode } from "react";
import { usePlannerStore } from "../../state/store";
import { ContextPanel } from "../ContextPanel";
import { ModeSwitch } from "../ModeSwitch";
import { SelectionPanel } from "../panel/SelectionPanel";
import { Wordmark } from "./Wordmark";

/** Top bar, left sidebar, stage and an always-open right panel (design-system.md §4.4). */
export function DesktopShell({ stage }: { stage: ReactNode }) {
  const showSelection = usePlannerStore((s) => s.mode === "arrange" && s.selectedId !== null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="relative z-chrome shrink-0 border-b border-line bg-surface pt-safe-top">
        <div className="grid h-bar-lg grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
          <Wordmark />
          <ModeSwitch orientation="horizontal" />
          {/* T7: Undo/Redo, right-aligned */}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="relative z-chrome flex w-sidebar shrink-0 flex-col border-r border-line bg-surface p-4 pb-[calc(16px+var(--spacing-safe-bottom))]">
          <ContextPanel shell="desktop" />
        </div>
        {stage}
        {/* Always rendered, so a selection appearing never resizes the stage. */}
        <div className="relative z-chrome flex w-panel shrink-0 flex-col gap-6 overflow-y-auto overscroll-contain border-l border-line bg-surface p-4 pb-[calc(16px+var(--spacing-safe-bottom))]">
          {showSelection && <SelectionPanel />}
          {/* T8: Wall, Grid and Photo settings sections, then Reset wall last in the scroll */}
        </div>
      </div>
    </div>
  );
}
