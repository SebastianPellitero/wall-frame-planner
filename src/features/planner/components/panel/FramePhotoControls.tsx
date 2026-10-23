import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { announce } from "../../state/announcer";
import { removeFramePhoto } from "../../state/frameCommands";
import { uploadFramePhoto } from "../../state/framePhotoCommands";
import { enterAdjust } from "../../state/selectionUi";
import { usePlannerStore } from "../../state/store";
import { showToast } from "../../state/toasts";
import type { Shape } from "../../types";
import { DANGER_ICON_BUTTON, ICON_BUTTON, QUIET_DANGER_BUTTON, SECONDARY_BUTTON, SECONDARY_DANGER_BUTTON } from "../ui/buttons";
import { cx } from "../ui/cx";
import { CropIcon, ImageAddIcon, MatIcon, MatOffIcon, TrashIcon, UploadIcon } from "../ui/icons";
import { Toggle } from "../ui/Toggle";
import { UNREADABLE_PHOTO_COPY } from "./PhotoControls";

/**
 * The selected frame's photo controls (design-system.md §4.7). Every name says "frame", so none
 * contains a wall-photo name. `look`: "label" (text, desktop), "icon" (the landscape rail's
 * borderless icons) or "dock" (the stacked dock: icon-only below 640px, `aria-label` plus `title`).
 */
export type ControlLook = "label" | "icon" | "dock";

/** Marks the Add/Replace and Adjust buttons, so focus can land on them when their slot changes. */
export const UPLOAD_ATTR = "data-frame-photo-upload";
export const ADJUST_ATTR = "data-frame-photo-adjust";

/** Text that the stacked dock drops below 640px (the name stays in `aria-label`). */
const dockText = (look: ControlLook, text: string) => (look === "icon" ? null : <span className={cx(look === "dock" && "max-sm:hidden")}>{text}</span>);
/** The dock's bordered buttons go square and icon-only below 640px. */
const DOCK_ICON_ONLY = "max-sm:w-touch max-sm:px-0";

const RESULT_COPY = { added: "Photo added", replaced: "Photo replaced" } as const;

/**
 * Add photo (no photo) or Replace (with one): a button in front of a hidden file input, busy
 * (`aria-busy`, ignores presses) while the photo is decoded and saved. Add and Replace are one
 * slot, so focus stays put. A file that can't be opened shows the wall photo's error toast.
 */
export function FramePhotoUploadButton({ shape, look, className }: { shape: Shape; look: ControlLook; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const has = shape.photo !== undefined;
  const name = has ? "Replace frame photo" : "Add photo to frame";
  // Add keeps its label everywhere; only Replace goes icon-only (rail; dock below 640px).
  const iconOnly = has && look === "icon";

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadFramePhoto(shape.id, file);
      if (result !== "frame-gone") announce(RESULT_COPY[result]);
    } catch (error) {
      // Not a decodable image; the frame is unchanged.
      console.error("Frame photo upload failed", error);
      showToast({ key: "photo-unreadable", tone: "error", message: UNREADABLE_PHOTO_COPY });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={name}
        title={has && look !== "label" ? name : undefined}
        aria-busy={busy}
        {...{ [UPLOAD_ATTR]: "" }}
        onClick={() => !busy && inputRef.current?.click()}
        className={cx(
          iconOnly ? ICON_BUTTON : SECONDARY_BUTTON,
          has && look === "dock" && DOCK_ICON_ONLY,
          busy && "cursor-progress opacity-60",
          className,
        )}
      >
        {has ? <UploadIcon size={iconOnly ? 20 : 18} /> : <ImageAddIcon size={18} />}
        {!iconOnly && (has ? dockText(look, "Replace") : "Add photo")}
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

/** Adjust: enters adjust mode and moves focus to the frame, so the arrow keys work at once (§5.17). */
export function AdjustFramePhotoButton({ shape, look }: { shape: Shape; look: ControlLook }) {
  const iconOnly = look === "icon";
  const onClick = () => {
    if (!enterAdjust(shape.id)) return;
    document.querySelector<HTMLElement>(`[data-shape-id="${CSS.escape(shape.id)}"]`)?.focus();
  };
  return (
    <button
      type="button"
      aria-label="Adjust frame photo"
      title={iconOnly ? "Adjust frame photo" : undefined}
      {...{ [ADJUST_ATTR]: "" }}
      onClick={onClick}
      className={iconOnly ? ICON_BUTTON : SECONDARY_BUTTON}
    >
      <CropIcon size={iconOnly ? 20 : 18} />
      {!iconOnly && "Adjust"}
    </button>
  );
}

/**
 * Remove: no confirm (one undo step, "Photo removed"). It unmounts with the photo, so focus moves
 * to Add photo, which takes the same slot.
 */
export function RemoveFramePhotoButton({ shape, look, className }: { shape: Shape; look: ControlLook; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const onClick = () => {
    const section = ref.current?.closest("section");
    flushSync(() => removeFramePhoto(shape.id));
    section?.querySelector<HTMLElement>(`[${UPLOAD_ATTR}]`)?.focus();
  };
  const style = look === "icon" ? DANGER_ICON_BUTTON : look === "dock" ? cx(SECONDARY_DANGER_BUTTON, DOCK_ICON_ONLY) : QUIET_DANGER_BUTTON;
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Remove frame photo"
      title={look !== "label" ? "Remove frame photo" : undefined}
      onClick={onClick}
      className={cx(style, className)}
    >
      <TrashIcon size={look === "icon" ? 20 : 18} />
      {dockText(look, "Remove")}
    </button>
  );
}

const setMat = (id: string, on: boolean) => usePlannerStore.getState().setMat(id, on);

/** Mat as a switch row (§5.8): desktop full width, the dock compact. Always shown, photo or not. */
export function MatToggle({ shape, compact, className }: { shape: Shape; compact?: boolean; className?: string }) {
  return <Toggle label="Mat" checked={shape.mat} compact={compact} onChange={(on) => setMat(shape.id, on)} className={className} />;
}

/** Mat as an icon switch in the landscape action row: `mat` / `mat-off`, the icon is the non-color cue. */
export function MatIconSwitch({ shape }: { shape: Shape }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={shape.mat}
      aria-label="Mat"
      title="Mat"
      onClick={() => setMat(shape.id, !shape.mat)}
      className={cx(ICON_BUTTON, !shape.mat && "text-ink-muted")}
    >
      {shape.mat ? <MatIcon /> : <MatOffIcon />}
    </button>
  );
}
