import type { Shell } from "../../hooks/useShell";
import { usePlannerStore } from "../../state/store";
import {
  DoneButton,
  NO_PHOTO_COPY,
  OpacitySlider,
  RemovePhotoButton,
  ScaleSlider,
  ShowPhotoIconSwitch,
  ShowPhotoToggle,
  UploadPhotoButton,
} from "./PhotoControls";
import { PanelSection } from "./PanelSection";

const TITLE = "Photo";
/** The region name: on desktop Settings > Photo is on screen too, as "Photo settings". */
const LABEL = "Photo tools";

/**
 * Photo mode (design-system.md §4.6): Opacity, Scale, Upload/Replace, Show photo, Remove photo
 * and Done. Stacked fills the dock's two rows with Done in the Undo/Redo slot; the landscape rail
 * stacks the sliders over three icon buttons and pins Done at the bottom; the desktop sidebar
 * lists full-label controls under the title. With no photo yet: a caption, Upload photo, Done.
 */
export function PhotoTools({ shell }: { shell: Shell }) {
  const hasImage = usePlannerStore((s) => s.background.hasImage);
  const caption = <p className="text-ui text-ink-muted">{NO_PHOTO_COPY}</p>;

  if (shell === "stacked") {
    return (
      <PanelSection title={TITLE} label={LABEL}>
        <div className="grid grid-rows-[56px_64px] gap-2">
          <div className="flex items-center gap-1">
            <UploadPhotoButton />
            {hasImage && (
              <>
                <ShowPhotoIconSwitch />
                <RemovePhotoButton iconOnly />
              </>
            )}
            <DoneButton className="ml-auto" />
          </div>
          {hasImage ? (
            // Label and readout over each track, so both tracks stay usable side by side.
            <div className="grid grid-cols-2 items-center gap-4">
              <OpacitySlider layout="stacked" />
              <ScaleSlider layout="stacked" />
            </div>
          ) : (
            caption
          )}
        </div>
      </PanelSection>
    );
  }

  if (shell === "landscape") {
    return (
      <PanelSection title={TITLE} label={LABEL} className="h-full gap-2">
        {hasImage ? (
          <>
            <OpacitySlider layout="stacked" />
            <ScaleSlider layout="stacked" />
            {/* Three 44px icon buttons fill the 132px rail exactly. */}
            <div className="flex">
              <UploadPhotoButton iconOnly />
              <ShowPhotoIconSwitch />
              <RemovePhotoButton iconOnly />
            </div>
          </>
        ) : (
          <>
            {caption}
            <UploadPhotoButton className="w-full px-2" />
          </>
        )}
        <DoneButton className="mt-auto w-full" />
      </PanelSection>
    );
  }

  return (
    <PanelSection title={TITLE} label={LABEL}>
      {hasImage ? (
        <>
          <OpacitySlider />
          <ScaleSlider />
          <UploadPhotoButton className="w-full" />
          <ShowPhotoToggle />
          <RemovePhotoButton className="self-start -ml-3.5" />
        </>
      ) : (
        <>
          {caption}
          <UploadPhotoButton className="w-full" />
        </>
      )}
      <DoneButton className="w-full" />
    </PanelSection>
  );
}
