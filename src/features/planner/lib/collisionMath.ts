import type { Point, Shape } from "../types";
import { clamp } from "./geometry";

/** Overlaps (or shortfalls under the gap) smaller than 1 mm are ignored, so 0.1 cm rounding can't create phantom overlaps. */
export const EPS = 0.1;

/** The geometry of a frame; collision doesn't need its id. */
export type Body = Pick<Shape, "kind" | "x" | "y" | "w" | "h">;

interface Circle {
  cx: number;
  cy: number;
  r: number;
}

const isCircle = (b: Body): boolean => b.kind === "circle";

const circleOf = (b: Body): Circle => ({ cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: b.w / 2 });

/** Where a circle's center sits relative to a rect: the closest point on the rect and the distance to it (0 inside). */
function closestPointOnRect(c: Circle, rect: Body): { px: number; py: number; dist: number } {
  const px = clamp(c.cx, rect.x, rect.x + rect.w);
  const py = clamp(c.cy, rect.y, rect.y + rect.h);
  return { px, py, dist: Math.hypot(c.cx - px, c.cy - py) };
}

/** True when `a` and `b` are closer than `gap` by more than EPS. Rects are AABBs; circles use r = w / 2. */
export function overlaps(a: Body, b: Body, gap = 0): boolean {
  const aCircle = isCircle(a);
  const bCircle = isCircle(b);

  if (aCircle && bCircle) {
    const ca = circleOf(a);
    const cb = circleOf(b);
    return Math.hypot(cb.cx - ca.cx, cb.cy - ca.cy) < ca.r + cb.r + gap - EPS;
  }

  if (aCircle || bCircle) {
    const c = circleOf(aCircle ? a : b);
    const { dist } = closestPointOnRect(c, aCircle ? b : a);
    return dist === 0 || dist < c.r + gap - EPS;
  }

  // Same as intersecting `a` inflated by `gap` with `b`. Separation is negative while they overlap on that axis.
  const sepX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const sepY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return sepX < gap - EPS && sepY < gap - EPS;
}

/** The 4 pushes of `b` along an axis (on bounding boxes) that leave `gap` to `a`, shortest first. */
function axisPushes(a: Body, b: Body, gap: number): Point[] {
  const pushes: Point[] = [
    { x: a.x - gap - (b.x + b.w), y: 0 }, // left
    { x: a.x + a.w + gap - b.x, y: 0 }, // right
    { x: 0, y: a.y - gap - (b.y + b.h) }, // up
    { x: 0, y: a.y + a.h + gap - b.y }, // down
  ];
  // Array.prototype.sort is stable, so equal lengths keep the left, right, up, down order.
  return pushes.sort((p, q) => Math.abs(p.x + p.y) - Math.abs(q.x + q.y));
}

/** Smallest circle-center-distance translation: along a -> b, or (1, 0) when the centers coincide. */
function radialPush(a: Body, b: Body, gap: number): Point {
  const ca = circleOf(a);
  const cb = circleOf(b);
  const dx = cb.cx - ca.cx;
  const dy = cb.cy - ca.cy;
  const dist = Math.hypot(dx, dy);
  const t = ca.r + cb.r + gap - dist;
  return dist > 0 ? { x: (dx / dist) * t, y: (dy / dist) * t } : { x: t, y: 0 };
}

/**
 * Translation of the circle that clears the rect with `gap` to spare: along the
 * closest-point normal, or the shortest exit axis when its center is inside the rect.
 */
function circleExit(c: Circle, rect: Body, gap: number): Point {
  const { px, py, dist } = closestPointOnRect(c, rect);
  if (dist > 0) {
    const t = c.r + gap - dist;
    return { x: ((c.cx - px) / dist) * t, y: ((c.cy - py) / dist) * t };
  }
  const exits: Point[] = [
    { x: rect.x - c.r - gap - c.cx, y: 0 }, // left
    { x: rect.x + rect.w + c.r + gap - c.cx, y: 0 }, // right
    { x: 0, y: rect.y - c.r - gap - c.cy }, // up
    { x: 0, y: rect.y + rect.h + c.r + gap - c.cy }, // down
  ];
  return exits.reduce((best, e) => (Math.abs(e.x + e.y) < Math.abs(best.x + best.y) ? e : best));
}

/**
 * Translations for `b` that make it stop overlapping `a` while keeping `gap`, shortest
 * first. Circle pairs lead with the exact (radial / closest-point) push, then the 4 axis
 * pushes on bounding boxes. Returns [] when they don't overlap.
 */
export function separationCandidates(a: Body, b: Body, gap: number): Point[] {
  if (!overlaps(a, b, gap)) return [];

  const aCircle = isCircle(a);
  const bCircle = isCircle(b);
  const out = axisPushes(a, b, gap);

  if (aCircle && bCircle) {
    out.unshift(radialPush(a, b, gap));
  } else if (bCircle) {
    out.unshift(circleExit(circleOf(b), a, gap));
  } else if (aCircle) {
    // Moving the rect by d is the same as moving the circle by -d.
    const exit = circleExit(circleOf(a), b, gap);
    out.unshift({ x: -exit.x, y: -exit.y });
  }
  // `+ 0` turns any -0 into 0.
  return out.map((p) => ({ x: p.x + 0, y: p.y + 0 }));
}
