import type { ReactNode } from "react";
import { ContextPanel } from "../ContextPanel";
import { ModeSwitch } from "../ModeSwitch";

/** Phones held sideways and any short window: left rail, stage, right rail (design-system.md §4.3). */
export function LandscapeShell({ stage }: { stage: ReactNode }) {
  return (
    <div className="flex h-dvh flex-row overflow-hidden">
      <div className="relative z-chrome flex w-[calc(var(--spacing-rail)+var(--spacing-safe-left))] shrink-0 flex-col border-r border-line bg-surface p-2.5 pb-[calc(10px+var(--spacing-safe-bottom))] pl-[calc(10px+var(--spacing-safe-left))]">
        <ContextPanel shell="landscape" />
      </div>
      {stage}
      <div className="relative z-chrome flex w-[calc(var(--spacing-rail-end)+var(--spacing-safe-right))] shrink-0 flex-col items-center overflow-y-auto overscroll-contain border-l border-line bg-surface px-1.5 pt-2.5 pr-[calc(6px+var(--spacing-safe-right))] pb-[calc(10px+var(--spacing-safe-bottom))]">
        <ModeSwitch orientation="vertical" />
        {/* T7: Undo and Redo, then T8: Settings, as one bottom group (mt-auto) above the safe area (§4.3).
            Undo/Redo live here in every mode, disabled in Photo and Grid origin. T8 also adds the side sheet. */}
      </div>
    </div>
  );
}
