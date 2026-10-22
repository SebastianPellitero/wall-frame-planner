# Task 12b report: design-review polish and interaction robustness

Status: **DONE**. All 12 List A findings and all 6 List B items are fixed, with tests. Branch `feat/wall-planner-v1`: it didn't exist (HEAD was `main` at `c0b689c`), so I created it at `c0b689c` before committing. `LICENSE` and `README.md` are untouched.

After-shots are in `shots/review-after/`. I captured them with a copy of the designer's T12a scratch script (`capture.cjs` in the session scratchpad, with the same shells, seeds, states and the iPhone safe-area override) against the static export on :3300. The server was stopped afterwards. The script stays outside the repo.

## List A: designer findings

| ID | Fix | Test | After-shot |
|---|---|---|---|
| M1 | `useShell.ts`: `SHELL_QUERIES.desktopNarrow` plus a `useDesktopNarrow()` hook. `globals.css`: `@custom-variant desktop-narrow`. `DesktopShell`: when narrow, `RightPanel` isn't rendered, and a Settings button (`SettingsSheet shell="landscape"`, the landscape side sheet) sits after Undo/Redo. `ContextPanel` takes `narrow`, and `pickContent` returns the Selection content on a narrow desktop (serif "Selected frame" title, labelled Duplicate/Delete, Width/Height over X/Y). Measured at 1024 × 768: **stage 744px, wall 664 × 553**. | `useShell.test.ts` (query + hook), `ContextPanel.test.tsx` (narrow selection), e2e `shell.spec.ts` "narrow desktop" (stage 744, wall 664, Settings sheet, selection in the sidebar, Esc brings the creator back) | `d1024-02a-frames-nophoto`, `d1024-03-selected`, `d1024-08-settings`, `d1024-06-photo-mode` |
| M2 | New `hooks/useMoreBelow.ts`: a callback ref that toggles `data-more` from a scroll listener and a ResizeObserver (scroller + content). It writes the attribute directly, so there are no re-renders. The `ContextPanel` scroller on non-stacked shells gets `data-more:[mask-image:linear-gradient(to_bottom,#000_calc(100%-16px),transparent)]`. | `ContextPanel.test.tsx` (set while more is below, cleared at the end, never on stacked) | `pixel-01-empty`, `iphone-11-invalid` (the faded Show grid is the cue), `pixel-11b-invalid-rail-end` / `iphone-11b-invalid-rail-end` (no fade at the end) |
| M3 | `CmField` gets `helperId` + `onInvalidChange`: with an outside helper it renders none and reports its text. New `ui/useSharedHelper.tsx` renders one `col-span-2 -mt-1 whitespace-nowrap text-caption text-danger` line below the pair. Each invalid input points `aria-describedby` at its own span. When both are invalid, the line shows the field that went invalid last and the other's span stays `sr-only`, so each field is still described by its own limits (Width 1–300 and Height 1–250 differ). The rail grows 20px (4 + 16). | `CmField.test.tsx`, `FrameCreator.test.tsx` (one line, below both, both-invalid descriptions), `SelectionBar.test.tsx` | `pixel-11-invalid`, `iphone-11-invalid` |
| M4 | `CmField` `errorInLabel`: `flex justify-between gap-1` row with the label (`text-ink-muted`) and the limits (`text-danger whitespace-nowrap`, `id={helperId}`, visually hidden "Use"). Accessible description: "Use 1–300 cm". | `CmField.test.tsx`, `FrameCreator.test.tsx` (stacked) | `portrait-11-invalid` |
| M5 | `FrameNode`: `selected={selected && arrange}`. | `FrameNode.test.tsx` (photo and gridOrigin hide the brackets, which come back in Arrange with the selection kept) | `pixel-07-origin`, `d1440-07-origin` |
| M6 | `SettingsSections` takes `photo` (default true), and `RightPanel` passes `photo={mode !== "photo"}`. Wall, Grid and Reset wall stay. | New `RightPanel.test.tsx` | `d1440-06-photo-mode` (one Opacity slider on screen, measured) |
| M7 | `Slider` gets `layout="cells"` (a `contents` wrapper). Desktop `PhotoTools` wraps Opacity and Scale in one `grid grid-cols-[auto_1fr_auto] items-center gap-x-3`. **Deviation:** the readout is `w-[5ch]`, not `w-[4ch]`. At 4ch "100%" overflowed its cell and was clipped at the sidebar edge (a `%` is wider than 1ch; seen in my first capture). 5ch is still fixed, so the track end doesn't move as the value changes. Measured tracks: both at x 77–211px on d1440 and d1024. | `Slider.test.tsx`, `PhotoTools.test.tsx` | `d1440-06-photo-mode`, `d1024-06-photo-mode` |
| L1 | Helper `whitespace-nowrap`, plus `centerHelper` → `self-center` under the desktop Width field. Generate now moves 20px instead of 36. | `CmField.test.tsx`, `FrameCreator.test.tsx` (desktop) | `d1440-11-invalid`, `d1024-11-invalid` |
| L2 | Input `aria-invalid:focus:outline-danger aria-invalid:focus-visible:outline-danger`. | `CmField.test.tsx` | `pixel-11-invalid`, `portrait-11-invalid` (red ring on the focused field) |
| L3 | `ResetWall` body: "Every frame and the photo are removed, and all settings go back to their defaults. This can't be undone." | `ResetWall.test.tsx` (exact string) | `pixel-09-reset`. **Note:** this is three lines at 360px in Chromium with Archivo `text-ui`, not the two §5.11 estimates. It is still down from four, and the copy is the designer's exact text, so I left it. |
| L4 | `CmField` compact input: `font-stretch-semi-condensed` (still `text-body`, `pr-6`, unit at `right-1.5`). | `CmField.test.tsx` | `pixel-03b-selected-3digit`, `iphone-03b-selected-3digit` (X 220 / Y 110) |
| L5 | `WallDimensions`: lines at `mb-5` / `mr-5` (20px). The label keeps its existing 2px offset from its line: I read "label stays 14px left of the line" as "keeps its place relative to the line", since the code never had a 14px label offset. Updated §5.13 from 14px to 20px as the finding asks. | `WallStage.test.tsx` | `d1440-02-frames-photo` |

