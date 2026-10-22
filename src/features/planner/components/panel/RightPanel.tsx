import { usePlannerStore } from "../../state/store";
import { SelectionBar } from "./SelectionBar";
import { SettingsSections } from "./SettingsSections";

/**
 * The desktop's always-open right panel (design-system.md §4.4). Always rendered, so a
 * selection appearing never resizes the stage. Selected frame first, only while
 * selected, then the Settings sections (Wall, Grid, Photo, Reset wall last).
 */
export function RightPanel() {
  const showSelection = usePlannerStore((s) => s.mode === "arrange" && s.selectedId !== null);

  return (
    <div className="relative z-chrome flex w-panel shrink-0 flex-col gap-6 overflow-y-auto overscroll-contain border-l border-line bg-surface p-4 pb-[calc(16px+var(--spacing-safe-bottom))]">
      {showSelection && <SelectionBar shell="desktop" />}
      <SettingsSections shell="desktop" />
    </div>
  );
}
