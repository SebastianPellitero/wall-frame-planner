# Frame photos and wall color — implementation plan

The spec is `docs/superpowers/specs/2026-10-22-frame-photos-wall-color-design.md`, and it is binding. Work on branch `feat/wall-planner-v1`. Execution uses subagent-driven development: the designer or frontend agent implements each task, and a reviewer checks each one.

## Global constraints (every task)
- State is in cm. The store is written once per commit (never per pointer move). Pointer Events go through `hooks/pointerSession.ts`. Tokens only. Motion comes from `lib/physics.ts`.
- Undo covers frames only, and now includes `photo` and `mat`. The wall color is not in undo.
- Never run `next dev`, because the user has one on port 3001. E2E uses the static-export server on 3100.
- Exact accessible names follow `docs/design/design-system.md` §8.
- Verify with `npm run typecheck`, `npm run lint`, `npm test`, plus `npm run test:e2e` and `npm run build` when UI changes.

## Task 1: Design update (designer)
Update `docs/design/design-system.md` and `src/app/globals.css` for:
- **(a)** a frame with a photo: the photo in the opening with the mat on, and filling inside the moulding with the mat off. The label behaves differently on photo frames. States: selected, lifted, adjusting.
- **(b)** selection photo controls per shell (stacked dock, landscape rail, desktop right panel), within the existing budgets: "Add photo"/"Replace photo", "Remove photo", the "Mat" switch and "Adjust photo".
- **(c)** adjust mode: its visual cue (for example, a crop outline plus a dimmed outside), the "Zoom" slider placement, "Done", and the cursor and touch hints.
- **(d)** the Settings → Wall "Wall color" row: about 8 named wall-paint swatches with hex values, plus "Custom".
- **(e)** light and dark variants of the grid, dimension text, empty-wall copy and origin marker, with the luminance threshold that switches between them.
- **(f)** copy and accessible names in §8 for all new controls and toasts ("Frame photo missing", and the reused ones).

Commit only `docs/design` and `src/app/globals.css`.

## Task 2: Data model and storage (frontend, TDD)
- **Types and sanitize:** add `Shape.photo`, `Shape.mat` and `Wall.color` to the types and to sanitize, per the spec.
- **Pure helpers:** `lib/framePhoto.ts` holds the cover, focus and zoom geometry: `photoLayout(openingW, openingH, photo) → { width, height, left, top }` with clamping, and `panFocus(photo, dxPx, dyPx, opening)`. `lib/wallColor.ts` holds `isLightColor(hex)` using the designer's threshold.
- **Store actions:** `setFramePhoto(id, {imageId, aspect})` resets zoom to 1 and focus to 0.5/0.5. Also add `adjustFramePhoto(id, {zoom?, focusX?, focusY?})`, `clearFramePhoto(id)` and `setMat(id, on)`. All go through history (one entry each). `setWall({color})` stays untracked. `duplicateShape` copies `photo` and `mat`.
- **Image store:** add `saveFramePhoto`, `loadFramePhoto`, `listFramePhotoIds`, `deleteFramePhotos(ids)` and `deleteAllFramePhotos` under the key prefix `wallplanner:frame-photo:`. Wrap failures in `ImageStoreUnavailableError`.
- **Commands:** `state/framePhotoCommands.ts` holds:
  - `uploadFramePhoto(id, file)`: downscale with max edge 1600, save, then `setFramePhoto`. On `ImageStoreUnavailableError`, keep the blob in memory and emit `image-session-only`. An undecodable file shows the existing toast.
  - `gcFramePhotos()`, run once after hydration: delete unreferenced keys.
  - Reset wall now also calls `deleteAllFramePhotos`.
- **Object URL cache:** `state/framePhotoUrls.ts` (or a hook), keyed by imageId and ref-counted, revoking a URL when its last user unmounts. On a missing or unavailable load, follow the spec's failure rules, adding a `frame-photo-missing` storage event and its toast copy.
- **Tests:** everything in the spec's Testing list that belongs to this layer.

## Task 3: Frame photo UI and adjust mode (frontend)
- **FrameVisual:** render the photo per `photoLayout`, honoring `mat`, with the label behavior per the design doc. Keep `data-*` contract and add `data-has-photo="true|false"` and `data-mat="true|false"`.
- **SelectionBar:** add the photo controls per shell, following the design doc. The hidden file input reuses the photo-upload pattern from the wall photo, with a busy state.
- **Adjust mode:**
  - a `dragUi`/UI-state flag `adjustingId`;
  - while it's set, a press on that frame pans the photo (motion values live, one `adjustFramePhoto` commit on release);
  - pinch zooms;
  - the Zoom slider commits on release;
  - Done, Esc or tapping outside exits;
  - frame dragging is disabled for that frame while adjusting;
  - shortcuts: Esc exits adjust, and arrow keys pan the focus in adjust mode (optional, only if the design doc specifies it).
- **Announcements:** "Photo added", "Photo removed".
- **Tests:** component tests, plus e2e covering add photo → reload persists; duplicate shares (same image src); adjust drag changes the crop and undo restores it; mat off; remove → undo. Both projects.

## Task 4: Wall color UI (frontend)
- **WallSettings:** the "Wall color" swatch radiogroup plus the "Custom" native color input, per the design doc.
- **WallStage:** set the wall surface color from `wall.color` with an inline CSS variable, and switch the light/dark variant classes with `isLightColor`.
- **Tests:** component tests, plus e2e checking that a swatch changes the wall's computed background, it persists after reload, Custom sets an exact hex, and Reset restores the default. Both projects.

## Task 5: E2E journey extension, design review, final review
- **Journey:** extend `e2e/journey.spec.ts` with a frame photo and a wall color, then reload and verify both.
- **Design review:** the designer reviews screenshots of the new states on all shells and writes findings. The frontend fixes them in one pass.
- **Final review:** a whole-branch final review of this feature's range on the most capable model, then one fix wave if needed.
