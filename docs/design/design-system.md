# WallPlanner design system

Build spec for every WallPlanner screen. Owner: designer. Tokens live in `src/app/globals.css` (`@theme`); motion presets live in `src/features/planner/lib/physics.ts` under the names in §6. If code and this doc disagree, this doc wins until it is updated.

---

## 1. Direction

**Concept: hanging day.** The look is a gallery wall on the morning of an install: a freshly painted wall, a laser level line across it, frames waiting to go up. The **wall is the brightest thing on screen**. It sits on a muted concrete "room", and the interface is quiet mat-board chrome along the edges. One element carries the personality: **the frames**, with mitred lacquer moulding, a museum-white mat and a picture opening with a bevel line. Everything else steps back.

**Color story.** Concrete (`stage`) for the room, gallery white (`wall`) for the wall, mat white (`surface`) for the interface and graphite (`ink`) for text. There is one art-world accent, **ultramarine** (`accent`, a nod to International Klein Blue), for selection, the active mode and primary actions; it holds 7:1 on the wall. **Laser green** (`laser`) appears only as the snap guide, the one thing that should feel like light. Danger red is for destructive actions only. No gradients and no decorative washes.

**Typography pairing.**
- **Archivo** (variable, width axis 62–125) is the measuring voice: controls, numbers and frame labels. Its width axis does real work, condensing frame labels (87.5% down to 75%) so small frames keep their size label longer.
- **Newsreader** (variable, optical size) is the gallery-placard voice. It is used only for the few sentences the app says aloud: the wordmark, section and sheet titles, dialog titles and the empty-wall line. Roman only; no italics are loaded.

**Principles.**
1. The wall gets the space. Chrome lives in reserved edge strips and never floats over the wall. The exceptions are transient toasts and hints.
2. One accent, used for state. If something is ultramarine, it is selected, active or the primary action.
3. Shape before color. Selection uses corner crop marks, the active tile a thicker border and the mode switch a raised thumb. Color reinforces these cues but never carries them alone.
4. Physical, not bouncy. Springs feel like weight (a frame on a nail), with at most one small overshoot.
5. Calm copy. Sentence case, plain verbs and no exclamation marks.

**Deliberately avoided:** a cream background with a terracotta accent, a dark UI with an acid-green accent, one radius on everything, grey card shadows everywhere, all-caps eyebrow labels and monospace data labels. Radii follow a hierarchy: frames 0, controls 10, tiles 14, sheets 22.

---

## 2. Tokens

All tokens are CSS variables on `:root` (`@theme static`), so they also work as `var(--…)` in inline styles and motion values. Tailwind's default colors, shadows and radii are **switched off**: `bg-white`, `shadow-md` and `rounded-sm` do not exist. Use the tokens below.

### 2.1 Color

| Token (utility) | Value | Usage |
|---|---|---|
| `stage` | `#cdd2cc` | Room around the wall; body background |
| `wall` | `#f4f5f1` | Wall surface (no photo) |
| `wall-edge` | `#7c827d` | 1px wall boundary (3.6:1 on wall) |
| `photo-dim` | `rgb(205 210 204 / .62)` | Veil over the photo outside the wall (Photo mode) |
| `surface` | `#fcfcfa` | Top bar, dock, rails, sidebar, panel, sheets, tiles |
| `surface-sunken` | `#eceeea` | Input wells, segmented track, slider track |
| `surface-pressed` | `#e2e5e0` | Hover/pressed fill for quiet buttons |
| `line` | `#dadcd7` | Dividers and chrome edges (decorative only) |
| `line-strong` | `#7c827d` | Borders of inputs, switches and secondary buttons (≥3:1) |
| `ink` / `ink-muted` / `ink-disabled` | `#1e2225` / `#4f555a` / `#9aa09b` | Primary text, icons, frame labels / secondary text, units, captions, inactive segments / disabled only |
| `inverse` / `on-inverse` | `#24292c` / `#f2f4f0` | Toast surface / toast text |
| `on-inverse-muted` / `accent-on-inverse` | `#b9bfbb` / `#aeb8ff` | Toast icons and dismiss / toast action |
| `accent` | `#2b3fcb` | Selection marks, active state, primary buttons, slider fill, switch on |
| `accent-hover` / `accent-pressed` | `#2536b4` / `#1f2d9e` | Primary button hover / pressed |
| `accent-soft` / `on-accent` | `#e5e8fb` / `#ffffff` | Active tile fill, text selection / text and icons on accent |
| `focus` | `#2b3fcb` | Focus ring (same hue as accent, separate token) |
| `laser` / `laser-glow` | `#0a9447` / `rgb(38 214 112 / .45)` | Snap guide core (3.6:1 on wall) / glow |
| `danger` / `danger-soft` / `on-danger` | `#b42318` / `#fbe6e3` / `#ffffff` | Delete, Remove photo, Reset wall |
| `frame-top` / `frame-side` / `frame-bottom` | `#50555a` / `#363a3e` / `#1e2124` | Moulding rails: lit top, sides, shaded bottom |
| `frame-halo` | `rgb(255 255 255 / .55)` | 1px ring separating frames from dark photos |
| `mat` | `#fdfdfb` | Mat board |
| `aperture` / `aperture-edge` | `#e6e8e4` / `rgb(30 34 37 / .16)` | Picture opening / its bevel line |
| `halo` | `rgb(255 255 255 / .92)` | Underlay behind accent marks (brackets, origin marker) |
| `grid` / `grid-origin` / `grid-halo` | `rgb(30 34 37 / .16)` / `rgb(43 63 203 / .5)` / `rgb(255 255 255 / .45)` | Grid lines / origin lines / line underlay over a photo |
| `scrim` / `scrim-light` | `rgb(30 34 37 / .28)` / `rgb(30 34 37 / .14)` | Behind the bottom sheet and dialogs / behind the landscape side sheet |

Light theme only in v1 (`color-scheme: light`). A dark theme is not cheap here, because the wall and frames are physical colors, so it is skipped.

### 2.2 Type

| Token | Size / line | Family, weight | Usage |
|---|---|---|---|
| `text-micro` | 11 / 14 | sans 500 | Compact frame label, vertical segment captions |
| `text-caption` | 12 / 16 | sans 400–500 | Field labels, units, tile size, full frame label, dimensions |
| `text-ui` | 14 / 20 | sans 500 (600 when active) | Buttons, segments, toggles, toasts, tile names |
| `text-body` | 16 / 24 | sans 400 | **Every text input** (prevents iOS zoom), body copy |
| `text-lead` | 18 / 24 | serif 400 | Empty-wall line, sheet section titles |
| `text-title` | 22 / 28 | serif 500, `tracking-title` | Sheet title, panel section titles, dialog titles |
| Wordmark | 20 / 28 | serif 500, `tracking-title` | "WallPlanner": desktop, and stacked at 640px+ |

Families are `font-sans` (Archivo) and `font-serif` (Newsreader), loaded with `next/font` in `layout.tsx`. Width is **not** part of any text token; add it as a separate utility. There are exactly two stretches: `font-stretch-semi-condensed` (87.5%) for full frame labels, vertical segment captions and wall dimensions, and `font-stretch-condensed` (75%) for compact frame labels only. All numbers use `tabular-nums`. Frame labels use `tracking-label` (0.01em) and serif titles use `tracking-title` (−0.01em). Never set type in all caps.

