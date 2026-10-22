# WallPlanner design system

Build spec for every WallPlanner screen. Owner: designer. Tokens live in `src/app/globals.css` (`@theme`, plus the per-frame color rules in `@layer base`); motion presets live in `src/features/planner/lib/physics.ts` under the names in §6. If code and this doc disagree, this doc wins until it is updated. The user's own wireframe (`docs/design/reference/ui-sketch.md`) is the authority for the left panel (§4, §5.1, §5.16) and the frame look (§3).

---

## 1. Direction

**Concept: hanging day.** The look is a gallery wall on the morning of an install: a freshly painted wall, a laser level line across it, frames waiting to go up. The **wall is the brightest thing on screen**. It sits on a muted concrete "room", and the interface is quiet mat-board chrome along the edges. One element carries the personality: **the frames**, with square-mitred moulding in one of ten real frame finishes, a museum-white mat and a picture opening with a bevel line. Everything else steps back.

**Color story.** Concrete (`stage`) for the room, gallery white (`wall`) for the wall, mat white (`surface`) for the interface and graphite (`ink`) for text. There is one art-world accent, **ultramarine** (`accent`, a nod to International Klein Blue), for selection, the active mode and primary actions; it holds 7:1 on the wall. **Laser green** (`laser`) appears only as the snap guide. Danger red is for destructive actions only. The only other color on screen is the frames' own finishes (§3.2), deliberately free of blue so they never compete with the selection accent. No gradients and no decorative washes.

**Typography pairing.**
- **Archivo** (variable, width axis 62–125) is the measuring voice: controls, numbers and frame labels. Its width axis condenses frame labels (87.5% down to 75%) so small frames keep their size label longer.
- **Newsreader** (variable, optical size) is the gallery-placard voice, used only for the wordmark, section and sheet titles, dialog titles and the empty-wall line. Roman only.

**Principles.**
1. The wall gets the space. Chrome lives in reserved edge strips and never floats over the wall. The exceptions are transient toasts and hints.
2. One accent, used for state. If something is ultramarine, it is selected, active or the primary action.
3. Shape before color. Selection uses corner crop marks, active segments a raised thumb, switches a knob position. Color reinforces these cues but never carries them alone.
4. Physical, not bouncy. Springs feel like weight (a frame on a nail), with at most one small overshoot.
5. Calm copy. Sentence case, plain verbs and no exclamation marks.

**Deliberately avoided:** a cream background with a terracotta accent, a dark UI with an acid-green accent, one radius on everything, grey card shadows everywhere, all-caps eyebrow labels and monospace data labels. Radii follow a hierarchy: frames 0, controls 10, tiles 14, sheets 22.

---

## 2. Tokens

All tokens are CSS variables on `:root` (`@theme static`), so they also work as `var(--…)` in inline styles and motion values. **Exception: per-frame tokens.** `--shadow-frame-*`, `--inset-shadow-aperture`, `--inset-shadow-mat` and the frame colors contain `var(--color-frame-edge…)`-style references that are resolved where the variable is *defined*; a bare `var(--shadow-frame-rest)` in an inline style resolves on `:root` and always gives the Graphite fallback. Use these only as utilities (`shadow-frame-rest`, `inset-shadow-mat`, `border-t-frame-top`, …) on an element that carries `data-frame-color` or sits inside one. Tailwind's default colors, shadows and radii are **switched off**: `bg-white`, `shadow-md` and `rounded-sm` do not exist.

### 2.1 Color

| Token (utility) | Value | Usage |
|---|---|---|
| `stage` | `#cdd2cc` | Room around the wall; body background |
| `wall` | `#f4f5f1` | Wall surface (no photo); Frame creator preview box |
| `wall-edge` | `#7c827d` | 1px wall boundary (3.6:1 on wall) |
| `photo-dim` | `rgb(205 210 204 / .62)` | Veil over the photo outside the wall (Photo mode) |
| `surface` | `#fcfcfa` | Top bar, dock, rails, sidebar, panel, sheets |
| `surface-sunken` | `#eceeea` | Input wells, segmented track, slider track |
| `surface-pressed` | `#e2e5e0` | Hover/pressed fill for quiet buttons |
| `line` | `#dadcd7` | Dividers and chrome edges (decorative only) |
| `line-strong` | `#7c827d` | Borders of inputs, switches and secondary buttons (≥3:1) |
| `ink` / `ink-muted` / `ink-disabled` | `#1e2225` / `#4f555a` / `#9aa09b` | Primary text and icons / secondary text, units, captions / disabled only |
| `inverse` / `on-inverse` | `#24292c` / `#f2f4f0` | Toast surface / toast text, light frame label |
| `on-inverse-muted` / `accent-on-inverse` | `#b9bfbb` / `#aeb8ff` | Toast icons and dismiss / toast action |
| `accent` | `#2b3fcb` | Selection marks, active state, primary buttons, slider fill, switch on |
| `accent-hover` / `accent-pressed` | `#2536b4` / `#1f2d9e` | Primary button hover / pressed |
| `accent-soft` / `on-accent` | `#e5e8fb` / `#ffffff` | Text selection / text and icons on accent |
| `focus` | `#2b3fcb` | Focus ring (same hue as accent, separate token) |
| `laser` / `laser-glow` | `#0a9447` / `rgb(38 214 112 / .45)` | Snap guide core (3.6:1 on wall) / glow |
| `danger` / `danger-soft` / `on-danger` | `#b42318` / `#fbe6e3` / `#ffffff` | Delete, Remove photo, Reset wall |
| `frame-1` … `frame-10` | §3.2 | The ten curated moulding finishes |
| `frame-top` / `frame-side` / `frame-bottom` | per frame (§3.2) | Moulding rails: lit top, sides, shaded bottom |
| `frame-edge` / `frame-edge-outer` | per frame (§3.2) | Two-tone keyline around every frame |
| `frame-ink` | per frame (§3.2) | Size label |
| `mat` / `mat-edge` | `#fdfdfb` / per frame | Mat board / its keyline against light mouldings |
| `aperture` / `aperture-edge` | per frame (§3.2) | Picture opening / its bevel line |
| `frame-halo` | `rgb(255 255 255 / .55)` | Legacy; superseded by `frame-edge`, unused by new code |
| `halo` | `rgb(255 255 255 / .92)` | Underlay behind accent marks (brackets, origin marker) |
| `grid` / `grid-origin` / `grid-halo` | `rgb(30 34 37 / .16)` / `rgb(43 63 203 / .5)` / `rgb(255 255 255 / .45)` | Grid lines / origin lines / line underlay over a photo |
| `scrim` / `scrim-light` | `rgb(30 34 37 / .28)` / `rgb(30 34 37 / .14)` | Behind the bottom sheet and dialogs / behind the landscape side sheet |

Light theme only in v1 (`color-scheme: light`); the wall and frames are physical colors, so a dark theme is skipped.

### 2.2 Type

| Token | Size / line | Family, weight | Usage |
|---|---|---|---|
| `text-micro` | 11 / 14 | sans 500 | Compact frame label, vertical segment captions |
| `text-caption` | 12 / 16 | sans 400–500 | Field labels, units, preview caption, full frame label, dimensions |
| `text-ui` | 14 / 20 | sans 500 (600 when active) | Buttons, segments, toggles, toasts |
| `text-body` | 16 / 24 | sans 400 | **Every text input** (prevents iOS zoom), body copy |
| `text-lead` | 18 / 24 | serif 400 | Empty-wall line, sheet section titles |
| `text-title` | 22 / 28 | serif 500, `tracking-title` | Sheet title, panel section titles ("Frame creator", "Matrix control"), dialog titles |
| Wordmark | 20 / 28 | serif 500, `tracking-title` | "WallPlanner": desktop, and stacked at 640px+ |

Families are `font-sans` (Archivo) and `font-serif` (Newsreader), loaded with `next/font`. Width is a separate utility: `font-stretch-semi-condensed` (87.5%) for full frame labels, vertical segment captions and wall dimensions, `font-stretch-condensed` (75%) for compact frame labels only. All numbers use `tabular-nums`. Frame labels use `tracking-label` (0.01em), serif titles `tracking-title` (−0.01em). Never set type in all caps.

### 2.3 Spacing and sizes

Tailwind's 4px scale stays. Named sizes (work with `w-`, `h-`, `size-`, `p-`, `gap-`):

| Token | Value | Usage |
|---|---|---|
| `touch` | 44px | Minimum hit target; buttons, inputs, icon buttons |
| `tile` | 56px | Dock row A height |
| `field` | 76px | Default numeric field width |
| `bar` / `bar-lg` | 48 / 56px | Top bar: stacked / desktop |
| `rail` / `rail-end` | 152 / 64px | Phone-landscape left / right rail (plus safe area) |
| `sidebar` / `panel` | **280** / 320px | Desktop left sidebar (was 248) / right panel |
| `preview` / `preview-lg` | 88 / 152px | Frame creator preview height: landscape / desktop |
| `sheet` | 360px | Landscape side-sheet width |
| `gutter` | 12px | Screen-edge gutter on phones |
| `stage` / `stage-lg` | 12 / 40px | Padding between the stage edge and the wall: phones / desktop |
| `safe-top` `safe-right` `safe-bottom` `safe-left` | `env(safe-area-inset-*)` | e.g. `pb-safe-bottom`, `pl-safe-left` |

