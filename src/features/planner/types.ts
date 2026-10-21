export type ShapeKind = "rect" | "square" | "circle";

/** Top-left corner (x, y) and size (w, h) in cm, relative to the wall's top-left. square/circle: w === h (circle: diameter). */
export interface Shape {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  width: number;
  height: number;
  pushGap: number;
}

export interface Grid {
  enabled: boolean;
  snap: boolean;
  spacingX: number;
  spacingY: number;
  originX: number;
  originY: number;
}

/** Background photo placement in wall cm. height = width * aspect. */
export interface Background {
  hasImage: boolean;
  x: number;
  y: number;
  width: number;
  aspect: number;
  opacity: number;
  visible: boolean;
}

export interface Project {
  version: 1;
  wall: Wall;
  grid: Grid;
  background: Background;
  shapes: Shape[];
}

export type Mode = "arrange" | "photo" | "gridOrigin";
