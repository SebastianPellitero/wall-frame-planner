import type { Shell } from "../../hooks/useShell";
import { gridOriginReadout } from "../../lib/format";
import { usePlannerStore } from "../../state/store";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "../ui/buttons";
import { cx } from "../ui/cx";
import { PanelSection } from "./PanelSection";

const resetToCorner = () => usePlannerStore.getState().setGridOrigin({ x: 0, y: 0 });
const done = () => usePlannerStore.getState().setMode("arrange");

/**
 * Grid origin mode (design-system.md §4.6): the instruction, a live readout, Reset to corner and
 * Done. A tap on the wall sets the origin (WallStage) and the user stays here to re-tap. Stacked
 * fills the dock's two rows with Done in the Undo/Redo slot; the landscape rail pins Done at the
 * bottom; desktop lists everything under the title.
 */
export function OriginTools({ shell }: { shell: Shell }) {
  const originX = usePlannerStore((s) => s.grid.originX);
  const originY = usePlannerStore((s) => s.grid.originY);

  const instruction = <p className="text-ui text-ink">Tap the wall where the grid should start.</p>;
  const readout = <p className="text-caption text-ink-muted tabular-nums">{gridOriginReadout(originX, originY)}</p>;
  const reset = (className?: string) => (
    <button type="button" onClick={resetToCorner} className={cx(SECONDARY_BUTTON, className)}>
      Reset to corner
    </button>
  );
  const doneButton = (className?: string) => (
    <button type="button" onClick={done} className={cx(PRIMARY_BUTTON, className)}>
      Done
    </button>
  );

  if (shell === "stacked") {
    return (
      <PanelSection title="Grid origin">
        <div className="grid grid-rows-[56px_64px] gap-2">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">{instruction}</div>
            {doneButton()}
          </div>
          <div className="flex items-center justify-between gap-3">
            {readout}
            {reset()}
          </div>
        </div>
      </PanelSection>
    );
  }

  const landscape = shell === "landscape";
  return (
    <PanelSection title="Grid origin" className={cx(landscape && "h-full gap-2")}>
      {instruction}
      {readout}
      {reset(landscape ? "w-full px-2" : undefined)}
      {doneButton(cx("w-full", landscape && "mt-auto"))}
    </PanelSection>
  );
}