## List B: batched feel and robustness fixes

| # | Fix | Test | Evidence |
|---|---|---|---|
| 1 | `useFrameMotion`: the nudge fades only after `Promise.all([x.finished, y.finished])`, guarded by a `nudgeToken` so a stale push can't fade a newer one. The jump path does `nudgeOpacity.jump(0)`. **Verified first:** a stopped or jumped motion animation never resolves `finished` (probe in a throwaway test), which is why the jump path must reset the nudge explicitly. | New `useFrameMotion.test.tsx` with a controllable `animate` fake: y-only push, jump mid-push, stale push | unit |
| 2 | `WallStage`: bare-wall deselect only for `e.isPrimary && e.button === 0 && !useDragUi.getState().draggingId`. | `WallStage.test.tsx` (second finger, right-click, live drag) | unit |
| 3 | `useFrameDrag`: when `enabled` turns false during a live session, `finishSession` stops the pointer session and runs the same `end()` as a release: one commit at the current clamped spot, `endDrag()` (guides cleared), `setDragging(false)`. Later moves and the pointerup are ignored. | `FrameNode.test.tsx` "a mode change mid-drag ends the drag" | unit |
| 4 | `useFrameMotion` exposes `raised`: true from `lift`, false once the drop's x, y **and** scale settle. Because interrupted animations never resolve, every interruption re-arms the wait. A push waits on its own x/y plus the pending scale; a jump waits on the pending scale; a new lift bumps the token. `FrameNode` uses `dragging \|\| raised` for `z-frame-lifted`. | `useFrameMotion.test.tsx` (4 cases), `FrameNode.test.tsx` (lifted right after release, `z-frames` once settled) | unit |
| 5 | `CreatorPreview`: `pointerPressed` is set only for `isPrimary && button === 0`. It is cleared a task after that pointer's `pointerup`/`pointercancel` (the click, if any, fires before then) and on any keydown. **Not on focus:** a mouse or touch press focuses the preview *before* its click, so clearing on focus would let the tap's own click add a second frame (the existing test for that would fail). | `FrameCreator.test.tsx` (right-click / non-primary, drag with no click, keydown) | unit |
| 6 | `journey.spec.ts`: added `expect(colors[1]).not.toBe(colors[0])`; `deselect(page, testInfo)` now branches on `testInfo.project.name`; the console handler uses an `if`. I removed the doubled blank lines in creator, drag, photo, selection, settings and resilience specs. **Unused imports:** none exist. `tsc --noEmit --noUnusedLocals --noUnusedParameters` reports nothing, so there was nothing to remove. | e2e | e2e green |

## Files

New: `hooks/useMoreBelow.ts`, `components/ui/useSharedHelper.tsx`, `hooks/useFrameMotion.test.tsx`, `components/panel/RightPanel.test.tsx`.
Changed: `useShell.ts`, `globals.css`, `DesktopShell.tsx`, `ContextPanel.tsx`, `SettingsSheet.tsx` (doc comment), `SettingsSections.tsx`, `RightPanel.tsx`, `PhotoTools.tsx`, `PhotoControls.tsx`, `Slider.tsx`, `CmField.tsx`, `FrameCreator.tsx`, `SelectionBar.tsx`, `FrameNode.tsx`, `WallDimensions.tsx`, `WallStage.tsx`, `ResetWall.tsx`, `CreatorPreview.tsx`, `useFrameMotion.ts`, `useFrameDrag.ts`, the e2e specs and `docs/design/design-system.md` §5.13. Every file is under 250 lines.

## Verification

```
> npm run typecheck
> tsc --noEmit
(no output)

> npm run lint
> eslint
(no output)

> npm test
 Test Files  64 passed (64)
      Tests  684 passed (684)

> npx playwright test --repeat-each=2
  14 skipped
  162 passed (53.6s)
(the skips are project-specific: desktop-only or phone-only tests on the other project, including the new narrow-desktop test on phone-landscape)

> npm run build
✓ Compiled successfully
✓ Generating static pages using 4 workers (3/3)
Route (app)
┌ ○ /
└ ○ /_not-found
○  (Static)  prerendered as static content
```

Capture metrics (scratch script): d1024 stage 744, wall 664 × 553. Photo tools tracks [77,211] on both rows (d1440, d1024), and one Opacity slider on screen in Photo mode. Pixel/iPhone rail `data-more` is set at rest and cleared once scrolled to the end. The landscape creator helper is one line.

## Concerns

- M7 uses `w-[5ch]` instead of the finding's `w-[4ch]`, because 4ch clips "100%".
- L3's new copy is three lines at 360px, not the two the doc estimates.
- B5 doesn't clear on focus (explained above).
- M3 also covers the landscape selection rail's compact pairs (W/H and X/Y), which §5.2 describes too.
- The branch was created by me because `feat/wall-planner-v1` was absent.
