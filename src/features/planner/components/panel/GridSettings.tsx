import type { Shell } from "../../hooks/useShell";
import { gridOriginReadout } from "../../lib/format";
import { usePlannerStore } from "../../state/store";
import { MatrixControl } from "../palette/MatrixControl";
import { SECONDARY_BUTTON } from "../ui/buttons";
import { Toggle } from "../ui/Toggle";
import { SettingsSection } from "./SettingsSection";

/**
 * The Grid settings (design-system.md §5.6): Snap to grid, the origin readout and Set origin on
 * every shell. Stacked shells also hold the Matrix control here, since their dock has no room;
 * landscape and desktop show it in the left panel, so no control appears twice.
 */
export function GridSettings({ shell, onSetOrigin }: { shell: Shell; onSetOrigin?: () => void }) {
  const grid = usePlannerStore((s) => s.grid);
  const setGrid = usePlannerStore((s) => s.setGrid);

  const setOrigin = () => {
    // Turns the grid on as well (setMode), so the user sees what they place.
    usePlannerStore.getState().setMode("gridOrigin");
    onSetOrigin?.();
  };

  return (
    <SettingsSection title="Grid">
      {shell === "stacked" && <MatrixControl shell={shell} />}
      <Toggle label="Snap to grid" checked={grid.snap} disabled={!grid.enabled} onChange={(snap) => setGrid({ snap })} />
      <p className="text-caption text-ink-muted tabular-nums">{gridOriginReadout(grid.originX, grid.originY)}</p>
      <button type="button" onClick={setOrigin} className={SECONDARY_BUTTON}>
        Set origin on the wall
      </button>
    </SettingsSection>
  );
}