### 2.3 Spacing and sizes

Tailwind's 4px scale stays. These named sizes work with `w-`, `h-`, `size-`, `p-`, `gap-` and the rest:

| Token | Value | Usage |
|---|---|---|
| `touch` | 44px | Minimum hit target; buttons, inputs, icon buttons |
| `tile` | 56px | Palette tile height; dock row height |
| `field` | 76px | Default numeric field width |
| `bar` / `bar-lg` | 48 / 56px | Top bar: stacked / desktop |
| `rail` / `rail-end` | 152 / 64px | Phone-landscape left / right rail (plus safe area) |
| `sidebar` / `panel` | 248 / 320px | Desktop left sidebar / right panel |
| `sheet` | 360px | Landscape side-sheet width |
| `gutter` | 12px | Screen-edge gutter on phones |
| `stage` / `stage-lg` | 12 / 40px | Padding between the stage edge and the wall: phones / desktop |
| `safe-top` `safe-right` `safe-bottom` `safe-left` | `env(safe-area-inset-*)` | e.g. `pb-safe-bottom`, `pl-safe-left` |

Internal rhythm: 8px between controls, 12px inside panels and 24px between settings sections.

### 2.4 Radii

| Token | Value | Usage |
|---|---|---|
| (none) | 0 | Frames, wall, grid |
| `rounded-control` | 10px | Inputs, buttons, icon buttons |
| `rounded-tile` | 14px | Palette tiles, toasts, dialog, vertical segmented track |
| `rounded-sheet` | 22px | Bottom sheet top corners, side sheet left corners |
| `rounded-pill` / `rounded-full` | 9999px | Horizontal segmented control, rotate hint, switches, circle frames |

### 2.5 Elevation

| Token | Value (identical to `globals.css`) | Usage |
|---|---|---|
| `shadow-wall` | `0 0 0 1px #7c827d, 0 1px 2px rgb(22 26 28 / 0.1), 0 14px 36px -14px rgb(22 26 28 / 0.32)` | Wall on the stage; the first layer is the `wall-edge` ring |
| `shadow-frame-rest` | `0 0 0 1px rgb(255 255 255 / 0.55), 0 1px 1px rgb(22 26 28 / 0.22), 0 3px 6px -2px rgb(22 26 28 / 0.24)` | Frame hanging flush; the first layer is the `frame-halo` ring |
| `shadow-frame-hover` | `0 0 0 1px rgb(255 255 255 / 0.55), 0 2px 3px rgb(22 26 28 / 0.2), 0 7px 14px -5px rgb(22 26 28 / 0.28)` | Desktop hover |
| `shadow-frame-nudge` | `0 0 0 1px rgb(255 255 255 / 0.55), 0 3px 5px rgb(22 26 28 / 0.18), 0 10px 18px -6px rgb(22 26 28 / 0.28)` | Frame being pushed (while it moves) |
| `shadow-frame-lift` | `0 0 0 1px rgb(255 255 255 / 0.55), 0 8px 12px -4px rgb(22 26 28 / 0.22), 0 22px 36px -10px rgb(22 26 28 / 0.38)` | Dragged frame, drag ghost, duplicate in flight |
| `shadow-raised` | `0 1px 2px rgb(22 26 28 / 0.14), 0 1px 1px rgb(22 26 28 / 0.08)` | Segment thumb, switch knob, slider thumb |
| `shadow-float` | `0 2px 4px rgb(22 26 28 / 0.1), 0 8px 20px -6px rgb(22 26 28 / 0.22)` | Rotate hint, any floating chip |
| `shadow-sheet` | `0 0 0 1px rgb(22 26 28 / 0.06), 0 10px 40px -8px rgb(22 26 28 / 0.32)` | Bottom or side sheet, dialog |
| `shadow-toast` | `0 10px 28px -8px rgb(22 26 28 / 0.4)` | Toasts |
| `inset-shadow-aperture` | `inset 0 0 0 1px rgb(30 34 37 / 0.16), inset 0 1px 2px rgb(30 34 37 / 0.1)` | Picture opening: bevel line plus slight depth |

**Performance rule:** never animate `box-shadow` during a drag. A frame renders `shadow-frame-rest` on itself, plus a sibling layer (`absolute inset-0`, same radius, `shadow-frame-lift`, `pointer-events-none`) whose **opacity** animates from 0 to 1 on lift. The nudge shadow works the same way.

### 2.6 Z-index (`z-*`)

The stage is its own stacking context (`relative isolate overflow-hidden`): `wall 0` < `photo 1` < `grid 2` < `guides 5` < `frames 10` < `frame-lifted 20`. Guides sit under resting frames so they never strike through labels, and the dragged frame rides above its own guides.

App level: `chrome 40` (bars, rails, dock, panels) < `float 50` (rotate hint) < `scrim 60` < `sheet 70` < `ghost 80` (palette drag ghost, portalled to `body`) < `dialog 85` < `toast 90`.

### 2.7 Durations and easing (CSS only; springs are in §6)

| Token | Value | Usage |
|---|---|---|
| `duration-instant` | 80ms | Press feedback |
| `duration-quick` | 140ms | Hover, color, icon swaps |
| `duration-base` | 220ms | Switch knob, segment thumb, context-panel cross-fade |
| `duration-slow` | 320ms | Rotate hint and toast enter |
| `duration-reduced-short` / `-reduced` / `-reduced-long` | 120 / 160 / 200ms | Reduced-motion tweens (§6.4) |
| `ease-out-soft` | `cubic-bezier(.2,.8,.2,1)` | Default enter and move |
| `ease-in-soft` | `cubic-bezier(.4,0,1,1)` | Exits |
| `ease-in-out-soft` | `cubic-bezier(.45,0,.2,1)` | Cross-fades |

### 2.8 Custom variants

The layout variants `phone-portrait:`, `phone-landscape:` and `desktop:` are defined in §4.1. The others:
- `coarse:` is `(pointer: coarse)`.
- `can-hover:` is `(hover: hover) and (pointer: fine)`. Wrap every hover style in it, e.g. `can-hover:hover:bg-surface-pressed`.
- The built-in `motion-reduce:` and `motion-safe:` also apply.

---

## 3. Frame look

### 3.1 Anatomy (rectangle and square)

```
 outer box = the frame's real size (w × h px = cm × pxPerCm)
 ┌──────────────────────────────┐ ◄ moulding: border t px, mitred by 4 border colors
 │▓▓▓▓▓▓▓▓▓▓ frame-top ▓▓▓▓▓▓▓▓▓│   top = frame-top, left/right = frame-side,
 │▓┌──────────────────────────┐▓│   bottom = frame-bottom (the CSS border joins
 │▓│ mat (padding m)          │▓│   draw the 45° mitres for free)
 │▓│  ┌────────────────────┐  │▓│
 │▓│  │ aperture           │  │▓│ ◄ aperture-edge bevel line (inset)
 │▓│  │      40 × 50       │  │▓│ ◄ label, centered on the whole inner box
 │▓│  └────────────────────┘  │▓│
 │▓└──────────────────────────┘▓│
 │▓▓▓▓▓▓▓▓▓ frame-bottom ▓▓▓▓▓▓▓│
 └──────────────────────────────┘  + shadow-frame-rest (with 1px frame-halo ring)
```

