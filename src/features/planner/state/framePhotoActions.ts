import { ZOOM_MAX, ZOOM_MIN } from "../lib/framePhoto";
import { clamp } from "../lib/geometry";
import type { Shape } from "../types";
import type { FramePhotoActions, PlannerState } from "./storeTypes";
import type { History } from "./actions";

type Set = (partial: Partial<PlannerState>) => void;
type Get = () => PlannerState;

function withoutPhoto(shape: Shape): Shape {
  const next = { ...shape };
  delete next.photo;
  return next;
}

/**
 * Frame photo and mat actions (design-system.md §3.8, §5.17). Each change is one history step:
 * undo covers frames, and a frame's photo and mat are part of it. A call that would change
 * nothing records nothing.
 */
export function createFramePhotoActions(set: Set, get: Get, history: History): FramePhotoActions {
  /** Replaces frame `id` with `fn(frame)`; an unknown id or an unchanged result is a no-op. */
  const update = (id: string, fn: (shape: Shape) => Shape) => {
    const { shapes } = get();
    const current = shapes.find((s) => s.id === id);
    if (!current) return;
    const next = fn(current);
    if (next !== current) set({ shapes: shapes.map((s) => (s.id === id ? next : s)) });
  };

  return {
    setFramePhoto(id, { imageId, aspect }) {
      if (imageId === "" || !Number.isFinite(aspect) || aspect <= 0) return;
      update(id, (s) => ({ ...s, photo: { imageId, aspect, zoom: 1, focusX: 0.5, focusY: 0.5 } }));
    },

    adjustFramePhoto(id, patch) {
      update(id, (s) => {
        if (!s.photo) return s;
        const zoom = clamp(patch.zoom ?? s.photo.zoom, ZOOM_MIN, ZOOM_MAX);
        const focusX = clamp(patch.focusX ?? s.photo.focusX, 0, 1);
        const focusY = clamp(patch.focusY ?? s.photo.focusY, 0, 1);
        const p = s.photo;
        if (zoom === p.zoom && focusX === p.focusX && focusY === p.focusY) return s;
        return { ...s, photo: { ...p, zoom, focusX, focusY } };
      });
    },

    clearFramePhoto(id) {
      update(id, (s) => (s.photo ? withoutPhoto(s) : s));
    },

    setMat(id, on) {
      update(id, (s) => (s.mat === on ? s : { ...s, mat: on }));
    },

    forgetFramePhoto(imageId) {
      const { shapes } = get();
      if (!shapes.some((s) => s.photo?.imageId === imageId)) return;
      const next = shapes.map((s) => (s.photo?.imageId === imageId ? withoutPhoto(s) : s));
      history.untracked(() => set({ shapes: next }));
    },
  };
}
