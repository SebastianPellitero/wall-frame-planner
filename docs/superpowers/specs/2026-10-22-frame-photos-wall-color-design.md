# Frame photos and wall color — design

## Context
WallPlanner v1 is built: Frame creator, Matrix control, draggable frames with physics, selection, settings, a background photo, and autosave. The user now wants two things:
1. **Their own photo in each frame**, uploaded from the selected frame.
2. **A wall color** chosen with a color picker, for when no wall photo is used.

## Decisions confirmed with the user
- **Photo fit: fill and adjust.** The photo fills the frame's picture area (cover, cropped). In the selected frame you can drag to choose the crop and zoom with a slider or a pinch.
- **Mat: a per-frame switch.** It's on by default, like a gallery frame. Turning it off lets the photo fill everything inside the moulding.
- **Wall color:** about 8 wall-paint swatches plus a **Custom** button that opens the full system color picker.
- A **duplicated frame shares** the original's photo, with no second copy stored.
- **Undo/redo covers** adding, replacing, adjusting and removing a frame's photo, and the mat switch. The wall color is not in undo, same as the wall size.

## Data model (cm, unchanged elsewhere)
- `Shape` gains:
  - `photo?: { imageId: string; aspect: number; zoom: number; focusX: number; focusY: number }`
    - `aspect` = image height / width.
    - `zoom` is in `[1, 4]`, where 1 is cover.
    - `focusX`/`focusY` are in `[0, 1]`: the image point at the center of the opening (0.5/0.5 is centered).
  - `mat: boolean` (default `true`).
- `Wall` gains `color: string`: a `#rrggbb` hex whose default is the current wall-surface token value.
- `sanitize`:
  - drops a `photo` with an invalid shape;
  - clamps `zoom` and `focus`;
  - defaults `mat` to true and `color` to the default;
  - accepts only `#rrggbb` for `color`.
- The persist version stays 1. Sanitize fills the new fields.

## Storage
- Frame images live in IndexedDB under `wallplanner:frame-photo:<imageId>`. Each is downscaled on upload: longest edge 1600 px, JPEG 0.85, reusing `downscaleImage`.
- `imageId` comes from `newId()` per upload. Duplicate copies the `photo` object, so both frames reference the same id.
- **No immediate delete.** Removing a photo, deleting a frame or replacing a photo leaves the blob in place, so undo can restore it.
- **Garbage collection at startup:** after hydration, delete every `wallplanner:frame-photo:*` key that no persisted shape references. **Reset wall** deletes all frame-photo keys.
- **Object URLs:** a small in-memory cache keyed by `imageId` (load once, share between frames using the same id, revoke when no mounted frame uses it).
- **Failures:**
  - If IndexedDB is unavailable on save, the photo still shows for this session (in-memory blob) and the existing `image-session-only` toast fires.
  - A transient load error keeps the frame's `photo` data and shows the frame without the image, plus the non-destructive "couldn't be loaded right now" toast.
  - A successful load that finds nothing removes `photo` from that frame and shows a "frame photo missing" toast.
  - A file that can't be decoded shows the existing "couldn't open as an image" toast.

## Frame photo UI
- **Rendering:** inside the opening (mat on) or inside the moulding (mat off), an `<img>` with cover behavior.
  - The image is drawn at `zoom × cover size`, positioned so its `(focusX, focusY)` point sits at the opening's center, then clamped so no empty band shows.
  - The size label hides when the frame has a photo (a label caption returns on hover or selection, per the designer).
- **Selection controls**, in the existing SelectionBar and per shell as the designer places them:
  - **"Add photo"** or **"Replace photo"**, opening the file picker;
  - **"Remove photo"**;
  - a **"Mat"** switch;
  - **"Adjust photo"**, shown only when the frame has a photo.
- **Adjust mode** (a sub-state of Arrange for the selected frame):
  - Dragging inside that frame pans the photo, updating `focusX`/`focusY` live through motion values and committing once on release.
  - Pinch, or a **"Zoom"** slider, sets `zoom`.
  - **"Done"**, Esc, or tapping outside the frame exits.
  - While adjusting, the frame doesn't move and the other frames stay interactive only after exiting.
  - One undo step per gesture or slider release.
- **Accessibility:** the image's alt is empty and the frame's accessible name gains "with photo". Each control has an exact accessible name, which the designer lists in §8.

## Wall color UI
- **Settings → Wall** gets a "Wall color" row with about 8 swatches (radio group, names from the designer) plus **"Custom"**, a visually wrapped native `<input type="color">`.
- **Applying it:** the wall's surface uses `wall.color` through an inline CSS variable on the wall element. The wall photo, when shown, sits above it.
- **Contrast:** from the color's relative luminance, choose the light or dark variants of the grid lines, the dimension text, the empty-wall copy and the origin marker. The designer defines both sets. Frame keylines already work on any background.

## Out of scope
Per-frame photo rotation, filters, multiple photos per frame, cloud storage, and per-frame mat color.

## Testing
- Unit tests:
  - sanitize for the new fields;
  - the store actions (`setFramePhoto`, `clearFramePhoto`, `adjustFramePhoto`, `setMat`, `setWall({color})`);
  - undo coverage;
  - duplicate sharing `imageId`;
  - GC removing only unreferenced keys;
  - reset clearing frame photos;
  - the cover/focus/zoom geometry (pure);
  - the luminance → light/dark choice.
- Component tests for the selection photo controls, adjust mode and the wall color row.
- E2E (desktop and phone-landscape):
  - add a photo to a frame, then reload: it's still there;
  - duplicate shares the photo;
  - adjust by dragging changes the crop, and undo restores it;
  - mat off;
  - remove the photo, then undo;
  - a wall swatch changes the wall's computed background, it persists after reload, and Reset restores the default.