**DOM, from the outside in.** `div.frame` is `box-border border-solid border-t-frame-top border-x-frame-side border-b-frame-bottom shadow-frame-rest` with border width `t`. Inside it, `div.mat` is `absolute inset-0 bg-mat` with padding `m`, and holds `div.aperture` (`size-full bg-aperture inset-shadow-aperture`). The label is a sibling of the mat (`absolute inset-0 grid place-items-center`), so it can use the whole inner width.

### 3.2 Geometry rules (s = min(w, h) in screen px)

| Part | Rule |
|---|---|
| Moulding `t` | `clamp(2, round(s × 0.06), 10)` px |
| Mat `m` | `s ≥ 48` ? `clamp(3, round(s × 0.10), 24)` : `0`. Small frames drop the mat |
| Corners | Square (radius 0). Frames are never rounded |

### 3.3 Size label

Text is in cm with at most one decimal, and a trailing `.0` is dropped. Rectangles and squares read `40 × 50` (U+00D7, spaces on both sides); circles read `Ø 40` (U+00D8). There is no unit on the wall.

Try *full*, then *compact*, otherwise hide the label. Available width is `w − 2t` for rectangles and `0.8 × (d − 2t)` for circles; available height uses the same formulas.

| Tier | Text | Size | Stretch | Weight | Needs width ≥ | Needs height ≥ |
|---|---|---|---|---|---|---|
| full | `40 × 50`, `Ø 40` | `text-caption` (12/16) | `font-stretch-semi-condensed` (87.5%) | 500 | `chars × 0.55 × 12 + 8` | 18px |
| compact | `40×50`, `Ø40` (no spaces) | `text-micro` (11/14) | `font-stretch-condensed` (75%) | 500 | `chars × 0.50 × 11 + 4` | 16px |
| hidden | — | — | — | — | otherwise | — |

- The 0.55 and 0.50 em-per-character figures are conservative upper bounds measured on Archivo at these settings (actual: 0.44–0.54 and 0.40–0.49). At the phone-landscape scale (≈1.46 px/cm), 50×70 shows full, 40×40 and 30×40 show compact, and 20×25 is hidden.
- The label is always `text-ink` on the opaque mat or aperture, so it stays legible over any photo without a backing plate. A hidden label's size is still in the selection fields and the frame's accessible name.

### 3.4 Circle variant

The outer element is `rounded-full` with no border. Its moulding is its own background, `bg-linear-to-b from-frame-top to-frame-bottom` (lit from above), because four-color borders on a circle look like a beach ball. The mat sits at `inset: t`, `rounded-full`, with the same padding rule, and the aperture is `rounded-full`. Selection brackets frame the circle's square bounding box.

### 3.5 States

| State | Visual | Not-color cue |
|---|---|---|
| Resting | `shadow-frame-rest` | — |
| Hover (`can-hover:` only) | `shadow-frame-hover`, `cursor-grab` | Shadow depth |
| Selected | Crop-mark brackets (§3.6); the frame itself is unchanged | Bracket shapes at the corners |
| Focus-visible (keyboard) | 2px dashed `focus` outline at 3px offset (circle: `rounded-full`) | Dashed outline, distinct from brackets |
| Dragging / lifted | Scale `liftScale`, lift layer at opacity 1, tilt, `z-frame-lifted`, `cursor-grabbing` | Size and shadow |
| Being pushed | Nudge layer at opacity 1 while moving, back to 0 at rest | Motion and shadow |
| Snapped | Frame unchanged; laser guides light up on the wall (§5.12), plus haptic | Guide line |
| Photo mode | `opacity-35`, `pointer-events-none`, no brackets | — |
| Rubber-banding | No extra styling; the resistance is the cue | — |

### 3.6 Selection brackets

- The overlay is an SVG child of the frame with `overflow-visible pointer-events-none`. Absolute children position from inside the moulding, so place it at `left/top: −(t + 4)px` with size `(w + 8) × (h + 8)`. For circles, which have no border, use `−4px`.
- It draws four L-marks, one per corner, with arm length `a = clamp(8, round(s × 0.2), 14)` px. Each mark is a 5.5px `halo` stroke with a 2.5px `accent` stroke on top, both with round caps and joins, which holds at least 3:1 on a white wall, the mat, dark moulding or a busy photo.
- Brackets rotate and scale with the frame while it is dragged, because they are its children.

---

## 4. Layouts

### 4.1 Shell selection

| Shell | Query | Variant |
|---|---|---|
| **Landscape rails** (phones held sideways, any short window) | `(orientation: landscape) and (max-height: 500px)` | `phone-landscape:` |
| **Desktop** | `(min-width: 1024px) and (min-height: 501px)` | `desktop:` |
| **Stacked** (default: phone portrait, tablets in portrait, narrow windows) | everything else | unprefixed |
| ↳ phone-portrait extras | `(max-width: 639px) and (orientation: portrait)` | `phone-portrait:` |

The landscape and desktop queries are mutually exclusive, so build the stacked shell unprefixed and then override. The root is `h-dvh`, and each chrome strip pads itself with its safe-area token.

**Wall fit.** The stage's content box excludes the safe-area insets. Each side of the stage gets padding `max(p, inset of that side)`, counting only insets that no bar or rail already absorbs, where `p` is `stage` (12px) on phones and `stage-lg` (40px) on desktop. In phone landscape that means `pt-[max(var(--spacing-stage),var(--spacing-safe-top))]` and the same for the bottom; the left and right insets are already absorbed by the rails. Then `pxPerCm = min(contentW / wall.w, contentH / wall.h)`, with `contentW` and `contentH` from the ResizeObserver `contentRect` (the box with padding removed). No part of the wall sits under the notch or the home-indicator gesture zone. The wall is centered, and rotating the device changes only `pxPerCm`.

**Context panel.** One component, placed as the dock (stacked), the left rail (landscape) or the left sidebar (desktop). Its content swaps with a `duration-base` cross-fade inside a container of constant size, so **the wall never rescales when the selection changes**.

| Mode / state | Context panel shows |
|---|---|
| Arrange, nothing selected | **Palette**: three tiles and size inputs |
| Arrange, a frame selected | **Selection** (stacked and landscape). On desktop the palette stays and the selection goes to the top of the right panel |
| Photo | **Photo tools** (§4.6): Opacity, Scale, Upload photo / Replace photo, Show photo, Remove photo, Done |
| Grid origin | **Origin tools** (§4.6): instruction, origin readout, Reset to corner, Done |

### 4.2 Phone portrait (stacked)

