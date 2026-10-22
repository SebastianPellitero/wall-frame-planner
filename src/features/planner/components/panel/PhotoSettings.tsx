import { usePlannerStore } from "../../state/store";
import { SECONDARY_BUTTON } from "../ui/buttons";
import { NO_PHOTO_COPY, OpacitySlider, RemovePhotoButton, ShowPhotoToggle, UploadPhotoButton } from "./PhotoControls";
import { SettingsSection } from "./SettingsSection";

/**
 * Settings > Photo (design-system.md §5.6), in the phones' sheet and the desktop right panel:
 * Upload or Replace photo, Show photo, Opacity, then Adjust photo (into Photo mode, where the
 * scale lives) and Remove photo. `onEnterPhoto` runs whenever this enters Photo mode (Adjust, or
 * a finished upload), so the phones' sheet can get out of the way.
 */
export function PhotoSettings({ onEnterPhoto }: { onEnterPhoto?: () => void }) {
  const hasImage = usePlannerStore((s) => s.background.hasImage);
  const photoMode = usePlannerStore((s) => s.mode === "photo");

  const adjust = () => {
    usePlannerStore.getState().setMode("photo");
    onEnterPhoto?.();
  };

  return (
    <SettingsSection title="Photo" label="Photo settings">
      {!hasImage && <p className="text-caption text-ink-muted">{NO_PHOTO_COPY}</p>}
      <UploadPhotoButton onUploaded={onEnterPhoto} className="self-start" />
      {hasImage && (
        <>
          <ShowPhotoToggle />
          <OpacitySlider />
          <div className="flex items-center justify-between gap-2">
            {!photoMode && (
              <button type="button" onClick={adjust} className={SECONDARY_BUTTON}>
                Adjust photo
              </button>
            )}
            <RemovePhotoButton className="-mr-3.5 ml-auto" />
          </div>
        </>
      )}
    </SettingsSection>
  );
}
