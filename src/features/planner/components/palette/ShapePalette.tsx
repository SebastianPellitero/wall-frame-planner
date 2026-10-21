import { addFromPalette, usePaletteDrag } from "../../hooks/usePaletteDrag";
import type { Shell } from "../../hooks/useShell";
import { sizeLimits } from "../../lib/paletteMath";
import { usePlannerStore } from "../../state/store";
import type { ShapeKind } from "../../types";
import { PanelSection } from "../panel/PanelSection";
import { CmField } from "../ui/CmField";
import { cx } from "../ui/cx";
import { useWallContext } from "../wall/WallContext";
import { DragGhost } from "./DragGhost";
import { PaletteTile } from "./PaletteTile";

const KINDS: ShapeKind[] = ["rect", "square", "circle"];

/**
 * The palette content of the context panel: three tiles (tap to add, drag onto the wall) and
 * the active tile's size inputs. Minimal layout; the palette is being redesigned.
 */
export function ShapePalette({ shell }: { shell: Shell }) {
  const { pxPerCm } = useWallContext();
  const paletteKind = usePlannerStore((s) => s.paletteKind);
  const paletteSizes = usePlannerStore((s) => s.paletteSizes);
  const { onPointerDown, ghost, motion } = usePaletteDrag();
  const stacked = shell === "stacked";

  return (
    <PanelSection title="Frames">
      <div className={cx("flex gap-2", stacked ? "h-tile" : "flex-col")}>
        {KINDS.map((kind) => (
          <PaletteTile
            key={kind}
            kind={kind}
            size={paletteSizes[kind]}
            active={kind === paletteKind}
            onPointerDown={(e) => onPointerDown(kind, e)}
            onAdd={() => addFromPalette(kind)}
          />
        ))}
      </div>
      <SizeFields kind={paletteKind} />
      {ghost && <DragGhost ghost={ghost} motion={motion} pxPerCm={pxPerCm} />}
    </PanelSection>
  );
}

/** Rectangle: Width + Height. Square: Side. Circle: Diameter. Limits come from the wall. */
function SizeFields({ kind }: { kind: ShapeKind }) {
  const size = usePlannerStore((s) => s.paletteSizes[kind]);
  const wall = usePlannerStore((s) => s.wall);
  const limits = sizeLimits(kind, wall);
  const set = (patch: Partial<{ w: number; h: number }>) => {
    const next = { ...size, ...patch };
    usePlannerStore.getState().setPaletteSize(kind, kind === "rect" ? next : { w: next.w, h: next.w });
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {kind === "rect" ? (
        <>
          <CmField label="Width" value={size.w} {...limits.w} onCommit={(w) => set({ w })} className="min-w-0" />
          <CmField label="Height" value={size.h} {...limits.h} onCommit={(h) => set({ h })} className="min-w-0" />
        </>
      ) : (
        <CmField label={kind === "square" ? "Side" : "Diameter"} value={size.w} {...limits.w} onCommit={(w) => set({ w })} className="min-w-0" />
      )}
    </div>
  );
}