```
┌────────────────────────────────────┐ ▲ pt-safe-top
│ (Arrange|Photo|Origin)        [≡]  │ top bar: h-bar, bg-surface, border-b line
├────────────────────────────────────┤
│                                    │
│   ┌────────────────────────────┐   │ stage: bg-stage, p-stage
│   │                            │   │
│   │            WALL            │   │ portrait walls are width-limited;
│   │                            │   │ the spare height holds toasts and hint
│   └────────────────────────────┘   │
│       ┌──────────────────────┐     │ toast (stacks above the hint)
│       └──────────────────────┘     │
│  ( ↻ Rotate for a bigger wall ✕ )  │ rotate hint (phone-portrait only)
├────────────────────────────────────┤
│ [▭][□][○]                 [↶][↷]   │ dock row A, h-tile: tiles | Duplicate Delete
│ Width        Height                │ dock row B: active tile sizes | W H X Y
│ [ 40    cm ] [ 50    cm ]          │
└────────────────────────────────────┘ ▼ pb-safe-bottom
```

- **Top bar:** the mode switch fills the left side and Settings sits on the right. Phones show the label "Origin"; the accessible name stays "Grid origin". From 640px (tablet portrait) the wordmark appears at the left and the label reads "Grid origin".
- **Dock:** `bg-surface border-t border-line px-gutter pt-2 pb-[calc(8px+var(--spacing-safe-bottom))]`, with two rows: A (56px) and B (64px: label plus field), 8px apart. From 640px the dock content is `max-w-[560px] mx-auto`.
- **Palette state:** row A holds three 64×56 tiles (glyph over size caption) with Undo and Redo at the far right; row B holds the **active tile's** size inputs.
- **Selection state:** row A holds Duplicate and Delete (icon plus label) and Undo/Redo. Row B holds Width, Height, X and Y (`flex-1` each; square and circle have three fields). Tapping empty wall or stage, or pressing Esc, deselects.
- **Elsewhere:** settings open as a bottom sheet (§5.6). Toasts sit at the bottom-center of the stage, 12px above the hint or dock.

### 4.3 Phone landscape (primary device)

```
 pl-safe-left                                                        pr-safe-right
┌───────────────┬──────────────────────────────────────────────┬──────────┐
│┌─────────────┐│                                              │┌────────┐│
││▭ Rectangle  ││         ┌─────────────────────────┐          ││   ⊞    ││ vertical
││  40 × 50    ││         │                         │          ││ Arrange││ segmented
│└─────────────┘│         │                         │          │├────────┤│ mode switch
│ □ Square      │         │          WALL           │          ││   ▣    ││
│ ○ Circle      │         │   (height-limited:      │          ││  Photo ││
│ Width  Height │         │    stage − 2×12px)      │          │├────────┤│
│ [40cm] [50cm] │         │                         │          ││   ┼    ││
│               │         └─────────────────────────┘          ││ Origin ││
│               │              ┌──────────────┐                │└────────┘│
│ [↶]      [↷]  │              │ toast        │                │   [≡]    │
└───────────────┴──────────────────────────────────────────────┴──────────┘
  w-rail + safe-left               stage                        w-rail-end + safe-right
```

- **Left rail** (context panel and history): `bg-surface border-r border-line p-2.5 pb-[calc(10px+var(--spacing-safe-bottom))]`, a flex column with Undo/Redo pinned at the bottom (`mt-auto`). If content ever exceeds the height, the content area scrolls; the bottom row does not.
- *Palette state:* three 132×52 tiles (glyph, name, size), then the active tile's inputs in two columns. *Selection state:* a header row with the size readout (`text-caption ink-muted`) and a Deselect ×, then Duplicate and Delete as two icon buttons, then a 2×2 grid of Width/Height over X/Y.
- **Right rail:** `bg-surface border-l border-line px-1.5 pt-2.5 pb-[calc(10px+var(--spacing-safe-bottom))] pr-[calc(6px+var(--spacing-safe-right))]`. The vertical mode switch sits at the top and Settings at the bottom (`mt-auto`), clear of the home indicator. The left rail likewise adds `pl-[calc(10px+var(--spacing-safe-left))]`.
- **Budgets:** on a 375px-tall screen, palette plus inputs take 248px (selection 264px) and history 44px. On a 667px-wide screen the stage is 451px, and a 300×250 wall at full height needs 422px.
- **Settings:** a right side sheet, `w-sheet` plus the right safe area, over `scrim-light`. The left part of the wall stays visible, so grid and wall changes preview live.
- **Toasts:** bottom-center of the stage, `max-w-[360px]`. Real gallery walls hang above furniture, so the bottom band of the wall is its least-used area.

### 4.4 Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ WallPlanner             ( Arrange | Photo | Grid origin )             [↶][↷] │ h-bar-lg
├─────────────┬───────────────────────────────────────────────┬────────────────┤
│ Frames      │                    300 cm                     │ Selected frame │ ◄ only while
│ ┌─────────┐ │    ├────────────────────────────────────┤     │ [Dup] [Delete] │   a frame is
│ │▭ Rect.  │ │    ┌────────────────────────────────────┐     │ Width  Height  │   selected
│ │ 40 × 50 │ │  2 │                                    │     │ [50cm] [70cm]  │
│ └─────────┘ │  5 │                                    │     │ X      Y       │
│ Width Height│  0 │               WALL                 │     │ [30cm] [40cm]  │
│ [40]  [50]  │    │                                    │     │ ────────────── │
│ □ Square    │  c │                                    │     │ Wall           │
│ Side [40]   │  m │                                    │     │ Grid           │
│ ○ Circle    │    └────────────────────────────────────┘     │ Photo          │
│ Diam. [40]  │                 ┌───────┐                     │ ────────────── │
│             │                 │ toast │                     │ [Reset wall]   │
└─────────────┴───────────────────────────────────────────────┴────────────────┘
   w-sidebar                  stage, p-stage-lg                    w-panel
