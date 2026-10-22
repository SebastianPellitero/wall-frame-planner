<<<<<<< HEAD
# WallPlanner

WallPlanner is a mobile-first, static single-page app for planning a gallery wall. You drag frames onto a to-scale wall, let a grid and a soft magnet line them up, and preview the result over a photo of your own wall. Everything runs in the browser, so there is no account and no server.

## Features

- A wall drawn to scale from its size in centimeters (300 x 250 cm by default). Rotating a phone only rescales the drawing.
- Frame creator: pick Rectangle, Square or Circle, set the size, press Generate, then drag the preview onto the wall or tap it to add a frame. Each new frame gets one of ten finishes, never the same twice in a row.
- Drag frames on the wall. They snap to an optional grid and push each other apart (with a configurable gap) instead of overlapping.
- Matrix control for the grid: width, height, Show grid. Set the grid origin by tapping the wall.
- Selected frame: exact X, Y and size fields, Duplicate, Delete, and arrow-key nudging on desktop.
- Undo and Redo.
- Background photo: upload a photo of your wall, then pan, pinch or wheel-zoom it, and set its scale and opacity.
- Autosave to the browser, with a reset button.
- Works with mouse, touch and pen through one Pointer Events path, honors `prefers-reduced-motion`, and has layouts for desktop, phone landscape and phone portrait.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000. |
| `npm run dev:lan` | Dev server that listens on all network interfaces, for testing on a phone. |
| `npm run build` | Static export into `out/` (`output: 'export'`), ready for any static host. |
| `npm test` | Vitest unit and component tests. |
| `npm run test:e2e` | Playwright end-to-end tests on desktop Chrome and a Pixel 7 in landscape. It builds the app and serves `out/` on port 3100 itself, so it doesn't need a dev server and doesn't clash with one. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint. |

The first e2e run needs the Chromium browser: `npx playwright install chromium`.

## Testing on a real phone

1. Put the phone and the PC on the same Wi-Fi.
2. Run `npm run dev:lan`. If port 3000 is taken, run `npm run dev:lan -- --port 3001` and use that port below.
3. Find the PC's LAN IP (`ipconfig` on Windows, look for the IPv4 address).
4. On the phone, open `http://<your-PC-LAN-IP>:3000`.
5. The first time, Windows Firewall asks whether Node.js may accept connections. Allow it on private networks.
6. Hold the phone in landscape. Portrait works but shows a hint that a bigger wall is available when rotated.


## Where your data lives

- The wall, grid settings, frames and photo placement are in `localStorage` under `wallplanner:project`.
- The photo itself is in IndexedDB (idb-keyval, key `wallplanner:background`), because it is too big for localStorage.
- If saved data can't be read, the app starts fresh and keeps the unreadable copy under `wallplanner:corrupt-<timestamp>`. If storage is full or unavailable, a toast says so and your changes stay in memory until you close the tab.
- Reset: Settings has a Reset wall button. It asks "Reset the wall?" and, once confirmed, clears frames, settings and the photo.

The editor renders on the client only, so reading storage never causes a hydration mismatch.

## Project structure

```
src/app/                      Next.js shell (layout, globals.css with the Tailwind v4 @theme tokens)
src/features/planner/
  types.ts, defaults.ts       Shared types and defaults. State is always in centimeters.
  lib/                        Pure functions with unit tests: geometry, snapping, collision,
                              free-spot search, drag math, grid lines, photo transform
  state/                      Zustand store (with undo history), actions, persistence, announcer
  hooks/                      Thin hooks: pointer drags, pinch/pan, wall scale, shell layout, shortcuts
  components/                 Wall, frame creator, matrix control, selection bar, settings, photo tools
e2e/                          Playwright specs and helpers (pointer, seed, photo, settle)
docs/design/                  Design system
```

Rules the code follows: pixels exist only in the view (via `pxPerCm`); during a drag only motion values change and the store is written once on drop; Pointer Events only, with `touch-action: none` on draggable things.

## Agents and design docs

Two Claude Code agents live in `.claude/agents/`:

- `designer.md` owns the look: tokens, motion, and the design system.
- `frontend.md` builds the feature code and tests, following the architecture rules above.

The design system, including the exact accessible names the e2e tests rely on, is in `docs/design/design-system.md`.
=======
# wall-frame-planner
>>>>>>> c4896eed7728caa85c642610a75f4081b10e0829
