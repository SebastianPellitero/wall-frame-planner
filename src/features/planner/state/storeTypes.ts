import type { Background, Grid, Mode, PersistedSlice, Point, Shape, ShapeKind, Wall } from "../types";

export interface PlannerUiSlice {
  selectedId: string | null;
  mode: Mode;
  paletteKind: ShapeKind;
}

export interface PlannerActions {
  /** `at` is the desired center (palette drop); without it the shape goes to the nearest free spot to the wall center. */
  addShape(kind: ShapeKind, at?: Point, opts?: { select?: boolean }): string;
  /** The single commit path for drag-drop, nudges and numeric edits. No-op for an unknown id. */
  commitShape(id: string, patch: Partial<Pick<Shape, "x" | "y" | "w" | "h">>): void;
  duplicateShape(id: string): string | null;
  deleteShape(id: string): void;
  select(id: string | null): void;
  setMode(mode: Mode): void;
  setPaletteKind(kind: ShapeKind): void;
  setPaletteSize(kind: ShapeKind, size: { w: number; h: number }): void;
  setWall(patch: Partial<Wall>): void;
  setGrid(patch: Partial<Grid>): void;
  setGridOrigin(point: Point): void;
  setBackground(patch: Partial<Background>): void;
  /** Back to defaults, with the undo history cleared. */
  resetProject(): void;
}

export type PlannerState = PersistedSlice & PlannerUiSlice & PlannerActions;
