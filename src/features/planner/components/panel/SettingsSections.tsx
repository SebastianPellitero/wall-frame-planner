import type { Shell } from "../../hooks/useShell";
import { GridSettings } from "./GridSettings";
import { WallSettings } from "./WallSettings";

/**
 * The Settings content (design-system.md §5.6), shared by the phones' sheet and the desktop
 * right panel: Wall, Grid, then Photo, with Reset wall last in the scroll.
 */
export function SettingsSections({ shell, onSetOrigin }: { shell: Shell; onSetOrigin?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <WallSettings />
      <GridSettings shell={shell} onSetOrigin={onSetOrigin} />
      {/* T9: PhotoSettings */}
      {/* T10: a divider, then Reset wall, last in the scroll (never pinned) */}
    </div>
  );
}
