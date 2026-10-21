import { describe, expect, it } from "vitest";
import * as physics from "./physics";
import {
  dragStartPx,
  liftScale,
  maxTiltDeg,
  pushStaggerMs,
  reducedMotion,
  rubberBandFactor,
  rubberBandMaxPx,
  snapHapticMs,
  snapThresholdPx,
  tiltFactor,
  tiltFromVelocity,
} from "./physics";

/** Damping ratios from the ζ column of design-system.md §6.1. */
const DOCUMENTED_ZETA = {
  lift: 0.66,
  tilt: 0.46,
  settle: 0.84,
  settleRotate: 0.56,
  push: 0.82,
  ghostFollow: 1.12,
  flyBack: 0.92,
  popIn: 0.61,
  remove: 1.0,
  duplicate: 0.65,
  sheet: 1.0,
} as const;

type PresetName = keyof typeof DOCUMENTED_ZETA;
const PRESET_NAMES = Object.keys(DOCUMENTED_ZETA) as PresetName[];

describe("spring presets", () => {
  it("exports every designer preset under its exact name", () => {
    for (const name of PRESET_NAMES) {
      expect(physics[name], name).toBeDefined();
    }
  });

  it.each(PRESET_NAMES)("%s is a motion spring transition", (name) => {
    const preset = physics[name];
    expect(preset.type).toBe("spring");
    for (const key of ["stiffness", "damping", "mass"] as const) {
      expect(Number.isFinite(preset[key]), `${name}.${key}`).toBe(true);
      expect(preset[key], `${name}.${key}`).toBeGreaterThan(0);
    }
  });

  it.each(PRESET_NAMES)("%s has the documented damping ratio", (name) => {
    const { stiffness, damping, mass } = physics[name];
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    expect(Math.abs(zeta - DOCUMENTED_ZETA[name])).toBeLessThan(0.01);
  });

  it("only uses plain data fields", () => {
    for (const name of PRESET_NAMES) {
      expect(Object.keys(physics[name]).sort()).toEqual(["damping", "mass", "stiffness", "type"]);
    }
  });
});

describe("scalars", () => {
  it("are sane", () => {
    expect(liftScale).toBeGreaterThan(1);
    expect(tiltFactor).toBeGreaterThan(0);
    expect(maxTiltDeg).toBeGreaterThan(0);
    expect(rubberBandFactor).toBeGreaterThan(0);
    expect(rubberBandFactor).toBeLessThan(1);
    expect(rubberBandMaxPx).toBeGreaterThan(0);
    expect(pushStaggerMs).toBeGreaterThanOrEqual(0);
    expect(snapHapticMs).toBeGreaterThan(0);
  });

  it("uses a larger snap threshold for coarse pointers", () => {
    expect(snapThresholdPx.fine).toBeGreaterThan(0);
    expect(snapThresholdPx.coarse).toBeGreaterThan(snapThresholdPx.fine);
  });

  it("uses a larger drag-start distance for coarse pointers", () => {
    expect(dragStartPx.fine).toBeGreaterThan(0);
    expect(dragStartPx.coarse).toBeGreaterThan(dragStartPx.fine);
  });
});

describe("reducedMotion", () => {
  it("matches design-system.md §6.4", () => {
    expect(reducedMotion).toEqual({
      tweenShortMs: 120,
      tweenMs: 160,
      tweenLongMs: 200,
      ease: [0.2, 0.8, 0.2, 1],
    });
  });
});

describe("tiltFromVelocity", () => {
  it("tilts against the direction of travel (−vx × factor)", () => {
    expect(tiltFromVelocity(100)).toBeCloseTo(-100 * tiltFactor, 10);
    expect(tiltFromVelocity(-100)).toBeCloseTo(100 * tiltFactor, 10);
    expect(tiltFromVelocity(100)).toBeLessThan(0);
    expect(tiltFromVelocity(-100)).toBeGreaterThan(0);
  });

  it("clamps to ±maxTiltDeg", () => {
    expect(tiltFromVelocity(1e6)).toBe(-maxTiltDeg);
    expect(tiltFromVelocity(-1e6)).toBe(maxTiltDeg);
  });

  it("reaches the limit exactly at maxTiltDeg / tiltFactor and stays there", () => {
    const vx = maxTiltDeg / tiltFactor;
    expect(Math.abs(tiltFromVelocity(vx))).toBeCloseTo(maxTiltDeg, 10);
    expect(Math.abs(tiltFromVelocity(vx * 2))).toBe(maxTiltDeg);
  });

  it("is 0 for zero velocity, and never -0", () => {
    expect(Object.is(tiltFromVelocity(0), 0)).toBe(true);
    expect(Object.is(tiltFromVelocity(-0), 0)).toBe(true);
  });

  it("accepts a custom factor and limit", () => {
    expect(tiltFromVelocity(100, 0.05, 3)).toBe(-3);
    expect(tiltFromVelocity(20, 0.05, 3)).toBeCloseTo(-1, 10);
    expect(tiltFromVelocity(-20, 0.05, 3)).toBeCloseTo(1, 10);
  });
});

describe("pushDelayMs", () => {
  it("staggers by rank, nearest first, capped at 150 ms total", () => {
    expect(physics.pushDelayMs(0)).toBe(0);
    expect(physics.pushDelayMs(1)).toBe(pushStaggerMs);
    expect(physics.pushDelayMs(3)).toBe(3 * pushStaggerMs);
    expect(physics.pushDelayMs(50)).toBe(physics.pushStaggerCapMs);
    expect(physics.pushStaggerCapMs).toBe(150);
  });

  it("is 0 under reduced motion and for frames that were not pushed", () => {
    expect(physics.pushDelayMs(3, true)).toBe(0);
    expect(physics.pushDelayMs(-1)).toBe(0);
  });
});

describe("tween", () => {
  it("is a reduced-motion tween in seconds with the soft ease-out", () => {
    expect(physics.tween(reducedMotion.tweenMs)).toEqual({ type: "tween", duration: 0.16, ease: reducedMotion.ease });
    expect(physics.tween(120, 0.5)).toEqual({ type: "tween", duration: 0.12, ease: reducedMotion.ease, delay: 0.5 });
  });
});

describe("choreography fades (§6.3)", () => {
  it("pop-in fades in over 120 ms and delete fades out over 140 ms", () => {
    expect(physics.popInFadeMs).toBe(120);
    expect(physics.removeFadeMs).toBe(140);
  });
});
