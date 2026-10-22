import { usePlannerStore } from "../../state/store";
import { CmField } from "../ui/CmField";
import { SettingsSection } from "./SettingsSection";

/** The wall is at least 10 cm a side (the store's floor); the cap only guards against typos. */
const WALL_CM = { min: 10, max: 1000 };
const PUSH_GAP_CM = { min: 0, max: 50 };

/**
 * The wall's real size and the push gap (design-system.md §5.6). Short visible labels under the
 * "Wall" title; the accessible names say "Wall …" because desktop also shows the Frame creator's
 * and Selected frame's "Width (cm)". `setWall` clamps frames into a shrunken wall.
 */
export function WallSettings() {
  const wall = usePlannerStore((s) => s.wall);
  const setWall = usePlannerStore((s) => s.setWall);

  return (
    <SettingsSection title="Wall">
      <div className="grid grid-cols-2 gap-2">
        <CmField label="Width" name="Wall width (cm)" value={wall.width} {...WALL_CM} onCommit={(width) => setWall({ width })} className="min-w-0" />
        <CmField label="Height" name="Wall height (cm)" value={wall.height} {...WALL_CM} onCommit={(height) => setWall({ height })} className="min-w-0" />
        <CmField label="Push gap" name="Push gap (cm)" value={wall.pushGap} {...PUSH_GAP_CM} onCommit={(pushGap) => setWall({ pushGap })} className="min-w-0" />
      </div>
      <p className="text-caption text-ink-muted">Space kept between frames when they push each other apart.</p>
    </SettingsSection>
  );
}
