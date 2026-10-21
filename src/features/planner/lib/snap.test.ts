import { describe, expect, it } from "vitest";
import { DEFAULT_GRID } from "../defaults";
import type { Grid } from "../types";
import { snapPosition } from "./snap";

const grid: Grid = { ...DEFAULT_GRID, enabled: true, snap: true }; // 10 cm spacing, origin 0
const PX_PER_CM = 2;
const THRESHOLD_PX = 8; // = 4 cm at 2 px/cm

// With 10 cm lines, an edge at 5 mod 10 is 5 cm from every line (> 4 cm threshold).
// Rects with y: 5, h: 20 (all of top/middle/bottom at 5 mod 10) therefore never snap on y,
// and rects with x: 5, w: 20 never snap on x. Used to isolate one axis.
const NO_Y = { y: 5, h: 20 };
const NO_X = { x: 5, w: 20 };

describe("snapPosition", () => {
  it("returns the position unchanged with no guides when the grid is disabled", () => {
    const r = snapPosition({ x: 11, y: 12, w: 20, h: 20 }, { ...grid, enabled: false }, PX_PER_CM, THRESHOLD_PX);
    expect(r).toEqual({ x: 11, y: 12, guides: [] });
  });

  it("returns the position unchanged with no guides when snap is off", () => {
    const r = snapPosition({ x: 11, y: 12, w: 20, h: 20 }, { ...grid, snap: false }, PX_PER_CM, THRESHOLD_PX);
    expect(r).toEqual({ x: 11, y: 12, guides: [] });
  });

  it("does not snap when every edge is farther than the threshold", () => {
    const r = snapPosition({ x: 5, w: 20, ...NO_Y }, grid, PX_PER_CM, THRESHOLD_PX);
    expect(r).toEqual({ x: 5, y: 5, guides: [] });
  });

  describe("x axis", () => {
    it("snaps the left edge when it is the nearest candidate", () => {
      // left 11.5 -> 10 (d=-1.5); center 28 -> 30 (d=+2); right 44.5 -> 40 (d=-4.5)
      const r = snapPosition({ x: 11.5, w: 33, ...NO_Y }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.x).toBe(10);
      expect(r.y).toBe(5);
      expect(r.guides).toEqual([{ axis: "x", position: 10 }]);
    });

    it("snaps the center when it is the nearest candidate", () => {
      // left 12.5 -> 10 (d=-2.5); center 20.5 -> 20 (d=-0.5); right 28.5 -> 30 (d=+1.5)
      const r = snapPosition({ x: 12.5, w: 16, ...NO_Y }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.x).toBe(12);
      expect(r.guides).toEqual([{ axis: "x", position: 20 }]);
    });

    it("snaps the right edge when it is the nearest candidate", () => {
      // left 3 -> 0 (d=-3); center 11.5 -> 10 (d=-1.5); right 20 -> 20 (d=0)
      const r = snapPosition({ x: 3, w: 17, ...NO_Y }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.x).toBe(3);
      expect(r.guides).toEqual([{ axis: "x", position: 20 }]);
    });

    it("picks the earlier candidate on a tie", () => {
      // left 2 -> 0 (d=-2); center 7 -> 10 (d=+3); right 12 -> 10 (d=-2): left and right tie
      const r = snapPosition({ x: 2, w: 10, ...NO_Y }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.x).toBe(0);
      expect(r.guides).toEqual([{ axis: "x", position: 0 }]);
    });

    it("treats float noise as a tie, so the earlier candidate still wins", () => {
      // x=1.7, w=20: left d is 1.7 but center and right compute to 1.6999999999999993
      const r = snapPosition({ x: 1.7, w: 20, ...NO_Y }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.guides).toEqual([{ axis: "x", position: 0 }]);
      expect(r.x).toBeCloseTo(0, 10);
    });
  });

  describe("y axis", () => {
    it("snaps the top edge when it is the nearest candidate", () => {
      const r = snapPosition({ y: 11.5, h: 33, ...NO_X }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.y).toBe(10);
      expect(r.x).toBe(5);
      expect(r.guides).toEqual([{ axis: "y", position: 10 }]);
    });

    it("snaps the middle when it is the nearest candidate", () => {
      const r = snapPosition({ y: 12.5, h: 16, ...NO_X }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.y).toBe(12);
      expect(r.guides).toEqual([{ axis: "y", position: 20 }]);
    });

    it("snaps the bottom edge when it is the nearest candidate", () => {
      const r = snapPosition({ y: 3, h: 17, ...NO_X }, grid, PX_PER_CM, THRESHOLD_PX);
      expect(r.y).toBe(3);
      expect(r.guides).toEqual([{ axis: "y", position: 20 }]);
    });
  });

  it("snaps both axes independently and reports the x guide before the y guide", () => {
    // x: left 31 -> 30 (d=-1) wins; y: top 52 -> 50 (d=-2) wins over middle (-2.5) and bottom (-3)
    const r = snapPosition({ x: 31, y: 52, w: 33, h: 21 }, grid, PX_PER_CM, THRESHOLD_PX);
    expect(r).toEqual({
      x: 30,
      y: 50,
      guides: [
        { axis: "x", position: 30 },
        { axis: "y", position: 50 },
      ],
    });
  });

  it("snaps only the axis that is within the threshold", () => {
    const r = snapPosition({ x: 11.5, w: 33, ...NO_Y }, grid, PX_PER_CM, THRESHOLD_PX);
    expect(r.guides.map((g) => g.axis)).toEqual(["x"]);
    expect(r.y).toBe(5);
  });

  describe("threshold", () => {
    const wide = { ...grid, spacingX: 100, spacingY: 100 };

    it("snaps at exactly the threshold", () => {
      // left 4 -> 0: d=-4 = 4 cm threshold
      const r = snapPosition({ x: 4, y: 50, w: 1, h: 1 }, wide, PX_PER_CM, THRESHOLD_PX);
      expect(r.x).toBe(0);
      expect(r.guides).toEqual([{ axis: "x", position: 0 }]);
    });

    it("does not snap just past the threshold", () => {
      const r = snapPosition({ x: 4.5, y: 50, w: 1, h: 1 }, wide, PX_PER_CM, THRESHOLD_PX);
      expect(r).toEqual({ x: 4.5, y: 50, guides: [] });
    });

    it("is stateless: moving past the threshold releases the axis", () => {
      const held = snapPosition({ x: 3, y: 50, w: 1, h: 1 }, wide, PX_PER_CM, THRESHOLD_PX);
      const released = snapPosition({ x: 5, y: 50, w: 1, h: 1 }, wide, PX_PER_CM, THRESHOLD_PX);
      expect(held.x).toBe(0);
      expect(released.x).toBe(5);
      expect(released.guides).toEqual([]);
    });

    it("converts the pixel threshold to cm with pxPerCm", () => {
      // spacing 20; left 14, center 14.5, right 15 are 6, 5.5 and 5 cm from the line at 20,
      // so the right edge is nearest (d=+5): x -> 19.
      const rect = { x: 14, y: 50, w: 1, h: 1 };
      const g = { ...grid, spacingX: 20, spacingY: 100 };
      const loose = snapPosition(rect, g, 1, 8); // 8 px = 8 cm
      expect(loose.x).toBe(19);
      expect(loose.guides).toEqual([{ axis: "x", position: 20 }]);
      expect(snapPosition(rect, g, 4, 8)).toEqual({ x: 14, y: 50, guides: [] }); // 8 px = 2 cm
    });
  });

  describe("grid geometry", () => {
    it("honors the grid origin on both axes", () => {
      // x lines at 3 + 10k: left 12 -> 13 (d=+1) wins; y lines at 7 + 10k: top 18 -> 17 (d=-1) wins
      const g = { ...grid, originX: 3, originY: 7 };
      const r = snapPosition({ x: 12, y: 18, w: 33, h: 33 }, g, PX_PER_CM, THRESHOLD_PX);
      expect(r).toEqual({
        x: 13,
        y: 17,
        guides: [
          { axis: "x", position: 13 },
          { axis: "y", position: 17 },
        ],
      });
    });

    it("finds lines on the near side of an origin that lies beyond the first line", () => {
      // x lines at 95 + 10k = ..., 5, 15, 25; left 6 -> 5
      const g = { ...grid, originX: 95 };
      const r = snapPosition({ x: 6, w: 1, ...NO_Y }, g, PX_PER_CM, THRESHOLD_PX);
      expect(r.x).toBe(5);
      expect(r.guides).toEqual([{ axis: "x", position: 5 }]);
    });

    it("uses separate spacing for x and y", () => {
      const g = { ...grid, spacingX: 50, spacingY: 5 };
      // x: left 49 -> 50 (d=+1); y lines at 0, 5, 10: top 11 -> 10 (d=-1)
      const r = snapPosition({ x: 49, y: 11, w: 40, h: 1 }, g, PX_PER_CM, THRESHOLD_PX);
      expect(r).toEqual({
        x: 50,
        y: 10,
        guides: [
          { axis: "x", position: 50 },
          { axis: "y", position: 10 },
        ],
      });
    });
  });

  describe("invalid input", () => {
    it("skips both axes when their spacing is <= 0", () => {
      const g = { ...grid, spacingX: 0, spacingY: -5 };
      const r = snapPosition({ x: 11, y: 12, w: 20, h: 20 }, g, PX_PER_CM, THRESHOLD_PX);
      expect(r).toEqual({ x: 11, y: 12, guides: [] });
    });

    it("still snaps the other axis when only one spacing is <= 0", () => {
      const g = { ...grid, spacingX: 0 };
      const r = snapPosition({ x: 11.5, y: 11.5, w: 33, h: 33 }, g, PX_PER_CM, THRESHOLD_PX);
      expect(r.x).toBe(11.5);
      expect(r.y).toBe(10);
      expect(r.guides).toEqual([{ axis: "y", position: 10 }]);
    });

    it("leaves the rect alone when pxPerCm is not positive", () => {
      const r = snapPosition({ x: 11, y: 12, w: 20, h: 20 }, grid, 0, THRESHOLD_PX);
      expect(r).toEqual({ x: 11, y: 12, guides: [] });
    });
  });

  it("does not mutate its inputs", () => {
    const rect = { x: 11, y: 12, w: 20, h: 20 };
    const g = { ...grid };
    snapPosition(rect, g, PX_PER_CM, THRESHOLD_PX);
    expect(rect).toEqual({ x: 11, y: 12, w: 20, h: 20 });
    expect(g).toEqual({ ...DEFAULT_GRID, enabled: true, snap: true });
  });
});
