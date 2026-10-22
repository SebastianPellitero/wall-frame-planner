import { describe, expect, it } from "vitest";
import {
  centerFocusOn,
  clampFocus,
  focusBounds,
  panFocus,
  photoLayout,
  stepFocus,
  stepZoom,
  zoomPhotoAt,
  FOCUS_STEP,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./framePhoto";

// A 2:1 landscape image (aspect = h / w = 0.5), centered at cover.
const wide = { aspect: 0.5, zoom: 1, focusX: 0.5, focusY: 0.5 };
const square = { w: 100, h: 100 };

describe("photoLayout", () => {
  it("covers the opening at zoom 1, centered on the focus", () => {
    expect(photoLayout(100, 100, wide)).toEqual({ width: 200, height: 100, left: -50, top: 0 });
    // A square image in a portrait opening: the height decides the cover size.
    expect(photoLayout(100, 200, { ...wide, aspect: 1 })).toEqual({ width: 200, height: 200, left: -50, top: 0 });
  });

  it("scales the cover size by zoom", () => {
    expect(photoLayout(100, 100, { ...wide, zoom: 2 })).toEqual({ width: 400, height: 200, left: -150, top: -50 });
  });

  it("clamps so no empty band shows", () => {
    expect(photoLayout(100, 100, { ...wide, focusX: 0, focusY: 0 })).toMatchObject({ left: 0, top: 0 });
    expect(photoLayout(100, 100, { ...wide, focusX: 1, focusY: 1 })).toMatchObject({ left: -100, top: 0 });
  });

  it("stays finite for an empty opening", () => {
    expect(photoLayout(0, 0, wide)).toEqual({ width: 0, height: 0, left: 0, top: 0 });
  });
});

describe("focusBounds / clampFocus", () => {
  it("is the focus range that keeps the opening covered", () => {
    expect(focusBounds(wide, square)).toEqual({ minX: 0.25, maxX: 0.75, minY: 0.5, maxY: 0.5 });
    expect(focusBounds({ ...wide, zoom: 2 }, square)).toEqual({ minX: 0.125, maxX: 0.875, minY: 0.25, maxY: 0.75 });
  });

  it("clamps the stored focus into that range", () => {
    expect(clampFocus({ ...wide, focusX: 0, focusY: 0.9 }, square)).toEqual({ focusX: 0.25, focusY: 0.5 });
  });
});

describe("panFocus", () => {
  it("moves the image with the pointer: dragging right shows more of the left", () => {
    expect(panFocus(wide, 20, 10, square)).toEqual({ focusX: 0.4, focusY: 0.5 });
  });

  it("clamps to the covered range", () => {
    expect(panFocus(wide, -500, 0, square).focusX).toBe(0.75);
  });

  it("starts from the visible crop, so an out-of-range focus has no dead zone", () => {
    expect(panFocus({ ...wide, focusX: 0 }, -20, 0, square).focusX).toBeCloseTo(0.35, 10);
  });
});

describe("centerFocusOn", () => {
  it("puts the tapped image point at the center of the opening", () => {
    expect(centerFocusOn(wide, { x: 75, y: 50 }, square)).toEqual({ focusX: 0.625, focusY: 0.5 });
    expect(centerFocusOn({ ...wide, zoom: 2 }, { x: 0, y: 0 }, square)).toEqual({ focusX: 0.375, focusY: 0.25 });
  });

  it("clamps near the edges", () => {
    expect(centerFocusOn(wide, { x: 100, y: 0 }, square)).toEqual({ focusX: 0.75, focusY: 0.5 });
  });
});

describe("zoomPhotoAt", () => {
  it("zooms about the opening's center by default, keeping the focus and re-clamping it", () => {
    expect(zoomPhotoAt({ ...wide, focusX: 0.6 }, 2, square)).toEqual({ zoom: 2, focusX: 0.6, focusY: 0.5 });
    expect(zoomPhotoAt({ ...wide, zoom: 2, focusY: 0.3 }, 1, square)).toEqual({ zoom: 1, focusX: 0.5, focusY: 0.5 });
  });

  it("keeps the image point under `point` in place (pinch midpoint)", () => {
    const next = zoomPhotoAt(wide, 2, square, { x: 0, y: 50 });
    expect(next).toEqual({ zoom: 2, focusX: 0.375, focusY: 0.5 });
    const after = photoLayout(100, 100, { ...wide, ...next });
    expect((0 - after.left) / after.width).toBeCloseTo(0.25, 10);
  });

  it("clamps zoom to 1–4", () => {
    expect(zoomPhotoAt(wide, 9, square).zoom).toBe(ZOOM_MAX);
    expect(zoomPhotoAt(wide, 0.2, square).zoom).toBe(ZOOM_MIN);
  });
});

describe("keyboard steps (§5.17)", () => {
  it("stepFocus moves the focus by a fraction of the image in that direction, clamped", () => {
    expect(stepFocus(wide, FOCUS_STEP, 0, square).focusX).toBeCloseTo(0.52, 10);
    expect(stepFocus(wide, 0, -FOCUS_STEP, square).focusY).toBe(0.5);
    expect(stepFocus(wide, 1, 0, square).focusX).toBe(0.75);
  });

  it("stepZoom moves by 0.1 within 1–4, without float drift", () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1.2, 1)).toBe(1.3);
    expect(stepZoom(3.95, 1)).toBe(4);
    expect(stepZoom(1, -1)).toBe(1);
  });
});
