import { act, renderHook } from "@testing-library/react";
import type { MotionValue } from "motion/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** One `animate` call: it finishes only when the test says so, and (like motion) never once stopped. */
type Call = { mv: MotionValue<number>; to: number; finish(): Promise<void> };
const calls: Call[] = [];

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    animate: (mv: MotionValue<number>, to: number, options?: { onComplete?: () => void }) => {
      let resolve!: () => void;
      const finished = new Promise<void>((r) => (resolve = r));
      calls.push({
        mv,
        to,
        finish: async () => {
          mv.set(to);
          options?.onComplete?.();
          resolve();
          // Let promise chains waiting on this one run.
          await act(async () => {});
        },
      });
      return { finished, stop: () => {} };
    },
  };
});

import { initialProject, initialUi } from "../state/actions";
import { useDragUi } from "../state/dragUi";
import { usePlannerStore } from "../state/store";
import { useFrameMotion } from "./useFrameMotion";

type Props = { shape: { id: string; x: number; y: number }; ppc: number };
const START: Props = { shape: { id: "a", x: 10, y: 10 }, ppc: 2 };

function setup() {
  return renderHook(({ shape, ppc }: Props) => useFrameMotion(shape, ppc), { initialProps: START });
}

/** The latest animation of `mv`. */
const last = (mv: MotionValue<number>) => calls.filter((c) => c.mv === mv).at(-1)!;
const animatedTo = (mv: MotionValue<number>, to: number) => calls.some((c) => c.mv === mv && c.to === to);

beforeEach(() => {
  calls.length = 0;
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  useDragUi.setState({ spawnFrom: null });
});

describe("useFrameMotion: the push nudge shadow", () => {
  it("fades out only once both x and y have arrived (a y-only push included)", async () => {
    const { result, rerender } = setup();
    const { x, y, nudgeOpacity } = result.current;
    rerender({ ...START, shape: { id: "a", x: 10, y: 40 } });
    await last(nudgeOpacity).finish();
    expect(nudgeOpacity.get()).toBe(1);

    await last(x).finish();
    expect(animatedTo(nudgeOpacity, 0)).toBe(false);
    await last(y).finish();
    expect(last(nudgeOpacity).to).toBe(0);
  });

  it("is cleared when a rescale jumps the frame mid-push", async () => {
    const { result, rerender } = setup();
    const { nudgeOpacity } = result.current;
    rerender({ ...START, shape: { id: "a", x: 30, y: 40 } });
    await last(nudgeOpacity).finish();
    rerender({ shape: { id: "a", x: 30, y: 40 }, ppc: 3 });
    expect(nudgeOpacity.get()).toBe(0);
  });

  it("an earlier push arriving late does not fade a newer push's shadow", async () => {
    const { result, rerender } = setup();
    const { x, y, nudgeOpacity } = result.current;
    rerender({ ...START, shape: { id: "a", x: 30, y: 10 } });
    const first = [last(x), last(y)];
    rerender({ ...START, shape: { id: "a", x: 60, y: 10 } });
    await last(nudgeOpacity).finish();
    for (const c of first) await c.finish();
    expect(last(nudgeOpacity).to).toBe(1);
  });
});

describe("useFrameMotion: raised while settling", () => {
  it("stays raised from lift until the drop's scale and x/y settle", async () => {
    const { result } = setup();
    expect(result.current.raised).toBe(false);
    act(() => result.current.lift());
    expect(result.current.raised).toBe(true);
    act(() => result.current.drop({ x: 20, y: 30 }));
    const { x, y, scale } = result.current;
    const settle = [last(x), last(y)];
    expect(result.current.raised).toBe(true);
    for (const c of settle) await c.finish();
    expect(result.current.raised).toBe(true);
    await last(scale).finish();
    expect(result.current.raised).toBe(false);
  });

  it("lowers after a push that interrupts the settle", async () => {
    const { result, rerender } = setup();
    act(() => result.current.lift());
    act(() => result.current.drop({ x: 20, y: 30 }));
    const { x, y, scale } = result.current;
    await last(scale).finish();
    // Undo moves it before the settle's x/y arrive; those never finish now.
    rerender({ ...START, shape: { id: "a", x: 50, y: 30 } });
    expect(result.current.raised).toBe(true);
    await last(x).finish();
    await last(y).finish();
    expect(result.current.raised).toBe(false);
  });

  it("lowers after a rescale jumps the settle, once the scale settles", async () => {
    const { result, rerender } = setup();
    act(() => result.current.lift());
    act(() => result.current.drop({ x: 20, y: 30 }));
    rerender({ shape: { id: "a", x: 20, y: 30 }, ppc: 3 });
    expect(result.current.raised).toBe(true);
    await last(result.current.scale).finish();
    expect(result.current.raised).toBe(false);
  });

  it("a new lift during the settle keeps it raised", async () => {
    const { result } = setup();
    act(() => result.current.lift());
    act(() => result.current.drop({ x: 20, y: 30 }));
    const settle = [last(result.current.x), last(result.current.y), last(result.current.scale)];
    act(() => result.current.lift());
    for (const c of settle) await c.finish();
    expect(result.current.raised).toBe(true);
  });
});