```

- **Top bar:** `bg-surface border-b border-line`, with the wordmark on the left, the horizontal mode switch centered and Undo/Redo on the right.
- **Left sidebar:** a "Frames" title (serif `text-title`), then each tile followed by **its own** inputs. All three are always visible; there is no active-tile concept on desktop.
- **Right panel:** always open and scrolls independently. Sections run Selected frame (only while selected), Wall, Grid, Photo, then Reset wall as the last item in the scroll (not pinned, §5.6). Sections are separated by `border-t border-line` and 24px of space.
- **Stage:** wall dimensions sit in the stage padding (§5.13), and toasts at the bottom-center.

### 4.5 Placement summary

| Element | Stacked / phone portrait | Phone landscape | Desktop |
|---|---|---|---|
| Palette tiles | Dock row A | Left rail, top | Left sidebar |
| Size inputs | Dock row B (active tile) | Left rail, under tiles (active tile) | Under each tile |
| Mode switch | Top bar, horizontal | Right rail, vertical | Top bar, centered |
| Settings entry | Top bar, right | Right rail, bottom | None (panel always open) |
| Selection bar | Replaces dock rows A and B | Replaces left-rail content | Right panel, first section |
| Undo / Redo | Dock row A, right end | Left rail, bottom | Top bar, right |
| Settings | Bottom sheet | Right side sheet | Right panel |
| Toasts | Stage bottom, above hint and dock | Stage bottom-center | Stage bottom-center |
| Rotate hint | Stage bottom (`phone-portrait:` only) | — | — |

### 4.6 Photo tools and Origin tools

**Constant size.** The context panel's box never depends on its content, so switching modes never moves the wall. The stacked dock is `grid grid-rows-[56px_64px]`; the landscape rail and desktop sidebar fill their shell column (`h-full min-h-0`) with an `overflow-y-auto` content area. Undo/Redo are hidden in these two modes on phones, because history covers frames only; their slot holds **Done**. On desktop they stay in the top bar.

**Controls**

| Control | Spec |
|---|---|
| Opacity | Slider (§5.7), 0–100%, step 5, readout "60%". Maps to `background.opacity` 0–1 (default is T9's; 100% recommended) |
| Scale | Slider. Maps to `background.width` in cm through a log scale: `width = wall.w × 2^t`, `t ∈ [−2, 2]`, step 0.01. That gives 25–400% of the wall width, and equal slider travel gives equal zoom. Readout `round(width / wall.w × 100)%`. Height follows the image aspect |
| Scale anchor | The slider scales about the wall's center (x/y adjust so that photo point stays put); pinch scales about the pinch midpoint and the wheel about the cursor. All three clamp to 25–400% |
| Upload / Replace photo | Hidden `<input type="file" accept="image/*">` behind a button (phones also offer the camera). "Upload photo" (primary) with no photo, "Replace photo" (secondary, `upload` icon) with one |
| Show photo | Icon toggle named "Show photo" with `aria-pressed` and `eye` / `eye-off` icons (a switch row in Settings) |
| Remove photo | `trash` icon button in `text-danger`. Not undoable, so it asks first: "Remove the photo?" / Cancel / Remove photo (§5.11 pattern) |
| Origin instruction | "Tap the wall where the grid should start." in `text-ui ink` |
| Origin readout | "Grid starts at 20 × 40 cm" in `text-caption ink-muted tabular-nums` |
| Reset to corner | Secondary button; sets the origin to 0 × 0 |
| Done | Primary button; returns to Arrange |

**Per shell**

```
STACKED DOCK (rows 56 + 64, content width ≥ 336)
 Photo, loaded   │ [⇪ Replace photo] [eye] [trash]       [Done] │ row A
                 │ Opacity          60%   Scale          100%   │ row B: 16px label/readout + 44px
                 │ ─────────●─────────    ─────────●─────────   │ slider, two flex-1 columns
 Photo, empty    │ [⇪ Upload photo]                      [Done] │ row A (Done becomes secondary)
                 │ Add a photo of your wall to line frames up   │ row B: text-ui ink-muted, ≤ 2 lines
                 │ with it.                                     │
 Grid origin     │ Tap the wall where the grid should    [Done] │ row A: text-ui, ≤ 2 lines
                 │ start.                                       │
                 │ Grid starts at 20 × 40 cm  [Reset to corner] │ row B

LANDSCAPE LEFT RAIL (content 132px wide)
 Photo, loaded         Grid origin
┌─────────────────┐  ┌─────────────────┐
│ Opacity      60%│  │ Tap the wall    │
│ ───────●─────── │  │ where the grid  │
│ Scale       100%│  │ should start.   │
│ ───────●─────── │  │ 20 × 40 cm      │
│[⇪] [eye] [trash]│  │[Reset to corner]│
│                 │  │                 │
│ [    Done     ] │  │ [    Done     ] │ ◄ pinned bottom (mt-auto)
└─────────────────┘  └─────────────────┘
```

- **Stacked:** row A at 360px wide is 142 + 44 + 44 + 66px plus gaps, which fits in 336px.
- **Landscape:** the three icon buttons (`aria-label` plus `title`) fill exactly 132px, and "Reset to corner" uses `px-2` to fit. Done is full width and pinned at the bottom (`mt-auto`), in the slot where Undo/Redo sit in Arrange mode. With no photo, the rail shows the caption, then [Upload photo] (primary, full width), then Done. The photo rail uses 224px and the origin rail about 230px, both well under the 345px available on a 375px-tall screen.
- **Desktop sidebar** (216px content): a serif `text-title` heading ("Photo" or "Grid origin"), then the same controls in the same order with full labels. Photo: Opacity, Scale, a "Show photo" switch row, [Replace photo] at full width, "Remove photo" (quiet danger), [Done] at full width. Origin: instruction, readout, [Reset to corner], [Done].

**Touch.** The wall is `touch-none` in every mode. In Photo mode the **whole stage** is `touch-none` too, because the photo extends past the wall and a one-finger pan or two-finger pinch may start anywhere on it. In Grid origin mode a tap on the wall sets the origin, and `touch-none` there also stops double-tap zoom.

---

## 5. Components

Every interactive control is at least 44×44px (`size-touch` / `h-touch`), and every hover style is wrapped in `can-hover:`. Icons are 20px in icon buttons and 18px next to text, drawn on a 24-unit viewBox with a 1.75 `currentColor` stroke and round caps and joins. The set: `undo`, `redo`, `settings` (two sliders, not a gear), `arrange` (three small frames), `photo`, `origin` (a grid corner with a crosshair), `duplicate`, `trash`, `close`, `rotate`, `upload`, `eye`, `eye-off`, `alert`, `info`, `check`.

### 5.1 Palette tile

```
 stacked 64×56          landscape 132×52                desktop 216×56
