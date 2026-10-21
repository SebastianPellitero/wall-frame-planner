# User UI sketch (2026-10-22)

This is the user's own wireframe, drawn in Excalidraw and transcribed here. Coordinates are in sketch units; the outer container is 2752×1360.

## Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Frame creator              ┌────────────────────────────────────────────────┐│
│            ┌────────────┐   │  |       |       |       |  ┌──┐  |           ││
│            │  ┌──────┐  │   │──┼───────┼───────┼───────┼──└──┘──┼───────────││ green = grid ("matrix")
│ High: [ ]  │  │      │  │   │  |       |       |       |        |           ││ orange = frames (outer
│            │  └──────┘  │   │──┼───────┼───────┼───────┼────────┼───────────││ moulding + inner opening)
│            └────────────┘   │  |       |       |       |        |           ││
│             width: [ ]      │──┼───────┼───────┼───────┼────────┼───────────││
│            [ Generate ]     │  |       |       |       |        |           ││
│                             │──┼───────┼───────┼───────┼────────┼───────────││
│  Matrix control             │  |       |       |       |        |           ││
│  Hight: [ ]                 │──┼───────┼───────┼───────┼────────┼───────────││
│  Width: [ ]                 │  |       |       |       |        |           ││
│  [ Turn on and off button ] └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
   left column ≈ 31%                       canvas (the wall) ≈ 67%
```

## What the user said
- "The green lines are the matrix, the orange are the frame created in that generator that can be dragged into the canvas, and then the canvas with everything."
- "I need to have the frames more rectangular edges, but the color can be random."

## Decisions confirmed with the user
- The Frame creator keeps **rectangle, square and circle** through a small shape picker. Square locks height = width; circle uses a diameter.
- Each frame's color is **random from a curated set** of about 10 pleasant, distinct frame colors (woods, black, white, brass, muted colors) that read well over a wall photo.
- Frames have **square corners** with no rounding.

## Element facts from the sketch
- Frame creator: a title, a preview box (512×402) holding a frame (outer 254×266, inner 192×208), a "High:" input to the left of the preview, a "width:" input under the preview, and a "Generate" button (220×110).
- Matrix control: a title, "Hight:" and "Width:" inputs (grid spacing), and a "Turn on and off" button (378×72).
- The canvas (1850×1184) has about 7 horizontal and 5 vertical grid lines with frames placed on it.
