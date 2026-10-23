import { useRef } from "react";
import { flushSync } from "react-dom";
import type { Shell } from "../../hooks/useShell";
import { openingBox } from "../../lib/frameLook";
import { zoomPhotoAt, ZOOM_MAX, ZOOM_MIN } from "../../lib/framePhoto";
import { exitAdjust, useSelectionUi } from "../../state/selectionUi";
import { usePlannerStore } from "../../state/store";
import type { Shape } from "../../types";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { cx } from "../ui/cx";
import { Slider } from "../ui/Slider";
import { useWallContext } from "../wall/WallContext";
import { ADJUST_ATTR } from "./FramePhotoControls";

/** The panel hint (§5.17), chosen by CSS like the empty-wall line: coarse pointers pinch, fine ones have arrow keys. */
function AdjustHint({ className }: { className?: string }) {
  return (
    <p className={cx("text-caption text-ink-muted", className)}>
      <span className="can-hover:hidden">Drag the photo to move it. Pinch to zoom.</span>
      <span className="hidden can-hover:inline">Drag the photo to move it, or use the arrow keys.</span>
    </p>
  );
}

/**
 * Zoom, 100–400% in 1% steps, about the opening's center. While it moves only the frame's
 * preview changes; letting go (or a key press) is the one commit, focus re-clamped.
 */
function ZoomSlider({ shape, layout }: { shape: Shape; layout: "row" | "stacked" }) {
  const { pxPerCm } = useWallContext();
  const preview = useSelectionUi((s) => s.previewZoom);
  const zoom = preview ?? shape.photo?.zoom ?? ZOOM_MIN;
  const percent = Math.round(zoom * 100);
  const commit = (v: number) => {
    const current = usePlannerStore.getState().shapes.find((s) => s.id === shape.id);
    if (current?.photo) {
      const opening = openingBox(current.w * pxPerCm, current.h * pxPerCm, current.mat);
      usePlannerStore.getState().adjustFramePhoto(shape.id, zoomPhotoAt(current.photo, v / 100, opening));
    }
    useSelectionUi.getState().setPreviewZoom(null);
  };
  return (
    <Slider
      label="Zoom"
      value={percent}
      min={ZOOM_MIN * 100}
      max={ZOOM_MAX * 100}
      step={1}
      readout={`${percent}%`}
      onChange={(v) => useSelectionUi.getState().setPreviewZoom(v / 100)}
      onCommit={commit}
      layout={layout}
      className={layout === "row" ? "w-full" : undefined}
    />
  );
}

/** Done: ends adjust mode and returns focus to Adjust, which takes the tools' place again. */
function DoneButton({ className }: { className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const onClick = () => {
    const section = ref.current?.closest("section");
    flushSync(exitAdjust);
    section?.querySelector<HTMLElement>(`[${ADJUST_ATTR}]`)?.focus();
  };
  return (
    <button ref={ref} type="button" onClick={onClick} className={cx(PRIMARY_BUTTON, className)}>
      Done
    </button>
  );
}

/**
 * Adjust mode's tools per shell (design-system.md §4.7): the stacked dock's two rows (hint and
 * Done, then Zoom; Undo/Redo keep row A's end), the landscape rail with Done pinned at the bottom,
 * or the desktop Frame photo group.
 */
export function AdjustTools({ shape, shell }: { shape: Shape; shell: Shell }) {
  if (shell === "stacked") {
    return (
      <>
        <div className="flex items-center gap-2 pr-24">
          <AdjustHint className="min-w-0 flex-1" />
          <DoneButton />
        </div>
        <div className="flex items-center">
          <ZoomSlider shape={shape} layout="row" />
        </div>
      </>
    );
  }
  return (
    <>
      <AdjustHint />
      <ZoomSlider shape={shape} layout="stacked" />
      <DoneButton className={cx("w-full", shell === "landscape" && "mt-auto")} />
    </>
  );
}
