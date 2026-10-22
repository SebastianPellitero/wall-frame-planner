import type { Shell } from "../../hooks/useShell";
import { usePlannerStore } from "../../state/store";
import { PanelSection } from "../panel/PanelSection";
import { CmField } from "../ui/CmField";
import { Toggle } from "../ui/Toggle";

/** Grid spacing limits (§5.16); the store keeps its own 0.5 cm floor as a safety net. */
const SPACING = { min: 1, max: 100 };

/**
 * The Matrix control (design-system.md §5.16): grid spacing and the Show grid switch. Desktop
 * follows the sketch (fields, then the switch); the landscape rail puts the often-used switch
 * first so it stays above the fold. Not undoable, like the rest of the settings.
 */
export function MatrixControl({ shell }: { shell: Shell }) {
  const grid = usePlannerStore((s) => s.grid);
  const setGrid = usePlannerStore((s) => s.setGrid);
  const compact = shell === "landscape";

  const toggle = <Toggle label="Show grid" checked={grid.enabled} onChange={(enabled) => setGrid({ enabled })} />;

  return (
    <PanelSection title="Matrix control">
      {compact && toggle}
      <div className="grid grid-cols-2 gap-2">
        <CmField
          label="Height"
          name="Grid height (cm)"
          value={grid.spacingY}
          {...SPACING}
          onCommit={(spacingY) => setGrid({ spacingY })}
          className="min-w-0"
          compact={compact}
        />
        <CmField
          label="Width"
          name="Grid width (cm)"
          value={grid.spacingX}
          {...SPACING}
          onCommit={(spacingX) => setGrid({ spacingX })}
          className="min-w-0"
          compact={compact}
        />
      </div>
      {!compact && toggle}
    </PanelSection>
  );
}
