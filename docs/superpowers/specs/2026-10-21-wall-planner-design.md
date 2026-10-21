# WallPlanner — Design & Implementation Plan

## Context

New project (empty folder `WallPlanner/`, Node 24, no git yet). The user wants a **mobile-first Next.js SPA for planning a gallery wall**. You drag picture frames (rectangle, square, circle) onto a wall drawn to scale, arrange them with an optional snapping grid, and preview the result over a photo of your real wall. Two reusable project agents do the build: a **designer** and a **frontend** engineer.

**Decisions confirmed with the user**
- Units: **centimeters**. The wall has a real size you enter (default 300×250 cm), and everything is drawn to scale.
- Frames: **plain frames** in v1, with a frame-style border and a size label. Per-frame pictures come later.
- Agents: **reusable project agents** in `.claude/agents/designer.md` and `.claude/agents/frontend.md`.
- UI language: **English**.
- Rendering: **DOM + Motion springs**, not canvas.
- Overlap: **push apart on drop**. The frame you drop stays put and the frames it overlaps slide away with a spring.
- Wall edges: **stay inside, rubber-band**. You can pull a frame past an edge with resistance, and it springs back inside when you let go.
- **Mobile first.** Phones will mostly be held sideways (landscape), but portrait must work too. Touch drag has to work everywhere.

**Out of scope for v1 (YAGNI):** per-frame pictures, rotating frames, more shapes, zooming the wall view (the wall always fits the screen), multi-select, accounts or cloud sync, i18n.

---

## Stack

- **Next.js** (latest, App Router, TypeScript, `src/`), with `output: 'export'` so the build is a pure static SPA. One route: `/`.
- **Tailwind CSS v4.** Design tokens live in `@theme` in `globals.css`.
- **motion** (`motion/react`) for springs, `useVelocity`, and `AnimatePresence`.
- **zustand** for state, with the `persist` middleware (localStorage) and **zundo** for undo/redo (50 steps, shapes only). Undo matters because push-apart can move frames you already placed.
- **idb-keyval** stores the background photo in IndexedDB, because a photo blows past localStorage's ~5 MB limit.
- **Vitest** + Testing Library + jsdom for logic and components. **Playwright** (desktop Chrome plus Pixel 7 landscape with `hasTouch`) for end-to-end tests.
- The editor loads client-only (`dynamic(..., { ssr: false })` inside a client wrapper), so localStorage never causes a hydration mismatch.

## Architecture

```
.claude/agents/designer.md, frontend.md
docs/superpowers/specs/2026-10-21-wall-planner-design.md   (copy of this design)
docs/design/design-system.md                               (designer output)
src/app/layout.tsx, page.tsx, globals.css                  (viewport-fit=cover, tokens)
src/features/planner/
  types.ts            Shape {id, kind:'rect'|'square'|'circle', x, y, w, h} (cm, top-left of wall)
                      Wall {width, height, pushGap}  Grid {enabled, snap, spacingX, spacingY, originX, originY}
                      Background {hasImage, x, y, width, opacity, visible}  (cm, so orientation-independent)
  lib/geometry.ts     clampToWall, rubberBand(overflowPx), bounds, cm<->px helpers
  lib/snap.ts         snapPosition(rect, grid, pxPerCm, thresholdPx) -> {x, y, guides[]}
  lib/collision.ts    mtv(a, b) for rect/rect, circle/circle, circle/rect;
                      resolveOverlaps(shapes, anchorId, wall, gap, maxIter=20) -> moved positions
  lib/freeSpot.ts     findFreeSpot(size, shapes, wall, near) for tap-to-add and duplicate
  lib/imageStore.ts   downscale (max 2560 px long edge, JPEG 0.85) + idb get/set/delete
  lib/physics.ts      spring presets and tilt(vx) shared by every animated piece
  state/store.ts      zustand + persist (key `wallplanner:project`, version 1, migrate, partialize)
                      + zundo; UI state (selection, mode, active palette shape) is not persisted
  state/safeStorage.ts  try/catch wrapper: quota errors trigger a toast; corrupt JSON is backed up and the app starts fresh
  hooks/useWallScale.ts      ResizeObserver -> pxPerCm = min(availW/wall.w, availH/wall.h)
  hooks/useFrameDrag.ts      pointer-capture drag: motion values, snapping, rubber-band, commit on drop
  hooks/usePaletteDrag.ts    ghost that follows the pointer; drop on wall = add, elsewhere = fly back
  hooks/usePinchPan.ts       one-finger pan and two-finger pinch (background photo in Photo mode)
  hooks/useShortcuts.ts      Del, Ctrl/Cmd+D, Ctrl/Cmd+Z / Shift+Z, arrows (1 cm, Shift = 10 cm), Esc
  components/PlannerApp.tsx  responsive shell + mode switch (Arrange | Photo | Grid origin)
  components/wall/WallStage.tsx, BackgroundLayer.tsx, GridLayer.tsx (SVG pattern), FrameNode.tsx, SnapGuides.tsx
  components/palette/ShapePalette.tsx, PaletteTile.tsx, SizeInputs.tsx
  components/panels/SelectionBar.tsx (duplicate, delete, W/H/X/Y fields), WallSettings.tsx,
                    GridSettings.tsx, PhotoSettings.tsx, SettingsSheet.tsx (bottom sheet on mobile)
  components/ui/Toast.tsx, RotateHint.tsx
```

