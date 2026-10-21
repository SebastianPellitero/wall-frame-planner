import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Wall } from "../types";
import { useWallScale } from "./useWallScale";

type Callback = (entries: { contentRect: { width: number; height: number } }[]) => void;
let observers: { cb: Callback; disconnected: boolean }[] = [];

beforeEach(() => {
  observers = [];
  globalThis.ResizeObserver = class {
    entry: { cb: Callback; disconnected: boolean };
    constructor(cb: Callback) {
      this.entry = { cb, disconnected: false };
      observers.push(this.entry);
    }
    observe() {}
    unobserve() {}
    disconnect() {
      this.entry.disconnected = true;
    }
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
});

function Probe({ wall, padding }: { wall: Pick<Wall, "width" | "height">; padding: number }) {
  const { stageRef, pxPerCm, wallPx } = useWallScale(wall, padding);
  return <div ref={stageRef} data-testid="probe" data-px={pxPerCm} data-w={wallPx.w} data-h={wallPx.h} />;
}
const latest = {
  get pxPerCm() {
    return Number(screen.getByTestId("probe").dataset.px);
  },
  get wallPx() {
    const { w, h } = screen.getByTestId("probe").dataset;
    return { w: Number(w), h: Number(h) };
  },
};
const resize = (width: number, height: number) => act(() => observers.at(-1)!.cb([{ contentRect: { width, height } }]));

describe("useWallScale", () => {
  it("is 0 until the stage is measured", () => {
    render(<Probe wall={{ width: 300, height: 250 }} padding={12} />);
    expect(latest.pxPerCm).toBe(0);
    expect(latest.wallPx).toEqual({ w: 0, h: 0 });
  });

  it("scales the wall to the measured content box", () => {
    render(<Probe wall={{ width: 300, height: 250 }} padding={12} />);
    resize(624, 524);
    expect(latest.pxPerCm).toBe(2);
    expect(latest.wallPx).toEqual({ w: 600, h: 500 });
  });

  it("rescales when the stage or the wall changes", () => {
    const { rerender } = render(<Probe wall={{ width: 300, height: 250 }} padding={12} />);
    resize(624, 400);
    resize(324, 400);
    expect(latest.pxPerCm).toBe(1);
    rerender(<Probe wall={{ width: 150, height: 250 }} padding={12} />);
    expect(latest.pxPerCm).toBeCloseTo(376 / 250, 10);
  });

  it("disconnects the observer on unmount", () => {
    const { unmount } = render(<Probe wall={{ width: 300, height: 250 }} padding={12} />);
    unmount();
    expect(observers.every((o) => o.disconnected)).toBe(true);
  });
});