┌──────────┐           ┌──────────────────────┐        ┌───────────────────────────┐
│  ┌────┐  │           │ ┌──┐  Rectangle      │        │ ┌──┐  Rectangle           │
│  │    │  │           │ └──┘  40 × 50        │        │ └──┘  40 × 50             │
│  └────┘  │           └──────────────────────┘        └───────────────────────────┘
│  40 × 50 │  glyph in a ≤28px box: a mini frame (2px moulding, 3px mat);
└──────────┘  the rectangle glyph follows the current W:H ratio
```

- **Style:** `bg-surface border border-line rounded-tile touch-none`. The name is `text-ui` 500 and the size is `text-caption ink-muted tabular-nums`. Stacked tiles show only the size; the name is in the accessible name. **Active** (stacked and landscape): `border-2 border-accent bg-accent-soft`; the thicker border is the non-color cue.
- **Feedback:** hover is `bg-surface-pressed`; press scales to .97 for `duration-instant`. **Accessible name:** "Add rectangle, 40 × 50 cm".
- **Tap** adds a frame at the nearest free spot and makes the tile active. The new frame is **not** selected, so repeated taps keep adding. **Drag** starts the ghost (§5.15) and also makes the tile active.

### 5.2 Size input (numeric, cm)

```
Width                ◄ text-caption ink-muted, 4px gap
┌──────────────────┐
│ 40            cm │ ◄ h-touch, bg-surface-sunken, border line-strong, rounded-control
└──────────────────┘   value text-body tabular-nums ink; "cm" text-caption ink-muted, 10px from the right
```

- `<input type="text" inputmode="decimal">` inside a `<label>`, `w-field` by default or `flex-1` in rows. The visible label is the first word; accessible names follow the e2e contract: "Width (cm)", "Height (cm)", "Side (cm)", "Diameter (cm)", "X (cm)", "Y (cm)".
- Focus puts a 2px `focus` ring on the border (`outline-offset: -1px`, already set in `globals.css`). Values commit on Enter or blur; Esc reverts; focusing selects all.
- An invalid value gets `border-danger`, `aria-invalid` and a helper line below in `text-caption text-danger`, e.g. "Use 1–300 cm" with the real limits.

### 5.3 Mode switch (segmented control, radios)

- `role="radiogroup"` named "Mode", with `role="radio"` items "Arrange", "Photo" and "Grid origin". Arrow keys move the selection, and Tab lands on the checked item.
- **Hit boxes:** every radio element is itself at least 44×44, and the track has **no padding**. *Horizontal:* track `h-touch rounded-pill bg-surface-sunken`, items `relative h-touch px-3.5 rounded-pill`. *Vertical (landscape):* track `rounded-tile bg-surface-sunken`, items `relative size-[52px] rounded-tile` with the icon over a `text-micro font-stretch-semi-condensed` caption; the 52px track fits the 64px rail minus `px-1.5`.
- **Thumb (checked item):** a separate `absolute inset-[3px] bg-surface shadow-raised ring-1 ring-line` layer inside the checked radio (radius matches the item), behind its icon and label (`relative`). The 3px inset keeps the old 38px pill look while the hit box stays 44px or more. The checked label is `ink` 600 and the others `ink-muted` 500. The thumb moves between items with a shared `layoutId` on the `sheet` spring.

### 5.4 Selection bar

- **Order:** Duplicate (secondary, `duplicate` icon), Delete (secondary, `trash` icon, `text-danger`), then the fields: Width, Height, X, Y for rectangles; Side, X, Y for squares; Diameter, X, Y for circles.
- Field edits commit through the store's single commit path, push-apart included. Delete is not a filled red button, because it is frequent and undoable.
- **Landscape** adds a header (size readout plus Deselect ×) and makes Duplicate and Delete icon-only, with `aria-label` and `title`.
- Wrap the bar in `<section aria-label="Selected frame">`. On desktop both it and the palette show "Width (cm)", and the section lets tests and screen readers tell them apart.

### 5.5 Buttons

All buttons are `h-touch px-3.5 rounded-control text-ui font-medium`, with a 6px gap between icon and text.

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
│                 ────                 │ ┐ HEADER (fixed, touch-none): grab handle 36×4,
│ Settings                         [✕] │ ┘ rounded-pill, bg-line-strong; title + "Close settings"
├──────────────────────────────────────┤
│ Wall                                 │ ┐ BODY (scrolls): flex-1 min-h-0 overflow-y-auto
│ Width [300 cm]   Height [250 cm]     │ │ overscroll-contain touch-pan-y
│ Push gap [3 cm]                      │ │
│ Space kept between frames when they  │ │ text-caption ink-muted
│ push each other apart.               │ │
│ Grid                                 │ │ section titles: text-lead serif
│ Show grid                    ( ●)    │ │ switch rows, h-touch
│ Snap to grid                 ( ●)    │ │ (disabled while the grid is off)
│ Spacing X [20 cm]  Spacing Y [20 cm] │ │
│ [Set origin on the wall]             │ │ secondary; closes the sheet, enters Grid origin
│ Photo                                │ │
│ [Upload photo] / [Replace photo]     │ │ primary when empty, secondary when set
│ Show photo                   ( ●)    │ │
│ Opacity  ──────────●───────    60%   │ │
│ [Adjust photo]        Remove photo   │ │ Adjust → Photo mode; Remove → confirm (§4.6)
│ ──────────────────────────────────── │ │ border-t line + 24px
│ [Reset wall]                         │ ┘ last item IN the scroll; secondary, text-danger
└──────────────────────────────────────┘
```

- **Structure:** `flex flex-col`. The header (handle zone plus the 56px title row) never scrolls. The body holds every section and scrolls on its own (`overflow-y-auto overscroll-contain`, so scrolling never chains to the page). It is padded at the bottom with `pb-[calc(24px+var(--spacing-safe-bottom))]`. The content is about 800px tall, so it always scrolls in the 390px landscape sheet and usually in the bottom sheet.
- **Reset wall scrolls with the content** as the last item; it is not pinned. A destructive action shouldn't sit permanently under the thumb, and a pinned footer would take 68px of a 390px landscape sheet.
- **Stacked:** a bottom sheet over `scrim`. It opens at `min(content, 60dvh)`, so the wall stays visible above it, and can be dragged up to `85dvh`. **Dragging (resize and dismiss) works only from the header** (`touch-none`); the body only scrolls, so the two gestures never compete. Dragging the header down past 25% of the sheet height, flicking down, tapping the scrim or pressing Esc closes it.
- **Landscape:** a right side sheet, `w-sheet` plus the right safe area, full height (`h-dvh`), `rounded-l-sheet`, over `scrim-light`. It never drags; it closes with ✕, a scrim tap or Esc. The body scrolls as above.
- **Desktop:** the same sections sit in the right panel, without the handle or close button. The panel body uses the same `overflow-y-auto overscroll-contain`, with Reset wall last.
- **Phones:** use `role="dialog" aria-modal="true"` named "Settings". Trap focus while open, return focus to the settings button on close, and close on Esc.

### 5.7 Slider

- A native `<input type="range">`, restyled; the whole 44px row is the hit area. The readout is right-aligned, `text-ui ink-muted tabular-nums` (e.g. "60%").
- **Track:** 4px, `rounded-pill bg-surface-sunken` with a 1px `line-strong` inset ring; the filled part is `bg-accent`. **Thumb:** 22px, `bg-surface border-[1.5px] border-line-strong shadow-raised`, carrying the focus ring.

### 5.8 Toggle (switch)

- `<button role="switch" aria-checked>` with a 44×26 `rounded-pill` track. The whole row (label left, switch right, `h-touch`) is the hit target.
- **Off:** `bg-surface-sunken` with a 1.5px `line-strong` inset ring, knob on the left. **On:** `bg-accent`, knob on the right.
- **Knob:** 20px, `bg-surface shadow-raised`, moving over `duration-base ease-out-soft`. Its position is the non-color cue.

### 5.9 Toast

- **Style:** `bg-inverse text-on-inverse rounded-tile shadow-toast text-ui`, `max-w-[360px]` (on phones also capped at `calc(100vw - 24px)`), padding `10px 8px 10px 14px`. **Contents:** an 18px `alert` or `info` icon in `on-inverse-muted`, the message, an optional action in `text-accent-on-inverse` 600, and a Dismiss × (`size-touch`, `on-inverse-muted`).
- **Timing:** info toasts (`role="status"`) auto-dismiss after 5s, paused on hover or focus; errors (`role="alert"`) stay until dismissed. At most two stack, 8px apart, newest at the bottom. **Motion:** enters with y 12→0 plus a fade on the `sheet` spring; exits by fading over `duration-quick`.

### 5.10 Rotate hint (phone portrait only)

- A pill: `h-touch bg-surface shadow-float rounded-pill pl-3.5 pr-1 z-float`, containing the 18px `rotate` icon, "Rotate for a bigger wall" (`text-ui`) and a Dismiss ×. It sits at the bottom-center of the stage, 12px above the dock, and fades in 600ms after first load over `duration-slow`. Dismissal is remembered in `localStorage` (wrapped in try/catch), and the hint hides by itself in landscape.

### 5.11 Confirm dialog (Reset wall, Remove photo)