**Key rules (written into the frontend agent)**
- State is always in cm. Pixels exist only in the view.
- During a drag, only Motion values update. The store is written once, on drop. That keeps drags at 60 fps and keeps localStorage writes cheap.
- All interaction uses **Pointer Events** with `setPointerCapture`. Draggable elements and the wall get `touch-action: none`. The page gets `overscroll-behavior: none`, so drags never scroll the page or trigger pull-to-refresh.
- Geometry, snapping and collisions are pure functions with unit tests. Components stay thin.

## Behavior spec

**Layout (mobile-first)**
- *Phone portrait:* a slim top bar, then the wall, then a bottom dock with three shape tiles and the size inputs for the selected tile. A dismissible "Rotate for a bigger wall" hint appears.
- *Phone landscape* (short-height breakpoint): a vertical shape rail on the left, the wall filling the rest, and floating buttons for settings and the mode switch. Settings open as a sheet. Safe-area insets are respected (`env(safe-area-inset-*)`, `100dvh`).
- *Desktop:* left sidebar (shapes and sizes), the wall in the center, right panel (wall, grid and photo settings, plus the selected frame's properties).
- Touch targets are at least 44 px. Rotating the device only changes `pxPerCm`; frames keep their cm positions.

**Palette:** rectangle (W×H), square (side), circle (diameter). Sizes are validated between 1 cm and the wall's size. You can **drag** a tile onto the wall: a ghost follows your finger with a slight spring lag and pops in on drop, or flies back if dropped off the wall. You can also **tap** a tile to add the frame at the nearest free spot to the wall's center.

**On the wall:** tap a frame to select it, and it shows the selection bar. The bar has **Duplicate** (the copy springs out to a free spot next to the original), **Delete** (shrink and fade), and W/H/X/Y fields for precise edits on touch screens. Tapping empty wall deselects.

**Physics (starting values; the designer tunes them)**
- Pick up: scale 1.04, a deeper shadow, raised to the top.
- Tilt while dragging: the frame swings like it's hanging on a nail. Rotation is `clamp(-vx·0.012, ±10°)` through a low-damping spring.
- Drop: a spring to the final position (after snapping and edge clamping), and rotation settles back to 0 with one small overshoot.
- Rubber-band: past an edge, the frame moves `overflow·0.35` of the finger's distance, up to about 30 px, then springs back on drop.
- Push apart: after a drop, add, duplicate or resize, `resolveOverlaps` keeps the anchor frame fixed and pushes overlapping frames out along the shortest direction, plus `pushGap` (default 3 cm). Frames stay clamped to the wall, with up to 20 passes. The pushed frames slide with a slight stagger. If it can't fully resolve (wall too full), it stops and leaves the overlap.
- `prefers-reduced-motion` turns off tilt and overshoot and uses short tweens.

**Grid:** on/off, snap on/off, X and Y spacing in cm. **Grid origin** mode: tap the wall to set where the grid starts. The pattern is drawn with SVG.
- Soft magnet: each axis checks the frame's left edge, center and right edge (top, center and bottom for Y) against the nearest grid line. Within 8 px (12 px on touch screens, detected via `pointer: coarse`), the axis snaps and a guide line lights up. Moving past the threshold releases it, so it never feels locked.
- Optional `navigator.vibrate(8)` when a snap engages (where supported).

**Background photo:** upload in Photo settings. The image is downscaled and stored in IndexedDB, and its position and size are stored in cm in the project.
- In **Photo mode**: one finger or the mouse pans, a two-finger pinch, the scroll wheel or a slider scales, and there's an opacity slider. The part of the photo outside the wall shows dimmed to help line it up.
- In Arrange mode, the photo is clipped to the wall. You can also hide or remove it.

**Persistence and errors:** everything except UI state autosaves to localStorage on every commit, and the photo is saved to IndexedDB.
- If the saved data is corrupt, it's backed up to `wallplanner:corrupt-<ts>`, the app starts fresh, and a toast explains.
- A full storage quota shows a toast and the app keeps working in memory.
- If IndexedDB is unavailable, the photo works for the current session only, with a warning.
- "Reset wall" asks for confirmation.

## Execution — agents and tasks

Executed with **superpowers:subagent-driven-development**. I coordinate and review between tasks. The frontend agent works test-first (TDD) on all pure logic. Note: new agent files may not register until Claude Code restarts. If they don't, I dispatch `general-purpose` agents with the agent file as their instructions.

| # | Owner | Task |
|---|-------|------|
| 0 | me | Scaffold with `create-next-app@latest` (TS, Tailwind, ESLint, App Router, src), add the dependencies and the Vitest/Playwright setup, set static export, write both agent files and the spec copy, initial git commit |
| 1 | designer | Use the frontend-design skill to write `docs/design/design-system.md`: visual direction (calm gallery feel where the wall is the hero and the interface recedes), tokens, the frame look, layouts per breakpoint, component specs, and the motion spec. Put the tokens in `globals.css` |
| 2 | frontend | `types.ts`, `geometry.ts`, `snap.ts`, `collision.ts`, `freeSpot.ts`, `physics.ts`, test-first |
| 3 | frontend | Store (persist + migrate + zundo), `safeStorage`, `imageStore`, with tests |
| 4 | frontend | Responsive shell, `WallStage` scaling, `GridLayer`, `RotateHint`, mode switch |
| 5 | frontend | `FrameNode` and `useFrameDrag`: physics, snapping and guides, rubber-band, animated push-apart |
| 6 | frontend | Palette: size inputs, drag ghost, tap-to-add |
| 7 | frontend | Selection bar, duplicate, delete, W/H/X/Y fields, shortcuts, undo/redo |
| 8 | frontend | Wall and grid settings, grid-origin mode, settings sheet |
| 9 | frontend | Background photo: upload, downscale, IndexedDB, pan, pinch, opacity, dimmed overflow |
| 10 | frontend | Error toasts, corrupt and quota handling, reset |
| 11 | frontend | Playwright end-to-end tests, desktop and touch landscape |
| 12 | designer | Review screenshots (portrait, landscape, desktop) against the spec. The frontend agent applies the fixes |

## Verification

- `npm run lint`, `npx tsc --noEmit`, `npx vitest run`: snapping thresholds and release, collision MTV for every shape pair, the anchored resolver plus clamping plus its iteration limit, free spots, store actions, migrate and corrupt handling.
- `npx playwright test` on **desktop Chrome and Pixel 7 landscape (touch)**. Touch drags are driven by a helper that dispatches `pointerType: 'touch'` pointer events. The tests cover:
  - drag from the palette onto the wall creates a frame
  - a drag near a grid line snaps to it
  - dropping on another frame pushes it away
  - duplicate and delete
  - undo
  - reload keeps the layout
  - an uploaded photo survives a reload
- `npm run build` produces a static `out/`.
- Manual check on a real phone: run `npm run dev -- -H 0.0.0.0` and open it over the local network. Check landscape and portrait drags, that the page never scrolls during a drag, the photo pinch, and that rotating mid-session keeps positions.
