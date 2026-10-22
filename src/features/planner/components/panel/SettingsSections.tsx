import type { Shell } from "../../hooks/useShell";
import { GridSettings } from "./GridSettings";
import { PhotoSettings } from "./PhotoSettings";
import { ResetWall } from "./ResetWall";
import { WallSettings } from "./WallSettings";

/**
 * The Settings content (design-system.md §5.6), shared by the phones' sheet and the desktop
 * right panel: Wall, Grid, then Photo, with Reset wall last in the scroll. `onLeave` runs when a
 * control takes the user to the wall (Set origin, Adjust photo, a finished upload, Reset wall), so the
 * phones' sheet closes. `photo={false}` leaves Settings > Photo out (the desktop panel in Photo mode).
 */
export function SettingsSections({ shell, onLeave, photo = true }: { shell: Shell; onLeave?: () => void; photo?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <WallSettings />
      <GridSettings shell={shell} onSetOrigin={onLeave} />
      {photo && <PhotoSettings onEnterPhoto={onLeave} />}
      <ResetWall onDone={onLeave} />
    </div>
  );
}
