import { DEFAULT_BACKGROUND, DEFAULT_GRID, DEFAULT_PALETTE_SIZES, DEFAULT_WALL } from "../defaults";
import { clamp, clampSize, clampToWall, round1 } from "../lib/geometry";
import type { Background, Grid, PersistedSlice, Shape, ShapeKind, Wall } from "../types";

const KINDS: readonly ShapeKind[] = ["rect", "square", "circle"];

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

function sanitizeWall(raw: unknown): Wall {
  const o = isObj(raw) ? raw : {};
  return {
    width: Math.max(10, num(o.width, DEFAULT_WALL.width)),
    height: Math.max(10, num(o.height, DEFAULT_WALL.height)),
    pushGap: clamp(num(o.pushGap, DEFAULT_WALL.pushGap), 0, 50),
  };
}

function sanitizeGrid(raw: unknown, wall: Wall): Grid {
  const o = isObj(raw) ? raw : {};
  return {
    enabled: bool(o.enabled, DEFAULT_GRID.enabled),
    snap: bool(o.snap, DEFAULT_GRID.snap),
    spacingX: Math.max(0.5, num(o.spacingX, DEFAULT_GRID.spacingX)),
    spacingY: Math.max(0.5, num(o.spacingY, DEFAULT_GRID.spacingY)),
    originX: round1(clamp(num(o.originX, DEFAULT_GRID.originX), 0, wall.width)),
    originY: round1(clamp(num(o.originY, DEFAULT_GRID.originY), 0, wall.height)),
  };
}

function sanitizeBackground(raw: unknown): Background {
  const o = isObj(raw) ? raw : {};
  const aspect = num(o.aspect, DEFAULT_BACKGROUND.aspect);
  return {
    hasImage: bool(o.hasImage, DEFAULT_BACKGROUND.hasImage),
    x: num(o.x, DEFAULT_BACKGROUND.x),
    y: num(o.y, DEFAULT_BACKGROUND.y),
    width: Math.max(1, num(o.width, DEFAULT_BACKGROUND.width)),
    aspect: aspect > 0 ? aspect : DEFAULT_BACKGROUND.aspect,
    opacity: clamp(num(o.opacity, DEFAULT_BACKGROUND.opacity), 0, 1),
    visible: bool(o.visible, DEFAULT_BACKGROUND.visible),
  };
}

function sanitizeShapes(raw: unknown, wall: Wall): Shape[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Shape[] = [];
  for (const item of raw) {
    if (!isObj(item)) continue;
    const { id, kind, x, y, w, h } = item;
    if (typeof id !== "string" || id === "" || seen.has(id)) continue;
    if (!KINDS.includes(kind as ShapeKind)) continue;
    if (![x, y, w, h].every((v) => typeof v === "number" && Number.isFinite(v))) continue;
    const size = clampSize(kind as ShapeKind, w as number, h as number, wall);
    const pos = clampToWall({ x: x as number, y: y as number, ...size }, wall);
    seen.add(id);
    out.push({ id, kind: kind as ShapeKind, x: round1(pos.x), y: round1(pos.y), ...size });
  }
  return out;
}

function sanitizePalette(raw: unknown, wall: Wall): PersistedSlice["paletteSizes"] {
  const o = isObj(raw) ? raw : {};
  const one = (kind: ShapeKind) => {
    const v = isObj(o[kind]) ? o[kind] : {};
    const fallback = DEFAULT_PALETTE_SIZES[kind];
    return clampSize(kind, num(v.w, fallback.w), num(v.h, fallback.h), wall);
  };
  return { rect: one("rect"), square: one("square"), circle: one("circle") };
}

/** Turns anything read from storage into a valid project slice, filling gaps from the defaults. */
export function sanitizeProject(raw: unknown): PersistedSlice {
  const o = isObj(raw) ? raw : {};
  const wall = sanitizeWall(o.wall);
  return {
    wall,
    grid: sanitizeGrid(o.grid, wall),
    background: sanitizeBackground(o.background),
    shapes: sanitizeShapes(o.shapes, wall),
    paletteSizes: sanitizePalette(o.paletteSizes, wall),
  };
}
