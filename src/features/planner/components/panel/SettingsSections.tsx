import type { Shell } from "../../hooks/useShell";
import { GridSettings } from "./GridSettings";
import { PhotoSettings } from "./PhotoSettings";
import { WallSettings } from "./WallSettings";

/**
 * The Settings content (design-system.md §5.6), shared by the phones' sheet and the desktop
 * right panel: Wall, Grid, then Photo, with Reset wall last in the scroll. `onLeave` runs when a
 * control takes the user to the wall (Set origin, Adjust photo, a finished upload), so the
 * phones' sheet closes.
 */
export function SettingsSections({ shell, onLeave }: { shell: Shell; onLeave?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <WallSettings />
      <GridSettings shell={shell} onSetOrigin={onLeave} />
      <PhotoSettings onEnterPhoto={onLeave} />
      {/* T10: a divider, then Reset wall, last in the scroll (never pinned) */}
    </div>
  );
}