Internal rhythm: 8px between controls, 12px inside panels and 24px between sections.

### 2.4 Radii

| Token | Value | Usage |
|---|---|---|
| (none) | 0 | Frames (moulding, mat, opening), wall, grid |
| `rounded-control` | 10px | Inputs, buttons, icon buttons |
| `rounded-tile` | 14px | Preview box, toasts, dialog, vertical segmented track |
| `rounded-sheet` | 22px | Bottom sheet top corners, side sheet left corners |
| `rounded-pill` / `rounded-full` | 9999px | Horizontal segmented controls, rotate hint, switches, circle frames |

### 2.5 Elevation

Frame shadows open with the two-tone keyline `0 0 0 1px var(--color-frame-edge), 0 0 0 2px var(--color-frame-edge-outer)` (written as **K** below). Tailwind inlines shadow values into each utility, so the `var()`s resolve on the frame and pick up its color (§3.2). For the same reason, never read these shadows through `var(--shadow-frame-*)` (inline style, motion value): that resolves on `:root` and loses the frame's color (§2 exception). Both rings have zero blur, so frame corners stay square.

| Token | Value (identical to `globals.css`) | Usage |
|---|---|---|
| `shadow-wall` | `0 0 0 1px #7c827d, 0 1px 2px rgb(22 26 28 / 0.1), 0 14px 36px -14px rgb(22 26 28 / 0.32)` | Wall on the stage |
| `shadow-frame-rest` | K, `0 1px 1px rgb(22 26 28 / 0.22), 0 3px 6px -2px rgb(22 26 28 / 0.24)` | Frame hanging flush |
| `shadow-frame-hover` | K, `0 2px 3px rgb(22 26 28 / 0.2), 0 7px 14px -5px rgb(22 26 28 / 0.28)` | Desktop hover |
| `shadow-frame-nudge` | K, `0 3px 5px rgb(22 26 28 / 0.18), 0 10px 18px -6px rgb(22 26 28 / 0.28)` | Frame being pushed (while it moves) |
| `shadow-frame-lift` | K, `0 8px 12px -4px rgb(22 26 28 / 0.22), 0 22px 36px -10px rgb(22 26 28 / 0.38)` | Dragged frame, drag ghost, duplicate in flight |
| `shadow-raised` | `0 1px 2px rgb(22 26 28 / 0.14), 0 1px 1px rgb(22 26 28 / 0.08)` | Segment thumb, switch knob, slider thumb |
| `shadow-float` | `0 2px 4px rgb(22 26 28 / 0.1), 0 8px 20px -6px rgb(22 26 28 / 0.22)` | Rotate hint, any floating chip |
| `shadow-sheet` | `0 0 0 1px rgb(22 26 28 / 0.06), 0 10px 40px -8px rgb(22 26 28 / 0.32)` | Bottom or side sheet, dialog |
| `shadow-toast` | `0 10px 28px -8px rgb(22 26 28 / 0.4)` | Toasts |
| `shadow-laser` | `0 0 0 1px rgb(255 255 255 / 0.6), 0 0 8px 2px var(--color-laser-glow)` | Snap guide |
| `inset-shadow-aperture` | `inset 0 0 0 1px var(--color-aperture-edge), inset 0 1px 2px rgb(30 34 37 / 0.1)` | Picture opening: bevel line plus slight depth |
| `inset-shadow-mat` | `inset 0 0 0 1px var(--color-mat-edge)` | Mat keyline (visible on light mouldings only) |

**Performance rule:** never animate `box-shadow` during a drag. A frame renders `shadow-frame-rest` on itself, plus a sibling layer (`absolute inset-0`, same radius, `shadow-frame-lift`, `pointer-events-none`) whose **opacity** animates from 0 to 1 on lift. The nudge shadow works the same way.

### 2.6 Z-index (`z-*`)

