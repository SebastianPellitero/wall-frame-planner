# Task 11 report: journey, flake hardening, README

Status: DONE. No app code changed; no app bugs found.

## What was added
- `e2e/journey.spec.ts` (desktop + phone-landscape, empty storage): upload photo, scale via Scale slider (keyboard), Done; Matrix control 10x10 + Show grid; set origin by tapping the wall center, Done; Generate 40x60 rectangle, drag the preview onto the wall; Generate 30 square, tap the preview twice; snap (released 1.5 cm past a line on both axes, snap guide shown mid-drag, frame lands on the line); push (rectangle dropped onto a square, square moved, all pairs apart by the push gap); Duplicate, Delete copy, Undo, Redo; reload and compare every frame's data-x/y/w/h/frame-color, the stored grid (incl. origin) and background, Show grid state, grid fields, and the photo's drawn box. Console errors and pageerrors are collected and must be empty (nothing was ignored). No horizontal scroll asserted at the end.
- Shared helpers in `e2e/helpers/`: `seed.ts` (seedProject, committed, WALL/GRID consts), `photo.ts` (makeJpeg, storedImage), `settle.ts` (waits for an element's box to stop moving).
- README rewritten (what/features/scripts/real-phone testing with `dev:lan` and `--port 3001` note/data and Reset/structure/agents and design docs).

## Flake hardening (root causes)
- Journey assertion bug found in my own first draft: frame colors are random and only never repeat back to back, so "3 distinct colors" failed on desktop. Now asserts the two squares added in a row differ.
- `photo.spec` "Remove photo ... after a reload too" failed once in a full-suite run (not reproducible alone). Likely race: reloaded before the async localStorage and IndexedDB writes of the removal landed. Now polls both before reloading and checks IndexedDB through the shared `storedImage` (which also handles a missing object store). Not loosened.
- Replaced 3 fixed `waitForTimeout` calls (creator x2, resilience x1) with `settle()`. The remaining `waitForTimeout` in settings.spec is the deliberate slow-drag pause that is the behavior under test.
- Deduplicated the per-spec `seed`, `committed` and `makeJpeg` copies into helpers (behavior unchanged; drag uses `colors: false` to keep its old seed shape).

## Verification
- `npm run typecheck`: clean (no output besides tsc invocation).
- `npm run lint`: clean.
- `npm test`: Test Files 62 passed (62), Tests 655 passed (655).
- `npx playwright test --repeat-each=3`: run twice after the final changes, both `240 passed, 18 skipped` (skips are the desktop-only/phone-only tests on the other project). Before the photo fix, one run had 1 failure (above); earlier two runs were clean. The journey alone also passed 5x on both projects.
- `npm run build`: Compiled successfully; `/` prerendered static.

## Concerns
- The one earlier flake was seen once and not reproduced alone, so the race diagnosis is by inspection plus three clean full runs afterward, not a captured failure.
- Desktop has no Deselect button (Esc is used there); the journey handles both shells.
- Journey screenshots go to the existing `.superpowers/.../shots/t11-*` path.
