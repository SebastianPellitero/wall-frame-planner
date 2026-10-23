import { useId } from "react";
import type { Shape } from "../../types";
import { cx } from "../ui/cx";
import { AdjustTools } from "./AdjustTools";
import { AdjustFramePhotoButton, FramePhotoUploadButton, MatToggle, RemoveFramePhotoButton } from "./FramePhotoControls";

/**
 * The frame photo controls as each shell places them (design-system.md §4.7). Add and Replace
 * keep one keyed slot inside one parent, so a finished upload never remounts the focused button.
 */

/** Stacked dock row B, Photo tab: [Add photo], or [Adjust] [Replace] [Remove]; the compact Mat pinned right. */
export function DockPhotoControls({ shape }: { shape: Shape }) {
  const has = shape.photo !== undefined;
  return (
    <>
      {has && <AdjustFramePhotoButton key="adjust" shape={shape} look="dock" />}
      <FramePhotoUploadButton key="upload" shape={shape} look="dock" />
      {has && <RemoveFramePhotoButton key="remove" shape={shape} look="dock" />}
      <MatToggle key="mat" shape={shape} compact className="ml-auto" />
    </>
  );
}

/** Landscape rail photo row: [Add photo] full width, or Replace, Adjust and Remove as three icons. */
export function RailPhotoControls({ shape }: { shape: Shape }) {
  const has = shape.photo !== undefined;
  return (
    <div className={has ? "grid grid-cols-3" : "flex"}>
      <FramePhotoUploadButton key="upload" shape={shape} look="icon" className={cx(!has && "w-full px-2")} />
      {has && <AdjustFramePhotoButton key="adjust" shape={shape} look="icon" />}
      {has && <RemoveFramePhotoButton key="remove" shape={shape} look="icon" />}
    </div>
  );
}

/**
 * Desktop and narrow desktop: the "Frame photo" group at the end of Selected frame. [Add photo]
 * full width, or [Adjust] [Replace]; the Mat row; Remove as quiet danger. Adjusting swaps the
 * controls for the adjust tools; the rest of Selected frame stays.
 */
export function DesktopFramePhoto({ shape, adjusting }: { shape: Shape; adjusting: boolean }) {
  const labelId = useId();
  const has = shape.photo !== undefined;
  return (
    // PanelSection's 12px gap + 4px: 16px above the divider (§4.7).
    <div role="group" aria-labelledby={labelId} className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
      <p id={labelId} className="text-ui font-medium text-ink">
        Frame photo
      </p>
      {adjusting ? (
        <AdjustTools shape={shape} shell="desktop" />
      ) : (
        <>
          <div className={has ? "grid grid-cols-2 gap-2" : "flex"}>
            {has && <AdjustFramePhotoButton key="adjust" shape={shape} look="label" />}
            <FramePhotoUploadButton key="upload" shape={shape} look="label" className={cx(!has && "w-full")} />
          </div>
          <MatToggle shape={shape} />
          {has && <RemoveFramePhotoButton shape={shape} look="label" className="-ml-3.5 self-start" />}
        </>
      )}
    </div>
  );
}
