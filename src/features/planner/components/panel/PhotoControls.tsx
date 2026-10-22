import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { sliderToWidth, widthToSlider, zoomAround, SCALE_T_MAX, SCALE_T_MIN } from "../../lib/photoTransform";
import { removePhoto, uploadPhoto } from "../../state/photoCommands";
import { usePlannerStore } from "../../state/store";
import { showToast } from "../../state/toasts";
import { DANGER_ICON_BUTTON, ICON_BUTTON, PRIMARY_BUTTON, QUIET_DANGER_BUTTON, SECONDARY_BUTTON } from "../ui/buttons";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { cx } from "../ui/cx";
import { EyeIcon, EyeOffIcon, TrashIcon, UploadIcon } from "../ui/icons";
import { Slider } from "../ui/Slider";
import { Toggle } from "../ui/Toggle";

/**
 * The photo controls (design-system.md §4.6), shared by Photo tools and Settings > Photo so each
 * behaves the same everywhere; the two panels only arrange them per shell.
 */

export const NO_PHOTO_COPY = "Add a photo of your wall to line frames up with it.";
export const UNREADABLE_PHOTO_COPY = "That file couldn't be opened as an image.";

const setBackground: ReturnType<typeof usePlannerStore.getState>["setBackground"] = (patch) =>
  usePlannerStore.getState().setBackground(patch);

/**
 * Upload photo (primary, no photo yet) or Replace photo (secondary, `upload` icon): a button in
 * front of a hidden file input. Busy (`aria-busy`, ignores presses) while the photo is processed;
 * `onUploaded` runs once it is on the wall and Photo mode is on. A file that can't be opened shows
 * an error toast.
 */
export function UploadPhotoButton({ iconOnly, onUploaded, className }: { iconOnly?: boolean; onUploaded?: () => void; className?: string }) {
  const hasImage = usePlannerStore((s) => s.background.hasImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const label = hasImage ? "Replace photo" : "Upload photo";

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      await uploadPhoto(file);
      onUploaded?.();
    } catch (error) {
      // Not a decodable image; the wall is unchanged.
      console.error("Photo upload failed", error);
      showToast({ key: "photo-unreadable", tone: "error", message: UNREADABLE_PHOTO_COPY });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        aria-busy={busy}
        data-photo-upload=""
        onClick={() => !busy && inputRef.current?.click()}
        className={cx(
          iconOnly ? ICON_BUTTON : hasImage ? SECONDARY_BUTTON : PRIMARY_BUTTON,
          busy && "cursor-progress opacity-60",
          className,
        )}
      >
        {(iconOnly || hasImage) && <UploadIcon size={iconOnly ? 20 : 18} />}
        {!iconOnly && label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Cleared, so picking the same file again still fires a change.
          e.target.value = "";
          void onFile(file);
        }}
      />
    </>
  );
}

/** Show photo as an icon-only switch (`eye` / `eye-off`, the icon is the non-color cue): Photo tools on phones. */
export function ShowPhotoIconSwitch() {
  const visible = usePlannerStore((s) => s.background.visible);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-label="Show photo"
      title="Show photo"
      onClick={() => setBackground({ visible: !visible })}
      className={cx(ICON_BUTTON, !visible && "text-ink-muted")}
    >
      {visible ? <EyeIcon /> : <EyeOffIcon />}
    </button>
  );
}

/** Show photo as a switch row (§5.8): the desktop sidebar and Settings > Photo. */
export function ShowPhotoToggle() {
  const visible = usePlannerStore((s) => s.background.visible);
  return <Toggle label="Show photo" checked={visible} onChange={(v) => setBackground({ visible: v })} />;
}

/**
 * Remove photo, an icon button (phones' Photo tools) or quiet danger text, behind the confirm
 * dialog (§5.11). Removing unmounts this button, so focus moves on to Upload photo in the same
 * panel (inside the Settings sheet too) instead of falling to <body>.
 */
export function RemovePhotoButton({ iconOnly, className }: { iconOnly?: boolean; className?: string }) {
  const [confirming, setConfirming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const confirm = () => {
    const panel = buttonRef.current?.closest("section");
    // Commit now, so Upload photo is on screen when focus moves.
    flushSync(() => {
      setConfirming(false);
      void removePhoto();
    });
    panel?.querySelector<HTMLElement>("[data-photo-upload]")?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={iconOnly ? "Remove photo" : undefined}
        title={iconOnly ? "Remove photo" : undefined}
        aria-haspopup="dialog"
        onClick={() => setConfirming(true)}
        className={cx(iconOnly ? DANGER_ICON_BUTTON : QUIET_DANGER_BUTTON, className)}
      >
        <TrashIcon size={iconOnly ? 20 : 18} />
        {!iconOnly && "Remove photo"}
      </button>
      <ConfirmDialog
        open={confirming}
        title="Remove the photo?"
        confirmLabel="Remove photo"
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
      />
    </>
  );
}

/** Opacity, 0–100% in 5% steps, stored as 0–1. */
export function OpacitySlider({ layout }: { layout?: "row" | "stacked" | "cells" }) {
  const percent = usePlannerStore((s) => Math.round(s.background.opacity * 100));
  return (
    <Slider
      label="Opacity"
      value={percent}
      min={0}
      max={100}
      step={5}
      readout={`${percent}%`}
      onChange={(v) => setBackground({ opacity: v / 100 })}
      layout={layout}
    />
  );
}

/** Scale on the log mapping width = wall.width × 2^t (25–400%), about the wall's center. */
export function ScaleSlider({ layout }: { layout?: "row" | "stacked" | "cells" }) {
  const width = usePlannerStore((s) => s.background.width);
  const wall = usePlannerStore((s) => s.wall);
  const onChange = (t: number) => {
    const bg = usePlannerStore.getState().background;
    const center = { x: wall.width / 2, y: wall.height / 2 };
    const { x, y, width: next } = zoomAround(bg, sliderToWidth(t, wall) / bg.width, center, wall);
    setBackground({ x, y, width: next });
  };
  return (
    <Slider
      label="Scale"
      value={widthToSlider(width, wall)}
      min={SCALE_T_MIN}
      max={SCALE_T_MAX}
      step={0.01}
      readout={`${Math.round((width / wall.width) * 100)}%`}
      onChange={onChange}
      layout={layout}
    />
  );
}

const done = () => usePlannerStore.getState().setMode("arrange");

export function DoneButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={done} className={cx(PRIMARY_BUTTON, className)}>
      Done
    </button>
  );
}
