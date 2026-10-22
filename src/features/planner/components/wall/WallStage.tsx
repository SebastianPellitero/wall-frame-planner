import { useCallback, type PointerEvent, type ReactNode, type Ref } from "react";
import { usePinchPan } from "../../hooks/usePinchPan";
import type { Shell } from "../../hooks/useShell";
import { clientToWallCm } from "../../lib/geometry";
import { useDragUi } from "../../state/dragUi";
import { usePlannerStore } from "../../state/store";
import { cx } from "../ui/cx";
import { BackgroundLayer } from "./BackgroundLayer";
import { FramesLayer } from "./FramesLayer";
import { GridLayer } from "./GridLayer";
import { SnapGuides } from "./SnapGuides";
import { useWallContext } from "./WallContext";
import { WallDimensions } from "./WallDimensions";

/**
 * Safe-area insets that no bar or rail absorbs (§4.1). The CSS pads only the part of each
 * inset beyond `p`, and useWallScale subtracts `p` on every side, so the wall clears
 * max(p, inset) without losing p twice. Stacked: bars absorb top and bottom. Landscape: rails
 * absorb left and right. Desktop: nothing to clear.
 */
const SAFE_PADDING: Record<Shell, string> = {
  stacked:
    "pl-[max(0px,calc(var(--spacing-safe-left)-var(--spacing-stage)))] pr-[max(0px,calc(var(--spacing-safe-right)-var(--spacing-stage)))]",
  landscape:
    "pt-[max(0px,calc(var(--spacing-safe-top)-var(--spacing-stage)))] pb-[max(0px,calc(var(--spacing-safe-bottom)-var(--spacing-stage)))]",
  desktop: "",
};

/** Sets a ref of either kind and returns how to undo it. */
function assignRef<T>(ref: Ref<T> | undefined, value: T): (() => void) | undefined {
  if (typeof ref === "function") {
    const cleanup = ref(value);
    return typeof cleanup === "function" ? cleanup : () => ref(null);
  }
  if (ref) {
    ref.current = value;
    return () => {
      ref.current = null;
    };
  }
}

/**
 * The stage (the room) with the to-scale wall centered in it. Wall layers, bottom to top:
 * background photo, grid, frames, live snap guides. `children` are stage overlays (rotate hint, toasts).
 * In Photo mode the whole stage takes pan, pinch and wheel gestures for the photo (§4.6).
 */
export function WallStage({ stageRef, shell, children }: { stageRef: Ref<HTMLElement>; shell: Shell; children?: ReactNode }) {
  const { pxPerCm, wallRef, wallPx } = useWallContext();
  const mode = usePlannerStore((s) => s.mode);
  const empty = usePlannerStore((s) => s.shapes.length === 0);
  const width = usePlannerStore((s) => s.wall.width);
  const height = usePlannerStore((s) => s.wall.height);
  const photo = usePinchPan({ enabled: mode === "photo", wallRef, pxPerCm });
  const photoStageRef = photo.stageRef;
  const setStage = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const undoStage = assignRef(stageRef, el);
      const undoPhoto = photoStageRef(el);
      return () => {
        undoStage?.();
        undoPhoto?.();
      };
    },
    [stageRef, photoStageRef],
  );

  const onWallPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Grid origin mode: a tap anywhere on the wall (frames are inert here) moves the origin.
    if (mode === "gridOrigin") {
      if (!e.isPrimary || e.button !== 0) return;
      const cm = clientToWallCm({ x: e.clientX, y: e.clientY }, e.currentTarget.getBoundingClientRect(), pxPerCm);
      usePlannerStore.getState().setGridOrigin(cm);
      return;
    }
    // A primary press on the bare wall (not a frame) clears the selection in Arrange mode. A second
    // finger during a touch drag, a right-click or any press while a drag is live leaves it.
    if (mode !== "arrange" || e.target !== e.currentTarget) return;
    if (e.isPrimary && e.button === 0 && !useDragUi.getState().draggingId) usePlannerStore.getState().select(null);
  };

  return (
    <main
      ref={setStage}
      data-testid="stage"
      onPointerDown={photo.onPointerDown}
      className={cx(
        // touch-none in every mode: a pinch beside the wall never zooms the page, and in Photo
        // mode (the photo extends past the wall) a pan or pinch may start anywhere (§4.6).
        "relative isolate grid min-h-0 min-w-0 flex-1 touch-none place-items-center overflow-hidden bg-stage",
        SAFE_PADDING[shell],
      )}
    >
      {pxPerCm > 0 && (
        <div
          ref={wallRef}
          data-testid="wall"
          onPointerDown={onWallPointerDown}
          style={{ width: wallPx.w, height: wallPx.h }}
          className={cx(
            "relative z-wall touch-none bg-wall shadow-wall",
            mode === "gridOrigin" && "cursor-crosshair",
            mode === "photo" && "cursor-move",
          )}
        >
          <BackgroundLayer live={photo.live} />
          <GridLayer />
          <FramesLayer />
          <SnapGuides />
          {empty && mode === "arrange" && <EmptyWallCopy />}
          {shell === "desktop" && <WallDimensions width={width} height={height} />}
        </div>
      )}
      {children}
    </main>
  );
}

/** §5.14. "tap" or "click" is chosen by CSS (`can-hover:`), never at render. */
function EmptyWallCopy() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
      <p className="max-w-[24ch] text-center font-serif text-lead text-balance text-ink-muted">
        Drag a frame onto the wall, or <span className="can-hover:hidden">tap</span>
        <span className="hidden can-hover:inline">click</span> the preview to add one.
      </p>
    </div>
  );
}