The stage is its own stacking context (`relative isolate overflow-hidden`): `wall 0` < `photo 1` < `grid 2` < `frames 10` < `frame-lifted 20` < `guides-live 25`. Snap guides exist only during a live drag and are **always** drawn at `z-guides-live`, above every frame including the dragged one, so a center guide stays visible (decided in the T5 review; the cost is that a guide may cross a resting frame's label for the length of the gesture). `z-guides` (5) is kept as a token but is unused.

App level: `chrome 40` (bars, rails, dock, panels) < `float 50` (rotate hint) < `scrim 60` < `sheet 70` < `ghost 80` (drag ghost from the preview, portalled to `body`) < `dialog 85` < `toast 90`.

### 2.7 Durations and easing (CSS only; springs are in §6)

| Token | Value | Usage |
|---|---|---|
| `duration-instant` | 80ms | Press feedback |
| `duration-quick` | 140ms | Hover, color, icon swaps, preview color roll |
| `duration-base` | 220ms | Switch knob, segment thumb, context-panel cross-fade |
| `duration-slow` | 320ms | Rotate hint and toast enter |
| `duration-reduced-short` / `-reduced` / `-reduced-long` | 120 / 160 / 200ms | Reduced-motion tweens (§6.4) |
| `ease-out-soft` / `ease-in-soft` / `ease-in-out-soft` | `cubic-bezier(.2,.8,.2,1)` / `(.4,0,1,1)` / `(.45,0,.2,1)` | Enter and move / exits / cross-fades |

### 2.8 Custom variants

Layout variants `phone-portrait:`, `phone-landscape:` and `desktop:` are defined in §4.1. Also: `coarse:` is `(pointer: coarse)`; `can-hover:` is `(hover: hover) and (pointer: fine)` and wraps every hover style (e.g. `can-hover:hover:bg-surface-pressed`). The built-in `motion-reduce:` and `motion-safe:` also apply.

---

## 3. Frame look

### 3.1 Anatomy (rectangle and square)

```
 root: data-frame-color="N"  (sets every per-frame token for its subtree)
 outer box = the frame's real size (w × h px = cm × pxPerCm)
 ┌──────────────────────────────┐ ◄ K: 1px frame-edge + 1px frame-edge-outer, outside, no blur
 │▓▓▓▓▓▓▓▓▓▓ frame-top ▓▓▓▓▓▓▓▓▓│   moulding: border t px; top = frame-top, left/right =
 │▓┌──────────────────────────┐▓│   frame-side, bottom = frame-bottom (the joins draw
 │▓│ mat (padding m)          │▓│   square 45° mitres for free) ◄ mat-edge keyline (inset)
 │▓│  ┌────────────────────┐  │▓│
 │▓│  │ aperture           │  │▓│ ◄ aperture-edge bevel line (inset)
 │▓│  │      40 × 50       │  │▓│ ◄ label in frame-ink, centered on the whole inner box
 │▓│  └────────────────────┘  │▓│
 │▓└──────────────────────────┘▓│
 │▓▓▓▓▓▓▓▓▓ frame-bottom ▓▓▓▓▓▓▓│
 └──────────────────────────────┘  + shadow-frame-rest
```

**DOM, from the outside in.** The frame's root carries `data-frame-color={shape.color}` (1–10). `div.frame` is `box-border border-solid border-t-frame-top border-x-frame-side border-b-frame-bottom shadow-frame-rest` with border width `t`. Inside it, `div.mat` is `absolute inset-0 bg-mat inset-shadow-mat` with padding `m`, and holds `div.aperture` (`size-full bg-aperture inset-shadow-aperture`). The label is a sibling of the mat (`absolute inset-0 grid place-items-center`) in **`text-frame-ink`**. **Corners are square on every part:** no `rounded-*` on the moulding, mat, opening, lift layer or nudge layer of a rectangle or square.

### 3.2 Curated frame colors

Ten finishes: two neutrals, a white, three woods, a metal and three muted colors. None is blue, so ultramarine stays reserved for selection. Each finish belongs to a **tone**, and the tone decides the rails, opening, label and keylines. `globals.css` derives everything from the base with `color-mix(in srgb, …)` under `[data-frame-color="N"]`, so components only set the attribute.

| N | Name | `frame-N` | Tone | Top / bottom rail (derived) | Opening (`aperture`) | Label | Label : opening |
|---|---|---|---|---|---|---|---|
| 1 | Graphite | `#363a3e` | dark | `#525659` / `#26292b` | `#212426` | light | 14.1 |
| 2 | Black | `#17191b` | dark | `#37393b` / `#101213` | `#0e1011` | light | 17.3 |
| 3 | Gallery white | `#e6e4dd` | light | `#eceae4` / `#b8b6b1` | `#f9f9f6` | dark | 15.2 |
| 4 | Walnut | `#5b3e2c` | dark | `#72594a` / `#402b1f` | `#38261b` | light | 12.9 |
| 5 | Oak | `#a8814f` | light | `#bb9d76` / `#86673f` | `#efe9df` | dark | 13.3 |
| 6 | Ash | `#d6c3a1` | light | `#dfd0b6` / `#ab9c81` | `#f7f4ed` | dark | 14.5 |
| 7 | Brass | `#b38f45` | light | `#c4a86e` / `#8f7237` | `#f1ebde` | dark | 13.5 |
| 8 | Sage | `#7d8d76` | light | `#9aa694` / `#64715e` | `#e9ebe6` | dark | 13.3 |
| 9 | Oxblood | `#6a2a2e` | dark | `#7f484b` / `#4a1d20` | `#421a1d` | light | 13.6 |
| 10 | Slate | `#4a5c63` | dark | `#637379` / `#344045` | `#2e393d` | light | 10.7 |

| Token (per frame) | Dark tone | Light tone |
|---|---|---|
| `frame-top` / `frame-side` / `frame-bottom` | base + 14% white / base / base + 30% black | base + 22% white / base / base + 20% black |
| `mat` | `#fdfdfb` (museum white for every finish) | same |
| `mat-edge` | transparent (the moulding already contrasts ≥6:1 with the mat) | `rgb(30 34 37 / .18)` |
| `aperture` | base + 38% black: a **dark opening** | mat + 16% base: a **pale tinted opening** |
| `aperture-edge` (bevel) | `rgb(255 255 255 / .2)` | `rgb(30 34 37 / .16)` |
| `frame-ink` (label) | `on-inverse` `#f2f4f0` (light) | `ink` `#1e2225` (dark) |
| `frame-edge` (inner keyline) | `rgb(255 255 255 / .72)` | `rgb(30 34 37 / .55)` |
| `frame-edge-outer` | `rgb(30 34 37 / .42)` | `rgb(255 255 255 / .7)` |

**Why it stays legible everywhere.** The label always sits on an opaque, tone-matched opening (≥10.7:1), never on the photo. The outline is the two-tone keyline K: the inner line contrasts with the moulding, and the outer line contrasts with the inner one, so whatever the background, one of the bands moulding | inner | outer | background holds a boundary. Sweeping flat backgrounds from black to white, the weakest adjacent pair stays **≥3.3:1** for every finish (Gallery white, Oak, Ash, Brass, Sage at 3.3–3.4; dark finishes 4.6–9.6). On the plain wall the outline is ≥3.4:1 for the light finishes (via the dark inner keyline), and the moulding itself is 6.4–16:1 for the dark ones. A dark opening inside a white mat also reads as "a picture is here", which is what the user is planning for.

**Assignment.** A new frame takes the Frame creator's current color (§5.1). `Shape.color` is an integer 1–10 stored with the frame and persisted. Duplicate copies the original's color. Editing a size never changes color. A stored frame without a valid color renders as 1 (Graphite). The fallback values on `:root` (Graphite with a light opening) exist only for UI that has no `data-frame-color`; every frame, the drag ghost and the preview must set it.

### 3.3 Geometry rules (s = min(w, h) in screen px)

| Part | Rule |
|---|---|
| Moulding `t` | `clamp(2, round(s × 0.06), 10)` px |
| Mat `m` | `s ≥ 48` ? `clamp(3, round(s × 0.10), 24)` : `0`. Small frames drop the mat; the opening's bevel then separates it from the moulding |
| Corners | Square (radius 0) on moulding, mat and opening. Rectangles and squares are never rounded |

### 3.4 Size label

Text is in cm with at most one decimal, and a trailing `.0` is dropped. Rectangles and squares read `40 × 50` (width × height, U+00D7, spaces on both sides); circles read `Ø 40` (U+00D8). There is no unit on the wall.

Try *full*, then *compact*, otherwise hide. Available width is `w − 2t` for rectangles and `0.8 × (d − 2t)` for circles; height uses the same formulas.

| Tier | Text | Size | Stretch | Weight | Needs width ≥ | Needs height ≥ |
|---|---|---|---|---|---|---|
| full | `40 × 50`, `Ø 40` | `text-caption` (12/16) | `font-stretch-semi-condensed` | 500 | `chars × 0.55 × 12 + 8` | 18px |
| compact | `40×50`, `Ø40` | `text-micro` (11/14) | `font-stretch-condensed` | 500 | `chars × 0.50 × 11 + 4` | 16px |
| hidden | — | — | — | — | otherwise | — |

The em-per-character figures are conservative upper bounds measured on Archivo. At the phone-landscape scale (≈1.46 px/cm), 50×70 shows full, 40×40 compact, 20×25 hidden. A hidden label's size is still in the selection fields and the frame's accessible name.

### 3.5 Circle variant

The outer element is `rounded-full` with no border. Its moulding is its own background, `bg-linear-to-b from-frame-top to-frame-bottom` (lit from above), using the same per-frame tokens, so all ten finishes apply. The mat sits at `inset: t`, `rounded-full`, with the same padding rule and `inset-shadow-mat`, and the aperture is `rounded-full`. K follows the circle because box-shadow follows the radius. Selection brackets frame the circle's square bounding box.

### 3.6 States (identical on all ten finishes)

| State | Visual | Not-color cue |
|---|---|---|
| Resting | `shadow-frame-rest` (K + soft drop) | — |
| Hover (`can-hover:` only) | `shadow-frame-hover`, `cursor-grab` | Shadow depth |
| Selected | Crop-mark brackets (§3.7); the frame itself is unchanged | Bracket shapes at the corners |
| Focus-visible (keyboard) | 2px dashed `focus` outline at 3px offset (circle: `rounded-full`) | Dashed outline, distinct from brackets |
| Dragging / lifted | Scale `liftScale`, lift layer at opacity 1, tilt, `z-frame-lifted`, `cursor-grabbing` | Size and shadow |
| Being pushed | Nudge layer at opacity 1 while moving, back to 0 at rest | Motion and shadow |
| Snapped | Frame unchanged; laser guides light up (§5.12), plus haptic | Guide line |
| Photo mode | `opacity-35`, `pointer-events-none`, no brackets | — |
| Grid origin mode | Full opacity, no brackets (the selection is kept and its brackets return in Arrange) | — |

None of these states tints the moulding, so no state depends on the finish. Brackets, focus outline and guides sit outside the moulding (on wall or photo), each with its own white underlay, so they hold ≥3:1 next to Black as well as Gallery white.

### 3.7 Selection brackets

- An SVG child of the frame with `overflow-visible pointer-events-none`, at `left/top: −(t + 4)px` with size `(w + 8) × (h + 8)`; for circles `−4px`.
- Four L-marks, arm `a = clamp(8, round(s × 0.2), 14)` px. Each is a 5.5px `halo` stroke with a 2.5px `accent` stroke on top, `stroke-linecap="square"` and `stroke-linejoin="miter"` so the marks match the square frames. The halo overlaps K's outer ring by about 1px, which keeps the marks attached to the frame.
- They rotate and scale with the frame while it is dragged, because they are its children.

---

## 4. Layouts

### 4.1 Shell selection

| Shell | Query | Variant |
|---|---|---|
| **Landscape rails** (phones held sideways, any short window) | `(orientation: landscape) and (max-height: 500px)` | `phone-landscape:` |
| **Desktop** | `(min-width: 1024px) and (min-height: 501px)` | `desktop:` |
| ↳ narrow desktop | `(min-width: 1024px) and (max-width: 1279px) and (min-height: 501px)` | `desktop-narrow:` (§4.4) |
| **Stacked** (default: phone portrait, tablets in portrait, narrow windows) | everything else | unprefixed |
| ↳ phone-portrait extras | `(max-width: 639px) and (orientation: portrait)` | `phone-portrait:` |

Build the stacked shell unprefixed and then override. The root is `h-dvh`, and each chrome strip pads itself with its safe-area token.

**Wall fit.** Each side of the stage gets padding `max(p, inset of that side)`, counting only insets that no bar or rail already absorbs, where `p` is `stage` (12px) on phones and `stage-lg` (40px) on desktop. Then `pxPerCm = min(contentW / wall.w, contentH / wall.h)` from the ResizeObserver `contentRect`. No part of the wall sits under the notch or the home-indicator zone; rotating the device changes only `pxPerCm`.

**Context panel.** One component, placed as the dock (stacked), the left rail (landscape) or the left sidebar (desktop). Its content swaps with a `duration-base` cross-fade inside a container of **constant size**, so the wall never rescales when the selection or mode changes.

| Mode / state | Context panel shows |
|---|---|
| Arrange, nothing selected | **Frame creator** (§5.1), then **Matrix control** (§5.16) on landscape and desktop |
| Arrange, a frame selected | **Selection** (stacked and landscape). On desktop the creator stays and the selection goes to the top of the right panel |
| Photo | **Photo tools** (§4.6) |
| Grid origin | **Origin tools** (§4.6) |

### 4.2 Phone portrait (stacked)

```
┌────────────────────────────────────┐ ▲ pt-safe-top
│ (Arrange|Photo|Origin)        [≡]  │ top bar: h-bar, bg-surface, border-b line
├────────────────────────────────────┤
│   ┌────────────────────────────┐   │ stage: bg-stage, p-stage
│   │            WALL            │   │ portrait walls are width-limited; the spare
│   └────────────────────────────┘   │ height holds toasts and the rotate hint
│  ( ↻ Rotate for a bigger wall ✕ )  │
├────────────────────────────────────┤
│ (▭|□|○) ┌───────────────┐ [↶][↷]   │ row A, 56: shape picker | preview | Undo Redo
│         │  ┌─┐ (frame)  │          │
│         └───────────────┘          │
│ Width        Height     [Generate] │ row B, 64: fields | Generate
│ [ 40    cm ] [ 50    cm ]          │
└────────────────────────────────────┘ ▼ pb-safe-bottom
```

- **Top bar:** mode switch left, Settings right. Phones show "Origin"; the accessible name stays "Grid origin". From 640px the wordmark appears and the label reads "Grid origin".
- **Dock:** `bg-surface border-t border-line px-gutter pt-2 pb-[calc(8px+var(--spacing-safe-bottom))]`, `grid grid-rows-[56px_64px] gap-2`. From 640px the content is `max-w-[560px] mx-auto`.
- **Frame creator state** (§5.1): row A holds the shape picker (132px), the preview (`flex-1`, 56px tall, 115px wide at 375px) and Undo/Redo; row B holds the size fields (`flex-1` each) and Generate (`self-end`, ≈88px). Square and circle have one field.
- **Matrix control does not fit the 120px dock**, and adding a third row would cost the wall 72px in a layout that is already width-limited. On stacked shells it lives in the Settings sheet's Grid section (§5.6), one tap away.
- **Selection state:** row A holds Duplicate and Delete (icon plus label) and Undo/Redo; row B holds Width, Height, X and Y (three fields for square and circle). Tapping empty wall or pressing Esc deselects.
- Settings open as a bottom sheet (§5.6). Toasts sit bottom-center on the stage, 12px above the hint or dock.

### 4.3 Phone landscape (primary device)

```
 pl-safe-left                                                        pr-safe-right
┌───────────────┬──────────────────────────────────────────────┬──────────┐
│ (▭ | □ | ○ )  │                                              │┌────────┐│ vertical
│┌─────────────┐│         ┌─────────────────────────┐          ││Arrange ││ mode switch
││    ┌──┐     ││         │                         │          ││ Photo  ││
││    └──┘     ││         │          WALL           │          ││ Origin ││
││ 40 × 50 cm  ││         │   (height-limited:      │          │└────────┘│
│└─────────────┘│         │    stage − 2×12px)      │          │          │
│ Width  Height │         │                         │          │   [↶]    │ Undo
│ [40cm] [50cm] │         └─────────────────────────┘          │   [↷]    │ Redo
│ [ Generate  ] │                                              │   [≡]    │ Settings
│ ───────────── │              ┌──────────────┐                │          │
│ Show grid (●) │              │ toast        │                │          │
│ Height Width ░│ ◄ peeks; the rail body scrolls                 │          │
└───────────────┴──────────────────────────────────────────────┴──────────┘
  w-rail + safe-left               stage                        w-rail-end + safe-right
```

- **Left rail:** `bg-surface border-r border-line p-2.5 pl-[calc(10px+var(--spacing-safe-left))] pb-[calc(10px+var(--spacing-safe-bottom))]`, one `overflow-y-auto overscroll-contain` body (`flex flex-col gap-2`). In Arrange it holds the Frame creator and then the Matrix control; there is no visible "Frame creator" title here (the section keeps its accessible name). Photo and Origin tools pin Done at the bottom as before (§4.6).
- **Undo/Redo move to the right rail** (above Settings, `mt-auto` group), which frees 52px of the left rail for the creator. They stay visible in every mode; in Photo and Grid origin they are disabled because history covers frames only.
- **Right rail:** `bg-surface border-l border-line px-1.5 pt-2.5 pr-[calc(6px+var(--spacing-safe-right))] pb-[calc(10px+var(--spacing-safe-bottom))]`. Mode switch at the top (3 × 52 = 156px), then the bottom group Undo, Redo, Settings (3 × 44 + 2 × 4 = 140px). Total 316px with padding, which fits 375px and the 21px home-indicator inset. **Below 340px tall** (`[@media(max-height:340px)]:`), the mode items shrink to `size-touch` icon-only (caption dropped, the name stays in `aria-label` plus `title`): 3 × 44 = 132px, total 292px. Below that the rail itself becomes `overflow-y-auto` with the order unchanged; nothing is hidden.
- **Left-rail budget on a 375px-tall screen** (body 355px, or 334px with a 21px bottom inset): shape picker 44 + 8 + preview 88 + 8 + fields 64 + 8 + Generate 44 = **264px**; divider 21 (gap 8 + `border-t border-line` 1 + `pt-3` 12) + Show grid row 44 = **329px**. **Thresholds, stated honestly** (viewport height H, bottom inset i): the rail body is `H − 20 − i`. The whole Frame creator (264px) is visible without scrolling while `H ≥ 284 + i`; the Show grid switch too while `H ≥ 349 + i`. That covers 375px-tall phones (with or without the 21px inset) but not every window: with browser chrome or on 320px-tall devices, Show grid scrolls first, then the spacing fields, while the picker, preview, fields and Generate stay put down to 284px. Below `H = 284 + i` the preview drops to 56px (`[@media(max-height:305px)]:h-14`) so Generate stays reachable down to 252px; anything shorter is not a supported landscape size and the body simply scrolls. The grid spacing fields (8 + 64) follow: their labels peek at the bottom edge, and the body adds a 16px bottom fade (`mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent)`) only while more content sits below. **Trade-off, chosen explicitly:** spacing is set rarely, the switch often, so the switch gets the guaranteed slot and spacing costs one short scroll. Landscape windows at least 422px tall (or 443px with a 21px inset) show everything.
- **Selection state** (replaces the rail body): a header row with the size readout (`text-caption ink-muted`) and a Deselect ×, Duplicate and Delete as icon buttons, then a 2×2 grid of Width/Height over X/Y. 264px, no scroll.
- **Stage:** on a 667px-wide screen the stage is 451px; a 300×250 wall at full height needs 422px.
- **Settings:** a right side sheet, `w-sheet` plus the right safe area, over `scrim-light`, so the left part of the wall stays visible and changes preview live.
- **Toasts:** bottom-center of the stage, `max-w-[360px]`.

### 4.4 Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ WallPlanner             ( Arrange | Photo | Grid origin )             [↶][↷] │ h-bar-lg
├─────────────────────┬────────────────────────────────────────┬───────────────┤
│ Frame creator       │                 300 cm                 │ Selected frame│ ◄ only while
│ (  ▭  |  □  |  ○  ) │    ├──────────────────────────────┤    │ [Dup] [Delete]│   selected
│        ┌──────────┐ │    ┌──────────────────────────────┐    │ Width  Height │
│ Height │   ┌──┐   │ │  2 │                              │    │ X      Y      │
│ [50 cm]│   └──┘   │ │  5 │                              │    │ ───────────── │
│        │40 × 50 cm│ │  0 │             WALL             │    │ Wall          │
│        └──────────┘ │    │                              │    │ Grid          │
│         Width       │  c │                              │    │ Photo         │
│         [40 cm]     │  m └──────────────────────────────┘    │ ───────────── │
│ [     Generate    ] │                                        │ [Reset wall]  │
│ ─────────────────── │                                        │               │
│ Matrix control      │                                        │               │
│ Height     Width    │                                        │               │
│ [10 cm]    [10 cm]  │                                        │               │
│ Show grid      (●)  │                                        │               │
└─────────────────────┴────────────────────────────────────────┴───────────────┘
   w-sidebar (280)              stage, p-stage-lg                   w-panel
```

- **Top bar:** `bg-surface border-b border-line`; wordmark left, horizontal mode switch centered, Undo/Redo right.
- **Left sidebar** (`w-sidebar` 280px, `p-4`, content 248px, `overflow-y-auto overscroll-contain`): Frame creator above Matrix control, as in the sketch. The sidebar widens from 248 to 280px because the sketch gives the creator a real preview with the Height field beside it. At 1280px the stage is 680px (wall area 600px) instead of 712px. That costs the wall 5% of scale, and in exchange the creator is usable at a glance.
- **Sidebar budget:** title 28 + 12 + picker 44 + 12 + preview row 152 + 8 + Width field 64 + 12 + Generate 44 = **376px**; Matrix control 24 + 28 + 12 + 64 + 8 + 44 = 180px. Everything fits from a 645px-tall viewport; below that, down to the 501px desktop minimum, the creator (376 + 32 padding + 56 bar = 464px) is still fully visible and only the Matrix control scrolls.
- **Right panel:** always open, scrolls independently: Selected frame (only while selected), Wall, Grid (Snap to grid, Set origin), Photo, then Reset wall last in the scroll. **In Photo mode the panel's Photo section is not rendered**: the sidebar's Photo tools hold the same controls, and each accessible name ("Show photo", "Opacity", "Replace photo", "Remove photo") must appear once per screen.
- **Narrow desktop (`desktop-narrow:`, 1024–1279px wide).** Two fixed panels (280 + 320) leave a 1024px window a 424px stage and a 344 × 287 wall: less than half the screen, against the sketch's ≈67% canvas. So below 1280px the right panel is not rendered. The top bar's right group becomes Undo, Redo, Settings (`size-touch` icon button, name "Settings"), which opens the landscape side sheet (§5.6: `w-sheet`, `rounded-l-sheet`, `scrim-light`, the same sections in the same order; no Matrix control, which stays in the sidebar). A selection replaces the sidebar's Frame creator with the Selected frame section (serif `text-title` "Selected frame", Duplicate and Delete with labels, Width/Height over X/Y), and deselecting brings the creator back, as on landscape. At 1024 × 768 the stage becomes 744px wide and the wall 664 × 553 (2.21 px/cm instead of 1.15).
- **Stage:** wall dimensions sit in the stage padding (§5.13), toasts at the bottom-center.

### 4.5 Placement summary

| Element | Stacked / phone portrait | Phone landscape | Desktop |
|---|---|---|---|
| Shape picker | Dock row A, left | Left rail, top | Sidebar, under the title |
| Preview (drag source, tap to add) | Dock row A, `flex-1` | Left rail, under the picker | Sidebar, right of the Height field |
| Size fields | Dock row B | Left rail, 2 columns | Height left of the preview, Width under it (sketch) |
| Generate | Dock row B, right end | Left rail, full width | Sidebar, full width |
| Matrix control (Show grid, spacing) | Settings sheet, Grid section | Left rail under the creator; spacing scrolls | Sidebar, under the creator |
| Snap to grid, Set origin | Settings sheet | Side sheet | Right panel, Grid section |
| Mode switch | Top bar, horizontal | Right rail, vertical | Top bar, centered |
| Undo / Redo | Dock row A, right end | **Right rail, above Settings** | Top bar, right |
| Settings entry | Top bar, right | Right rail, bottom | None (panel always open); top bar right on narrow desktop |
| Selection bar | Replaces dock rows A and B | Replaces the left-rail body | Right panel, first section |
| Toasts | Stage bottom, above hint and dock | Stage bottom-center | Stage bottom-center |
| Rotate hint | Stage bottom (`phone-portrait:` only) | — | — |

### 4.6 Photo tools and Origin tools

**Constant size.** The stacked dock is `grid grid-rows-[56px_64px]`; the landscape rail and desktop sidebar fill their column (`h-full min-h-0`) with an `overflow-y-auto` body. In these two modes the stacked dock's Undo/Redo slot holds **Done**; in landscape, Done is pinned at the bottom of the left rail and the right-rail Undo/Redo are disabled.

| Control | Spec |
|---|---|
| Opacity | Slider (§5.7), 0–100%, step 5, readout "60%". Maps to `background.opacity` 0–1 |
| Scale | Slider. `width = wall.w × 2^t`, `t ∈ [−2, 2]`, step 0.01 (25–400% of the wall width). Readout `round(width / wall.w × 100)%`. Height follows the image aspect |
| Scale anchor | Slider scales about the wall's center; pinch about the pinch midpoint; wheel about the cursor. All clamp to 25–400% |
| Upload / Replace photo | Hidden `<input type="file" accept="image/*">` behind a button. "Upload photo" (primary) with no photo, "Replace photo" (secondary, `upload` icon) with one |
| Show photo | `role="switch"` with `aria-checked` everywhere: an icon-only switch button named "Show photo" (`eye` / `eye-off`, the icon is the non-color cue) in Photo tools, and a switch row in Settings and the desktop sidebar |
| Remove photo | `trash` icon button in `text-danger`. Asks first: "Remove the photo?" / Cancel / Remove photo (§5.11) |
| Origin instruction / readout | "Tap the wall where the grid should start." (`text-ui ink`) / "Grid starts at 20 × 40 cm" (`text-caption ink-muted tabular-nums`) |
| Reset to corner / Done | Secondary, sets the origin to 0 × 0 / Primary, returns to Arrange |

```
STACKED DOCK (rows 56 + 64)                              LANDSCAPE RAIL (132 wide)
 Photo, loaded │ [⇪ Replace photo] [eye] [trash]  [Done] │   │ Opacity 60% / slider │
               │ Opacity  60%  ───●───  Scale 100% ──●── │   │ Scale 100% / slider  │
 Photo, empty  │ [⇪ Upload photo]                 [Done] │   │ [⇪] [eye] [trash]    │
               │ Add a photo of your wall to line frames │   │ [      Done       ]  │ ◄ pinned
 Grid origin   │ Tap the wall where the grid…     [Done] │
               │ Grid starts at 20 × 40 cm [Reset to corner]
```

- **Landscape:** the three icon buttons (`aria-label` plus `title`) fill exactly 132px; "Reset to corner" uses `px-2`. With no photo the rail shows the caption, [Upload photo] (primary, full width), then Done. Both rails use ≤230px of the 334–355px body.
- **Desktop sidebar:** a serif `text-title` heading ("Photo" or "Grid origin"), then the same controls with full labels; Photo adds a "Show photo" switch row and "Remove photo" (quiet danger).
- **Touch.** The wall is `touch-none` in every mode. In Photo mode the whole stage is `touch-none` (pan and pinch may start anywhere on the photo).

---

## 5. Components

Every interactive control is at least 44×44px, and every hover style is wrapped in `can-hover:`. Icons are 20px in icon buttons and 18px next to text, on a 24-unit viewBox with a 1.75 `currentColor` stroke. The set: `undo`, `redo`, `settings` (two sliders), `arrange`, `photo`, `origin`, `duplicate`, `trash`, `close`, `rotate`, `upload`, `eye`, `eye-off`, `alert`, `info`, `check`, and the shape glyphs `shape-rect` (a 12×16 portrait rectangle), `shape-square` (14×14) and `shape-circle` (⌀15), each a double outline (frame plus opening) with **square** joins on rect and square.

### 5.1 Frame creator

Replaces the palette tiles. It answers the sketch: pick a shape, type the size, press Generate, then drag the preview onto the wall or tap it.

```
 <section aria-labelledby> "Frame creator"   (title visible on desktop only)
 ┌─────────────────────────────────────┐
 │ Frame creator                       │ serif text-title (desktop)
 │ (   ▭   |   □   |   ○   )           │ shape picker: radiogroup "Shape"
 │         ┌─────────────────────────┐ │
 │ Height  │                         │ │ preview box: bg-wall rounded-tile
 │ [50 cm] │      ┌───────┐          │ │ ring-1 ring-inset ring-line, p-3
 │         │      │ frame │ ◄ color N│ │ frame fit inside, data-frame-color=N
 │         │      └───────┘          │ │
 │         │       40 × 50 cm        │ │ caption: text-caption ink-muted tabular-nums
 │         └─────────────────────────┘ │
 │            Width [40 cm]            │
 │ [            Generate             ] │ primary button
 └─────────────────────────────────────┘
```

**Parts**
- **Shape picker:** `role="radiogroup"` named "Shape", radios "Rectangle", "Square" and "Circle" (icon only, `aria-label` plus `title`), built like the horizontal mode switch (§5.3): track `h-touch rounded-pill bg-surface-sunken`, items `size-touch` (desktop `flex-1`), raised thumb on the checked item. Arrow keys move the selection. Switching shape shows that shape's last generated size in the fields and preview and **keeps the current color**.
- **Fields** (§5.2): rectangle "Width (cm)" and "Height (cm)"; square "Side (cm)"; circle "Diameter (cm)". Limits are the wall's. Desktop places them as in the sketch, like a dimension drawing: a `grid grid-cols-[76px_1fr] gap-x-2` with Height in the left column (vertically centered on the preview) and Width centered under the preview (`w-field`). Square and circle have no left field; their preview spans both columns and the single field sits centered under it. Landscape: Width and Height in two 62px columns using the compact field (`pl-2 pr-6`, unit at `right-1.5`), or one full-width field. Stacked: `flex-1` fields in row B.
- **Generate:** primary button "Generate", `w-full` on landscape and desktop. The creator is a `<form>`, so Enter in a field also generates.
- **Preview box:** a small piece of wall. `relative bg-wall rounded-tile ring-1 ring-inset ring-line touch-none select-none overflow-hidden`, height `h-preview-lg` (desktop), `h-preview` (landscape) or the 56px row (stacked). Inside, the generated frame is drawn with the full §3 anatomy in its color, **scaled to fit** the box minus `p-3` (stacked `p-1.5`) and minus the caption, preserving aspect ratio, centered. Moulding and mat use §3.3 on the preview px size.
- **Caption:** "40 × 50 cm" / "40 × 40 cm" / "Ø 40 cm" (`text-caption ink-muted tabular-nums`, bottom-center, 4px under the frame). While the caption shows, the frame's own label is suppressed. Stacked has no room for the caption, so the frame label follows §3.4 there and the fields carry the numbers.

**Behavior**
- **Generate** validates and commits the typed size, then rolls a **new random color, never equal to the current one**: `next = uniform pick from {1…10} \ {current}`. An invalid field blocks Generate, shows its error (§5.2) and receives focus. The preview and its caption change only on Generate, so the preview always shows exactly what will be added.
- **Preview = drag source and tap target.** The preview element is `role="button"`, named "Add rectangle, 40 × 50 cm" / "Add square, 40 × 40 cm" / "Add circle, Ø 40 cm" from the **generated** size. Tap, click, Enter or Space adds a frame at the nearest free spot (not selected, so repeated taps keep adding). Dragging past `dragStartPx` starts the ghost (§5.15) from the preview frame's rect.
- **Auto-roll.** After every successful add, by drop or tap, the preview rolls a new color (same rule), so consecutive frames always differ. Drag cancelled or dropped off the wall: no add, no roll. The size stays.
- **Feedback.** Hover `can-hover:hover:ring-line-strong`; press scales the box to .97 for `duration-instant`; focus-visible uses the global outline on the box (`rounded-tile`). The live region announces "Frame added" on add and "Ready: rectangle, 40 × 50 cm" after Generate.
- **State.** Current shape, the three generated sizes and the current color live in the planner store (successor of `paletteKind` / `paletteSizes`, plus `creatorColor`). They persist. The first color comes from persisted state, or on a fresh install is picked with `Math.random()` **on the client after hydration** (the editor is client-only via `PlannerAppLoader`, so there is no server-rendered color to mismatch); until then the preview is not rendered. They are not part of undo history.

### 5.2 Size input (numeric, cm)

```
Width                ◄ text-caption ink-muted, 4px gap
┌──────────────────┐
│ 40            cm │ ◄ h-touch, bg-surface-sunken, border line-strong, rounded-control
└──────────────────┘   value text-body tabular-nums ink; "cm" text-caption ink-muted, 10px from the right
```

- `<input type="text" inputmode="decimal">` inside a `<label>`, `w-field` by default or `flex-1` in rows. The visible label is short; the accessible name follows the e2e contract (§8): "Width (cm)", "Height (cm)", "Side (cm)", "Diameter (cm)", "X (cm)", "Y (cm)", "Grid height (cm)", "Grid width (cm)", "Wall width (cm)", "Wall height (cm)", "Push gap (cm)". `CmField` needs an optional accessible-name override for the grid and wall fields, whose visible labels are "Height", "Width" and "Push gap"; every name starts or ends with words that contain the visible text, so label-in-name holds (WCAG 2.5.3).
- **Compact variant** (landscape rail, 62px wide): `pl-2 pr-6`, unit at `right-1.5`, value still `text-body`. Three digits fit; longer values scroll inside the input.
- Focus puts a 2px `focus` ring on the border (`outline-offset: -1px`). Values commit on Enter or blur; Esc reverts; focusing selects all. Inside the Frame creator, Enter submits the form (Generate).
- An invalid value gets `border-danger`, `aria-invalid` and a helper line in `text-caption text-danger`, e.g. "Use 1–300 cm". The border stays `danger` while focused: the focus ring on an invalid field uses `outline-danger`. The helper never wraps (`whitespace-nowrap`) and never changes the height of a row it shares:
  - **Default and desktop creator:** one line under the field; under the centered desktop Width field it is centered too and may overflow the 76px field width.
  - **Landscape rail (compact, 2 columns):** the helper renders once, below the two-field grid, `col-span-2`, one line ("Use 1–300 cm"), so the rail grows by 20px, not 40px.
  - **Stacked dock (`errorInLabel`):** the label row keeps the field's name: `flex justify-between gap-1`, label in `ink-muted` left, limits `1–300 cm` in `text-danger` right. The field's name is never replaced.

### 5.3 Segmented controls (Mode switch, Shape picker)

- `role="radiogroup"` with `role="radio"` items. Mode: named "Mode", items "Arrange", "Photo", "Grid origin". Arrow keys move the selection; Tab lands on the checked item.
- **Hit boxes:** every radio is at least 44×44 and the track has no padding. *Horizontal:* track `h-touch rounded-pill bg-surface-sunken`, items `relative h-touch px-3.5 rounded-pill`. *Vertical (landscape mode switch):* track `rounded-tile bg-surface-sunken`, items `relative size-[52px] rounded-tile` with icon over a `text-micro font-stretch-semi-condensed` caption.
- **Thumb:** `absolute inset-[3px] bg-surface shadow-raised ring-1 ring-line` inside the checked radio, behind its content; checked label/icon `ink` 600, others `ink-muted`. It moves with a shared `layoutId` on the `sheet` spring.

### 5.4 Selection bar

- **Order:** Duplicate (secondary, `duplicate` icon), Delete (secondary, `trash`, `text-danger`), then Width, Height, X, Y (rect); Side, X, Y (square); Diameter, X, Y (circle). Edits commit through the store's single commit path, push-apart included.
- **Landscape** adds a header (size readout plus Deselect ×) and makes Duplicate and Delete icon-only.
- Wrap it in `<section aria-label="Selected frame">`; on desktop it and the Frame creator both have "Width (cm)", and the sections tell them apart.

### 5.5 Buttons

All buttons are `h-touch px-3.5 rounded-control text-ui font-medium`, 6px icon gap.

| Kind | Style |
|---|---|
| Primary | `bg-accent text-on-accent`; hover `bg-accent-hover`; pressed `bg-accent-pressed` |
| Secondary | `bg-surface border border-line-strong text-ink`; hover `bg-surface-pressed` |
| Danger (confirm dialog only) | `bg-danger text-on-danger` |
| Quiet / text | No border, `text-accent` or `text-danger`; hover `bg-surface-pressed` |
| Icon button | `size-touch rounded-control text-ink`; hover `bg-surface-pressed`; disabled `text-ink-disabled` |

### 5.6 Settings sheet and panel

```
┌──────────────────────────────────────┐ rounded-t-sheet, bg-surface, shadow-sheet, z-sheet
│                 ────                 │ ┐ HEADER (fixed, touch-none): grab handle 36×4
│ Settings                         [✕] │ ┘ title + "Close settings"
├──────────────────────────────────────┤
│ Wall                                 │ ┐ BODY: flex-1 min-h-0 overflow-y-auto
│ Width [300 cm]   Height [250 cm]     │ │ overscroll-contain touch-pan-y; names "Wall width/height (cm)"
│ Push gap [3 cm]                      │ │ helper: text-caption ink-muted
│ Grid                                 │ │ section titles: text-lead serif
│ Show grid                    ( ●)    │ │ ┐ STACKED ONLY: the Matrix control
│ Height [10 cm]   Width [10 cm]       │ │ ┘ (§5.16), absent on landscape and desktop
│ Snap to grid                 ( ●)    │ │ disabled while the grid is off
│ [Set origin on the wall]             │ │ secondary; closes the sheet, enters Grid origin
│ Photo                                │ │
│ [Upload photo] / [Replace photo]     │ │
│ Show photo                   ( ●)    │ │
│ Opacity  ──────────●───────    60%   │ │
│ [Adjust photo]        Remove photo   │ │
│ ──────────────────────────────────── │ │
│ [Reset wall]                         │ ┘ last item IN the scroll; secondary, text-danger
└──────────────────────────────────────┘
```

- **Wall section names.** The visible labels stay short ("Width", "Height", "Push gap" under the "Wall" title), but on desktop these fields share the screen with the Frame creator's and Selected frame's "Width (cm)" / "Height (cm)", so their accessible names are **"Wall width (cm)"**, **"Wall height (cm)"** and **"Push gap (cm)"**, set through the same `CmField` name override as the grid fields. Each name contains its visible label (WCAG 2.5.3).
- **Grid section.** Snap to grid and Set origin stay here on every shell. Show grid and the spacing fields (the Matrix control) appear **exactly once per shell**: in the left panel on landscape and desktop, and here on stacked, where the dock has no room. They are never duplicated, so each accessible name stays unique per screen. The old "Spacing X / Spacing Y" fields are gone; "Grid width" is X spacing and "Grid height" is Y spacing.
- **Structure:** `flex flex-col`; the header never scrolls; the body scrolls on its own with `pb-[calc(24px+var(--spacing-safe-bottom))]`. Reset wall scrolls with the content, never pinned.
- **Stacked:** bottom sheet over `scrim`, opens at `min(content, 60dvh)`, draggable to `85dvh` from the header only. Dragging down past 25%, a flick, a scrim tap or Esc closes it.
- **Landscape:** right side sheet, `w-sheet` plus the right safe area, `h-dvh`, `rounded-l-sheet`, over `scrim-light`; closes with ✕, scrim tap or Esc.
- **Desktop:** the same sections in the right panel, without handle or close button.
- **Phones:** `role="dialog" aria-modal="true"` named "Settings"; trap focus, return it to the Settings button, close on Esc.

### 5.7 Slider

- Native `<input type="range">`, restyled; the 44px row is the hit area. Readout right-aligned, `text-ui ink-muted tabular-nums`.
- Track 4px `rounded-pill bg-surface-sunken` with a 1px `line-strong` inset ring, filled part `bg-accent`. Thumb 22px `bg-surface border-[1.5px] border-line-strong shadow-raised`, carrying the focus ring.

### 5.8 Toggle (switch)

- `<button role="switch" aria-checked>` with a 44×26 `rounded-pill` track. The whole row (label left, switch right, `h-touch`) is the hit target, and the label is the accessible name.
- Off: `bg-surface-sunken` with a 1.5px `line-strong` inset ring, knob left. On: `bg-accent`, knob right. Knob 20px `bg-surface shadow-raised`, moving over `duration-base ease-out-soft`; its position is the non-color cue.

### 5.9 Toast

- `bg-inverse text-on-inverse rounded-tile shadow-toast text-ui`, `max-w-[360px]` (phones also `calc(100vw - 24px)`), padding `10px 8px 10px 14px`: an 18px `alert`/`info` icon in `on-inverse-muted`, the message, an optional action in `text-accent-on-inverse` 600, and a Dismiss × (`size-touch`).
- Info toasts (`role="status"`) auto-dismiss after 5s, paused on hover or focus; errors (`role="alert"`) stay. At most two stack, 8px apart, newest at the bottom. Enter: y 12→0 plus fade on `sheet`; exit: fade over `duration-quick`.

### 5.10 Rotate hint (phone portrait only)

- `h-touch bg-surface shadow-float rounded-pill pl-3.5 pr-1 z-float`: 18px `rotate` icon, "Rotate for a bigger wall" (`text-ui`), Dismiss ×. Bottom-center of the stage, 12px above the dock; fades in 600ms after first load over `duration-slow`. Dismissal is remembered in `localStorage` (try/catch); hidden in landscape.

### 5.11 Confirm dialog (Reset wall, Remove photo)

- `role="alertdialog"`, centered, `w-[min(360px,calc(100vw-32px))] bg-surface rounded-tile shadow-sheet p-5 z-dialog`, over `scrim`. Title "Reset the wall?" (serif `text-title`); body `text-ui ink-muted`: "Every frame and the photo are removed, and all settings go back to their defaults. This can't be undone." (three lines at 360px; the undo history being cleared is what "can't be undone" means, so it needs no second sentence) Buttons right-aligned: Cancel (secondary, initial focus) and Reset wall (danger).

### 5.12 Snap guide

- A 2px line across the full wall in one axis, clipped to the wall, `data-testid="snap-guide"`, at most one per axis. `bg-laser shadow-laser`; fades in over 60ms, out over 120ms. Guides render only while a drag is live, always at `z-guides-live` (§2.6).

### 5.13 Grid lines, origin and wall dimensions

- **Grid:** an SVG `<pattern>` of 1px `grid` lines (`shape-rendering="crispEdges"`) every Grid width (X) and Grid height (Y) cm, offset so a line passes through the origin. Over a visible photo each line gets a 3px `grid-halo` underlay. The two origin lines use `grid-origin`. Hidden entirely while Show grid is off.
- **Origin marker:** a 14px crosshair, 2.5px `accent` over 5.5px `halo`; in Grid origin mode 20px with a 4px center dot and a `crosshair` cursor. A tap sets the origin and plays one ring pulse (0.6→1.6 scale, fading over 320ms; skipped under reduced motion).
- **Dimensions (desktop only):** "300 cm" 20px above the top edge and "250 cm" rotated −90° 20px left of the left edge (clear of the 14px origin crosshair at the corner), `text-caption ink-muted tabular-nums font-stretch-semi-condensed`, on a 1px `ink-muted/40` line with 6px end ticks.

### 5.14 Wall surface and edge

- **Wall:** `bg-wall shadow-wall`, no texture. In Arrange mode a photo is clipped to the wall at the user's opacity.
- **Photo mode:** the photo extends past the wall, the outside veiled with `photo-dim` (e.g. `box-shadow: 0 0 0 100vmax var(--color-photo-dim)` on a wall-sized element); the wall edge is a 1px `ink` line plus a 1px outer `halo`; cursor `move`.
- **Empty wall:** centered serif `text-lead ink-muted`, `max-w-[24ch] text-balance pointer-events-none`: "Drag a frame onto the wall, or tap the preview to add one." ("click" under `can-hover:`).

### 5.15 Drag ghost (preview to wall)

- **Rendering:** a full frame (§3) carrying the preview's `data-frame-color`, portalled to `body` at `z-ghost`, with `shadow-frame-lift` at `liftScale`. **Size:** starts at the preview frame's rect and springs (`ghostFollow`) to the frame's true on-wall size at the current `pxPerCm`.
- **Position:** follows the pointer on `ghostFollow`, centered for fine pointers; on coarse pointers its bottom edge sits `ghostTouchLiftPx` (12px) above the finger, and the drop lands where it is drawn.
- **Over the wall:** opacity 1, with tilt, snapping and guides. **Off the wall:** opacity `ghostOffWallOpacity` (0.6), rest shadow, no tilt, signalling it will fly back.

### 5.16 Matrix control (the grid)

```
 <section aria-label="Matrix control">
 Matrix control                ◄ serif text-title (desktop); not shown in the landscape rail
 Height          Width         ◄ visible labels; names "Grid height (cm)" / "Grid width (cm)"
 [ 10      cm ]  [ 10      cm ]  ◄ two flex-1 fields (compact variant in the landscape rail)
 Show grid               ( ●)  ◄ switch row (§5.8), role="switch", name "Show grid"
```

- **Grid height (cm)** is the Y spacing (distance between horizontal lines), **Grid width (cm)** the X spacing. Default 10 cm, limits 1–100 cm (the store keeps its 0.5 cm floor as a safety net); commits like any field (§5.2) and redraws the grid immediately. The fields stay editable while the grid is hidden.
- **Show grid** hides or shows the grid lines and origin lines. While off, Snap to grid (in Settings) is disabled, as before.
- **Order per shell.** Desktop: title, fields, switch (the sketch's order: fields, then the on/off control). Landscape rail: switch first, then fields, so the frequently used switch always sits above the fold (§4.3). Stacked: inside the Settings Grid section, switch first, then fields (§5.6).
- Not undoable (grid settings are not frames), consistent with the rest of Settings.

---

## 6. Motion

All springs use motion's `{ type: "spring", stiffness, damping, mass }`; during a drag only motion values change. ζ and settle times come from simulating each spring 0→1, settled within 2%.

### 6.1 Spring presets (`lib/physics.ts`; keep these names)

| Preset | stiffness | damping | mass | ζ | Overshoot | ~Settle | Drives |
|---|---|---|---|---|---|---|---|
| `lift` | 520 | 30 | 1 | 0.66 | 6% | 260ms | Scale to `liftScale`, lift-layer opacity |
| `tilt` | 200 | 13 | 1 | 0.46 | 20% | 590ms | Rotation following drag velocity (the nail swing) |
| `settle` | 360 | 32 | 1 | 0.84 | <1% | 220ms | x/y to the final spot, scale back to 1, rubber-band return |
| `settleRotate` | 260 | 18 | 1 | 0.56 | 12% | 360ms | Rotation back to 0 on drop, one small overshoot |
| `push` | 240 | 28 | 1.2 | 0.82 | 1% | 280ms | Neighbors sliding out of the way |
| `ghostFollow` | 700 | 46 | 0.6 | 1.12 | 0 | 210ms | Ghost position and size (≈65ms of lag) |
| `flyBack` | 380 | 32 | 0.8 | 0.92 | 0 | 225ms | Ghost returning to the preview |
| `popIn` | 460 | 26 | 1 | 0.61 | 9% | 275ms | Tap-to-add appearance; Generate in the preview |
| `remove` | 600 | 44 | 0.8 | 1.00 | 0 | 215ms | Delete shrink |
| `duplicate` | 340 | 24 | 1 | 0.65 | 7% | 325ms | Copy springing out to its free spot |
| `sheet` | 400 | 40 | 1 | 1.00 | 0 | 290ms | Sheets, segment thumbs, toast entrance |

### 6.2 Scalars

| Name | Value | Notes |
|---|---|---|
| `liftScale` | 1.04 | |
| `tiltFactor` | 0.012 | Degrees per px/s: `rotate = clamp(−vx × tiltFactor, ±maxTiltDeg)` |
| `maxTiltDeg` | 8 | |
| `rubberBandFactor` / `rubberBandMaxPx` | 0.35 / 30 | `shown = maxPx × (1 − 1 / (1 + overflow × factor / maxPx))` |
| `pushStaggerMs` | 30 | Per pushed frame, nearest first, capped at 150ms total |
| `snapThresholdPx` | `{ fine: 8, coarse: 12 }` | `coarse` when `(pointer: coarse)` matches |
| `snapHapticMs` | 8 | `navigator.vibrate?.(8)`, once per axis engage |
| `dragStartPx` | `{ fine: 3, coarse: 6 }` | Movement before a press becomes a drag |
| `ghostTouchLiftPx` / `ghostOffWallOpacity` | 12 / 0.6 | |
| `popInFromScale` / `removeToScale` / `generateFromScale` | 0.6 / 0.85 / 0.92 | `generateFromScale` is new |
| `guideFadeInMs` / `guideFadeOutMs` / `photoModeFrameOpacity` / `toastMs` | 60 / 120 / 0.35 / 5000 | |

### 6.3 Choreography

- **Pick-up.** A plain press doesn't lift. Past `dragStartPx` the frame selects, jumps to `z-frame-lifted` and scales to `liftScale` with the lift layer fading in on `lift`.
- **Drag and tilt.** Position tracks the pointer 1:1. Rotation follows `tilt` toward `−vx × tiltFactor` with `transform-origin: 50% 0%`, so the frame swings from its top center like it hangs on a nail, swinging back about 1.5 times when the pointer stops.
- **Snap engage.** Within `snapThresholdPx` of a grid line the axis snaps (a jump of ≤12px, read as a magnet), the laser guide fades in and `vibrate(snapHapticMs)` fires. Moving past the threshold releases it.
- **Drop and settle.** x/y spring to the store's final spot on `settle`, scale to 1 on `settle`, rotation to 0 on `settleRotate` with one small overshoot.
- **Rubber-band.** Past a wall edge the frame follows the curve in §6.2 and springs back inside on `settle`. Tilt still applies.
- **Push-apart.** Each moved neighbor slides on `push`, `pushStaggerMs × rank` after the anchor lands, nearest first, with the nudge layer showing. The anchor never moves.
- **Preview ghost and fly-back.** The ghost grows from the preview frame to its true size while following the finger on `ghostFollow`. Dropped on the wall, it hands off to a real frame at the same rect with no pop. Dropped off the wall, it flies back to the preview frame's rect on `flyBack`, fading over the last 120ms, and the preview box pulses 0.97→1 over `duration-quick`.
- **Generate.** The preview frame re-mounts at the new size and color, scaling `generateFromScale`→1 on `popIn` while the previous frame fades out over `duration-quick` (cross-fade, both shapes).
- **Color roll after an add.** The preview frame cross-fades to the new color over `duration-quick` with no scale, so the eye reads "next frame, new finish" without the box jumping.
- **Pop-in (tap to add).** The frame appears at its free spot, scaling from `popInFromScale` to 1 on `popIn` while fading in over 120ms; the lift layer fades 1→0, as if it is being placed against the wall.
- **Delete.** Shrink to `removeToScale` on `remove` and fade over 140ms, then unmount. The context panel cross-fades back to the Frame creator.
- **Duplicate.** The copy (same color) mounts over the original at `liftScale` with the lift layer, springs to its free spot on `duplicate` and settles to 1. It becomes selected, so repeated Duplicates walk copies across the wall.

### 6.4 Reduced motion (`useReducedMotion()` is true)

| Behavior | Reduced variant |
|---|---|
| Tilt | Off: rotation is always 0 |
| Lift | `liftScale` = 1; shadow-layer opacity tweens over 120ms |
| Settle, push, rubber-band return, duplicate travel, fly-back | 160ms tween (`duration-reduced`), `ease-out-soft`, no overshoot |
| `pushStaggerMs` | 0 |
| Ghost | Tracks the pointer directly; size changes instantly |
| Pop-in / delete | Opacity only, 120ms; no scale |
| Generate / color roll | Instant swap, no scale, no cross-fade |
| Sheet / toast | 200ms tween / 160ms fade |
| Snap guide, haptic | Unchanged |
| Origin pulse, rotate-hint fade, preview pulse | Skipped |

Encode in `physics.ts` as `reducedMotion = { tweenShortMs: 120, tweenMs: 160, tweenLongMs: 200, ease: [0.2, 0.8, 0.2, 1] }`.

---

## 7. Accessibility

**Contrast** (WCAG 2.x, measured):

| Pair | Ratio | Need |
|---|---|---|
| `ink` on `surface` / `wall` / `stage` | 15.6 / 14.6 / 10.4 | 4.5 |
| `ink-muted` on `surface` / `stage` / `surface-sunken` / `wall` (preview caption) | 7.4 / 4.9 / 6.5 / 6.9 | 4.5 |
| `frame-ink` on `aperture`, all ten finishes (§3.2) | 10.7–17.3 | 4.5 |
| Frame outline vs any flat background (K, worst adjacent band) | ≥3.3 | 3 |
| `on-accent` on `accent` | 7.9 | 4.5 |
| `accent` on `surface` / `wall` | 7.6 / 7.2 | 4.5 text, 3 marks |
| `danger` on `surface` / `danger-soft`; `on-danger` on `danger` | 6.4 / 5.5 / 6.6 | 4.5 |
| `on-inverse` / `accent-on-inverse` / `on-inverse-muted` on `inverse` | 13.3 / 7.8 / 7.9 | 4.5 |
| `line-strong` on `surface` / `surface-sunken` (control borders) | 3.8 / 3.4 | 3 |
| `wall-edge` on `wall`; `laser` on `wall` | 3.6; 3.6 | 3 |

Grid lines (about 1.5:1) are deliberately quiet; the guide and the frame's motion convey snapping. The preview box border (`line`) is decorative; the box is identified by the frame inside it and its accessible name.

- **Focus.** `:focus-visible` gives a global 2px `focus` outline at 2px offset; fields draw it on their border. Frames use a 2px *dashed* outline at 3px offset, distinct from the brackets.
- **Hit areas.** Every control ≥44×44. A frame smaller than 44px on screen gets an invisible `::before` hit extension; the later frame wins where they overlap. The preview and frames use `touch-none`.
- **Selection is not color alone.** Brackets are a shape; frames are `role="button"` with `aria-pressed`. The frame's finish is never the only carrier of meaning (it is decoration), and it is exposed to tests as `data-frame-color`, not in accessible names.
- **Keyboard.** Frames: arrows nudge, Delete removes, Esc deselects. Frame creator: DOM and focus order is picker → fields (Width, Height for rectangles) → Generate → preview on every shell, which follows the task (set, generate, add); CSS grid places the parts where §4 draws them. **Why the focus order differs from the visual order** (the preview sits above or beside the fields): WCAG 1.3.2 and 2.4.3 require a sequence that preserves meaning and operability, not one that copies the layout. Here the preview's name and action depend on what Generate produced, so reaching it after Generate is the meaningful order, and the alternative (preview first) would offer "Add…" with a size the user is about to change. The order is the same on every shell, so it never surprises. Component tests should assert this tab sequence: Rectangle radio (checked) → Width (cm) → Height (cm) → Generate → Add rectangle, … cm. Enter or Space on the preview adds a frame.
- **Live regions.** Toasts use `role="status"` or `role="alert"`. A hidden `aria-live="polite"` region announces "Frame added", "Frame deleted", "Frame duplicated" and, after Generate, "Ready: rectangle, 40 × 50 cm".
- **Motion.** §6.4 applies in full.

---

## 8. Copy and accessible names (the e2e contract)

Sentence case, no exclamation marks. Tests should find elements by these exact names.

| Element | Role | Accessible name / text | Where |
|---|---|---|---|
| Frame creator | region (`section` + heading) | "Frame creator" | Context panel, Arrange (heading visible on desktop) |
| Shape picker | radiogroup | "Shape" | Frame creator |
| Shape options | radio | "Rectangle", "Square", "Circle" | Shape picker |
| Size fields | textbox | "Width (cm)", "Height (cm)" (rectangle); "Side (cm)" (square); "Diameter (cm)" (circle) | Frame creator, Selected frame |
| Generate | button | "Generate" | Frame creator |
| Preview | button | "Add rectangle, 40 × 50 cm" / "Add square, 40 × 40 cm" / "Add circle, Ø 40 cm" | Frame creator; attribute `data-frame-color="1".."10"` |
| Preview caption | text | "40 × 50 cm" / "Ø 40 cm" | Landscape and desktop |
| Matrix control | region | "Matrix control" | Left panel (landscape, desktop); inside Settings > Grid on stacked |
| Grid spacing | textbox | "Grid height (cm)" (Y), "Grid width (cm)" (X); visible "Height", "Width" | Matrix control |
| Show grid | switch | "Show grid" | Matrix control |
| Show photo | switch (`aria-checked`) | "Show photo" | Photo tools, Settings > Photo |
| Wall fields | textbox | "Wall width (cm)", "Wall height (cm)", "Push gap (cm)"; visible "Width", "Height", "Push gap" | Settings > Wall |
| Snap to grid | switch | "Snap to grid" | Settings > Grid |
| Set origin | button | "Set origin on the wall" | Settings > Grid |
| Frame on the wall | button | "Rectangle 40 × 50 cm" / "Square 40 × 40 cm" / "Circle Ø 40 cm"; `data-frame-color` | Wall |
| Selected frame | region | "Selected frame" | Context panel / right panel |
| Selection actions | button | "Duplicate", "Delete", "Deselect" | Selected frame |
| Position fields | textbox | "X (cm)", "Y (cm)" | Selected frame |
| Mode | radiogroup / radio | "Mode" / "Arrange", "Photo", "Grid origin" (phones show "Origin") | Top bar or right rail |
| History | button | "Undo", "Redo" | Dock, right rail, top bar |
| Settings | button / dialog | "Settings" / "Settings", "Close settings" | Top bar (stacked, narrow desktop) or right rail |
| Photo controls | button / slider | "Upload photo", "Replace photo", "Remove photo", "Adjust photo"; "Opacity", "Scale" | Photo tools, Settings |
| Origin tools | text / button | "Tap the wall where the grid should start." / "Grid starts at 20 × 40 cm" / "Reset to corner", "Done" | Origin tools |
| Empty wall | text | "Drag a frame onto the wall, or tap the preview to add one." ("click" on fine pointers) | Wall |
| Photo tools, no photo | text | "Add a photo of your wall to line frames up with it." | Photo tools |
| Push gap helper | text | "Space kept between frames when they push each other apart." | Settings > Wall |
| Rotate hint | text / button | "Rotate for a bigger wall" / "Dismiss" | Phone portrait |
| Live region | status | "Frame added", "Frame deleted", "Frame duplicated", "Ready: rectangle, 40 × 50 cm" | Hidden |
| Toasts | status / alert | "Storage is full, so changes aren't being saved. They stay until you close this tab." / "Saved data couldn't be read, so the wall started fresh. A backup was kept." / "Photos can't be saved in this browser. Your photo stays until you close this tab." | Stage |
| Reset dialog | alertdialog | "Reset the wall?" / "Cancel" / "Reset wall" | Dialog |
| Remove photo dialog | alertdialog | "Remove the photo?" / "Cancel" / "Remove photo" | Dialog |

An action keeps its name everywhere: Generate is always "Generate", Duplicate is announced as "Frame duplicated", and Reset wall opens a dialog whose confirm button is also "Reset wall". The "Frames" palette region is retired; tests that looked for it should use "Frame creator".
