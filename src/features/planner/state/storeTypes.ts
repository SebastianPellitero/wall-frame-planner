import type { Background, FramePhoto, Grid, Mode, PersistedSlice, Point, Shape, ShapeKind, Wall } from "../types";

export interface PlannerUiSlice {
  selectedId: string | null;
  mode: Mode;
  /**
   * Frames the last add, commit or duplicate pushed out of the way, nearest to the anchor
   * first: the push-apart stagger order. Not persisted and not in history; any other change
   * to `shapes` (undo, delete, wall resize) clears it.
   */
  pushedIds: string[];
}

/** Frame photo and mat (design-system.md §3.8, §5.17). Each is one undo step; a call that changes nothing records none. */
export interface FramePhotoActions {
  /** Add or Replace: the new image at cover, centered (zoom 1, focus 0.5 / 0.5). */
  setFramePhoto(id: string, image: Pick<FramePhoto, "imageId" | "aspect">): void;
  /** Adjust mode's commit: zoom clamped 1–4, focus 0–1. No-op for a frame without a photo. */
  adjustFramePhoto(id: string, patch: Partial<Pick<FramePhoto, "zoom" | "focusX" | "focusY">>): void;
  /** Remove: the image stays stored, so undo can bring it back. */
  clearFramePhoto(id: string): void;
  setMat(id: string, on: boolean): void;
  /** Drops a photo whose image is gone from every frame using it. Not an undo step. */
  forgetFramePhoto(imageId: string): void;
}

export interface PlannerActions extends FramePhotoActions {
  /**
   * Adds a frame of the creator's size for `kind` in the creator color, then rolls a new creator
   * color (§5.1). `at` is the desired center (drop); without it the frame goes to the nearest
   * free spot to the wall center.
   */
  addShape(kind: ShapeKind, at?: Point, opts?: { select?: boolean }): string;
  /** The single commit path for drag-drop, nudges and numeric edits. No-op for an unknown id. */
  commitShape(id: string, patch: Partial<Pick<Shape, "x" | "y" | "w" | "h">>): void;
  duplicateShape(id: string): string | null;
  deleteShape(id: string): void;
  select(id: string | null): void;
  setMode(mode: Mode): void;
  setPaletteKind(kind: ShapeKind): void;
  /** Frame creator Generate (§5.1): the kind's size (clamped to the wall) becomes current and the creator color is re-rolled. */
  generate(kind: ShapeKind, size: { w: number; h: number }): void;
  /** Resizes or repaints the wall (an invalid color is ignored); frames and creator sizes shrink and move to fit. Not an undo step. */
  setWall(patch: Partial<Wall>): void;
  /** Shrinks and moves frames to fit the current wall (after undo/redo). Not an undo step. */
  fitToWall(): void;
  setGrid(patch: Partial<Grid>): void;
  setGridOrigin(point: Point): void;
  setBackground(patch: Partial<Background>): void;
  /** Back to defaults, with the undo history cleared. */
  resetProject(): void;
}

export type PlannerState = PersistedSlice & PlannerUiSlice & PlannerActions;