- `role="alertdialog"`, centered, `w-[min(360px,calc(100vw-32px))] bg-surface rounded-tile shadow-sheet p-5 z-dialog`, over `scrim`. **Title:** "Reset the wall?" (serif `text-title`). **Body:** `text-ui ink-muted`; suggested: "Every frame is removed and the wall goes back to its defaults." The exact scope is T10's. **Buttons**, right-aligned: Cancel (secondary, initial focus) and Reset wall (danger).

### 5.12 Snap guide

- A 2px line across the full wall in one axis, clipped to the wall, at `z-guides`, with `data-testid="snap-guide"`. At most two show, one per axis.
- **Style:** `bg-laser` with `box-shadow: 0 0 0 1px rgb(255 255 255 / .6), 0 0 8px 2px var(--color-laser-glow)`; the white edges keep it readable over photos. It fades in over 60ms when an axis engages and out over 120ms when it releases.

### 5.13 Grid lines, origin and wall dimensions

- **Grid:** an SVG `<pattern>` of 1px `grid` lines with `shape-rendering="crispEdges"`, offset so a line passes through the origin. Over a visible photo, each line gets a 3px `grid-halo` underlay. The two origin lines (x = originX, y = originY) use `grid-origin`.
- **Origin marker:** a 14px crosshair, 2.5px `accent` over 5.5px `halo`. In Grid origin mode it grows to 20px with a 4px center dot, and the wall cursor becomes `crosshair`. A tap sets the origin and plays one ring pulse: an accent ring scaling 0.6→1.6 while fading over 320ms (skipped under reduced motion).
- **Dimensions (desktop only):** "300 cm" centered 14px above the top edge, and "250 cm" rotated −90° 14px left of the left edge, in `text-caption ink-muted tabular-nums font-stretch-semi-condensed`. Each sits on a 1px `ink-muted/40` dimension line with 6px end ticks.

### 5.14 Wall surface and edge

- **Wall:** `bg-wall shadow-wall`. The shadow includes the 1px edge ring; there is no texture. In Arrange mode a photo is clipped to the wall at the user's opacity.
- **Photo mode:** the photo extends past the wall over the stage, and the part outside the wall is veiled with `photo-dim` (one way: an element on the wall rect with `box-shadow: 0 0 0 100vmax var(--color-photo-dim)`). The wall edge is drawn above the photo as a 1px `ink` line plus a 1px outer `halo` line, and the cursor is `move`.
- **Empty wall:** centered serif `text-lead ink-muted`, `max-w-[24ch] text-balance pointer-events-none`. It reads "Drag a frame onto the wall, or tap one to add it.", with "click" in place of "tap" under `can-hover:`.

### 5.15 Drag ghost (palette to wall)

- **Rendering:** a full frame (§3 anatomy), portalled to `body` at `z-ghost`, with `shadow-frame-lift` at `liftScale`. **Size:** starts at the tile glyph's rect and springs (`ghostFollow`) to the frame's **true on-wall size** at the current `pxPerCm`, so the user sees the real scale while dragging.
- **Position:** follows the pointer on `ghostFollow`, centered on the cursor for fine pointers. On coarse pointers the ghost's bottom edge sits `ghostTouchLiftPx` (12px) above the finger, so the thumb doesn't hide it; the drop lands where the ghost is drawn.
- **Over the wall:** opacity 1, with the same tilt, snapping and guides as a frame. **Off the wall:** opacity `ghostOffWallOpacity` (0.6), the rest shadow instead of lift and no tilt, signalling it will fly back.

---

## 6. Motion

All springs use motion's `{ type: "spring", stiffness, damping, mass }`, and during a drag only motion values change. The ζ (damping ratio) and settle times below come from simulating each spring from 0 to 1, settled within 2%.

### 6.1 Spring presets (`lib/physics.ts`; keep these names)

| Preset | stiffness | damping | mass | ζ | Overshoot | ~Settle | Drives |
|---|---|---|---|---|---|---|---|
| `lift` | 520 | 30 | 1 | 0.66 | 6% | 260ms | Scale to `liftScale`, lift-layer opacity |
| `tilt` | 200 | 13 | 1 | 0.46 | 20% | 590ms | Rotation following drag velocity (the nail swing) |
| `settle` | 360 | 32 | 1 | 0.84 | <1% | 220ms | x/y to the final spot on drop, scale back to 1, rubber-band return |
| `settleRotate` | 260 | 18 | 1 | 0.56 | 12% | 360ms | Rotation back to 0 on drop, with one small overshoot |
| `push` | 240 | 28 | 1.2 | 0.82 | 1% | 280ms | Neighbors sliding out of the way |
| `ghostFollow` | 700 | 46 | 0.6 | 1.12 | 0 | 210ms | Ghost position and size (≈65ms of lag) |
| `flyBack` | 380 | 32 | 0.8 | 0.92 | 0 | 225ms | Ghost returning to its tile |
| `popIn` | 460 | 26 | 1 | 0.61 | 9% | 275ms | Tap-to-add appearance (scale) |
| `remove` | 600 | 44 | 0.8 | 1.00 | 0 | 215ms | Delete shrink |
| `duplicate` | 340 | 24 | 1 | 0.65 | 7% | 325ms | Copy springing out to its free spot |
| `sheet` | 400 | 40 | 1 | 1.00 | 0 | 290ms | Sheets, segment thumb, toast entrance |

### 6.2 Scalars

| Name | Value | Notes |
|---|---|---|
| `liftScale` | 1.04 | |
| `tiltFactor` | 0.012 | Degrees per px/s of horizontal velocity: `rotate = clamp(−vx × tiltFactor, ±maxTiltDeg)` |
| `maxTiltDeg` | 8 | Tuned down from ≈10: on phone-sized frames 10° looks loose, while 8° still swings |
| `rubberBandFactor` | 0.35 | |
| `rubberBandMaxPx` | 30 | |
| `pushStaggerMs` | 30 | Per pushed frame, nearest to the anchor first, capped at 150ms total |
| `snapThresholdPx` | `{ fine: 8, coarse: 12 }` | Use `coarse` when `matchMedia('(pointer: coarse)')` matches |
| `snapHapticMs` | 8 | `navigator.vibrate?.(8)`, once per axis engage |

Additional constants (new names, may be added to `physics.ts`):
- `dragStartPx: { fine: 3, coarse: 6 }`: movement before a press becomes a drag; anything less is a tap.
- `ghostTouchLiftPx: 12`, `ghostOffWallOpacity: 0.6`, `popInFromScale: 0.6`, `removeToScale: 0.85`.
- `guideFadeInMs: 60`, `guideFadeOutMs: 120`, `photoModeFrameOpacity: 0.35`, `toastMs: 5000`.

**Rubber-band curve** (recommended for `rubberBand(overflowPx)`): `shown = maxPx × (1 − 1 / (1 + overflow × factor / maxPx))`. It matches `overflow × 0.35` for small pulls and approaches 30px smoothly, without a hard stop.

### 6.3 Choreography

- **Pick-up.** A plain press doesn't lift, so taps stay still. Once movement passes `dragStartPx`, the frame selects, jumps to `z-frame-lifted`, and scales to `liftScale` with the lift layer fading in on `lift`.
- **Drag and tilt.** Position tracks the pointer 1:1 from the grab point. Rotation follows `tilt` toward `−vx × tiltFactor` with `transform-origin: 50% 0%`, so the frame swings from its top center like it hangs on a nail, then swings back about 1.5 times when the pointer stops.
- **Snap engage.** Within `snapThresholdPx` of a grid line, that axis offset applies directly; the jump is at most 12px, which reads as a magnet. The laser guide fades in (60ms) and `vibrate(snapHapticMs)` fires. Moving past the threshold releases the axis without a lock, and the guide fades out (120ms).
- **Drop and settle.** The store computes the final spot (snap, clamp, push-apart). x/y spring there on `settle`, scale returns to 1 on `settle`, and rotation returns to 0 on `settleRotate` with one small overshoot. The lift layer and guides fade out.
- **Rubber-band.** Past a wall edge the frame follows the curve above, as if pulled against elastic, and on release it springs back inside on `settle`. Tilt still applies.
- **Push-apart.** Each moved neighbor slides on `push`, starting `pushStaggerMs × rank` after the anchor lands, nearest first, with the nudge layer showing while it moves. The anchor never moves.
- **Palette ghost and fly-back.** The ghost grows from the tile glyph to its true size while following the finger on `ghostFollow`. Dropped on the wall, it hands off to a real frame at the same rect with no pop (`settle` from `liftScale` to 1, `settleRotate` to 0). Dropped off the wall, it flies back to the glyph rect on `flyBack`, shrinking and fading out over the last 120ms, and the tile pulses from 0.97 to 1 over `duration-quick`.
- **Pop-in (tap to add).** The frame appears at its free spot, scaling from `popInFromScale` to 1 on `popIn` while opacity fades in over 120ms. The lift layer starts at 1 and fades to 0, as if the frame is being placed against the wall.
- **Delete.** The frame shrinks to `removeToScale` on `remove` and fades out over 140ms, then unmounts (`AnimatePresence`). Neighbors stay put, and the context panel cross-fades back to the palette.
- **Duplicate.** The copy mounts exactly over the original at `liftScale`, with the lift layer showing. It springs to its free spot on `duplicate` and settles to scale 1, and any pushes follow. The copy becomes selected, so repeated Duplicates walk copies across the wall.

### 6.4 Reduced motion (`useReducedMotion()` is true)

| Behavior | Reduced variant |
|---|---|
| Tilt | Off: rotation is always 0 (no `tilt`, no `settleRotate`) |
| Lift | `liftScale` = 1; shadow-layer opacity tweens over 120ms |
| Settle, push, rubber-band return, duplicate travel, fly-back | 160ms tween (`duration-reduced`), `ease-out-soft`, no overshoot |
| `pushStaggerMs` | 0 |
| Ghost | Tracks the pointer directly (no `ghostFollow` lag); size changes instantly |
| Pop-in / delete | Opacity only, 120ms (`duration-reduced-short`); no scale |
| Sheet / toast | 200ms tween (`duration-reduced-long`) / 160ms fade |
| Snap guide, haptic | Unchanged |
| Origin pulse, rotate-hint fade | Skipped (instant) |

Encode these in `physics.ts` as `reducedMotion = { tweenShortMs: 120, tweenMs: 160, tweenLongMs: 200, ease: [0.2, 0.8, 0.2, 1] }`.

---

## 7. Accessibility

**Contrast** (WCAG 2.x, measured):

| Pair | Ratio | Need |
|---|---|---|
| `ink` on `surface` / `wall` / `stage` / `aperture` | 15.6 / 14.6 / 10.4 / 13.0 | 4.5 |
| `ink-muted` on `surface` / `stage` / `surface-sunken` / `aperture` | 7.4 / 4.9 / 6.5 / 6.1 | 4.5 |
| `on-accent` on `accent` | 7.9 | 4.5 |
| `accent` on `surface` / `wall` / `accent-soft` | 7.6 / 7.2 / 6.5 | 4.5 for text, 3 for marks |
| `danger` on `surface` / `danger-soft`; `on-danger` on `danger` | 6.4 / 5.5 / 6.6 | 4.5 |
| `on-inverse` / `accent-on-inverse` / `on-inverse-muted` on `inverse` | 13.3 / 7.8 / 7.9 | 4.5 |
| `line-strong` on `surface` / `surface-sunken` (control borders) | 3.8 / 3.4 | 3 |
| `wall-edge` on `wall` | 3.6 | 3 |
| `laser` on `wall` (plus white edges and glow over photos) | 3.6 | 3 |

Grid lines (about 1.5:1) are deliberately quiet. They are a decorative aid; the guide and the frame's motion convey snapping.

- **Focus.** `:focus-visible` gives a global 2px `focus` outline at 2px offset; text fields draw it on their border. Frames use a 2px *dashed* outline at 3px offset, so focus is never confused with the selection brackets. Never remove an outline without a replacement.
- **Hit areas.** Every control is at least 44×44. A frame smaller than 44px on screen gets an invisible `::before` hit extension, centered and at least 44×44; where extensions overlap, the later (top) frame wins. Palette tiles and frames use `touch-none`.
- **Selection is not color alone.** Brackets are a shape. Frames are `role="button"`, with `aria-pressed` reflecting selection and an `aria-label` like "Rectangle 40 × 50 cm", plus the `data-*` e2e attributes. Arrow keys nudge, Delete removes and Esc deselects.
- **Names.** Icon buttons: "Undo", "Redo", "Settings", "Close settings", "Duplicate", "Delete", "Deselect", "Dismiss", "Replace photo", "Show photo" (toggle with `aria-pressed`), "Remove photo". Mode radios: "Arrange", "Photo", "Grid origin". Undo and Redo are truly `disabled` when unavailable, not just recolored.
- **Live regions.** Toasts use `role="status"` or `role="alert"`. Add, delete and duplicate are announced in a visually hidden `aria-live="polite"` region: "Frame added", "Frame deleted", "Frame duplicated".
- **Motion.** §6.4 applies in full. Only the toast, the hint fade and the origin pulse move without direct manipulation, and all three are reduced.

---

## 8. Copy (sentence case, no exclamation marks)

| Where | Text |
|---|---|
| Empty wall | "Drag a frame onto the wall, or tap one to add it." ("click" on fine pointers) |
| Rotate hint | "Rotate for a bigger wall" |
| Grid origin tools | "Tap the wall where the grid should start." / "Reset to corner" / "Done" |
| Photo tools, no photo | "Add a photo of your wall to line frames up with it." / "Upload photo" |
| Push gap helper | "Space kept between frames when they push each other apart." |
| Toast: storage full | "Storage is full, so changes aren't being saved. They stay until you close this tab." |
| Toast: data recovered | "Saved data couldn't be read, so the wall started fresh. A backup was kept." |
| Toast: no IndexedDB | "Photos can't be saved in this browser. Your photo stays until you close this tab." |
| Reset dialog | "Reset the wall?" / "Cancel" / "Reset wall" |

An action keeps its name everywhere. The Duplicate button is announced as "Frame duplicated", and the Reset wall button opens a dialog whose confirm button is also "Reset wall".
