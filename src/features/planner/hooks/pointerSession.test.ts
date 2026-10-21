import { describe, expect, it, vi } from "vitest";
import { startPointerSession } from "./pointerSession";

const fire = (type: string, pointerId: number) => {
  const e = new Event(type) as Event & { pointerId: number };
  Object.defineProperty(e, "pointerId", { value: pointerId });
  window.dispatchEvent(e);
};

describe("startPointerSession", () => {
  it("survives a failing setPointerCapture and follows only its pointer via window", () => {
    const el = document.createElement("div");
    el.setPointerCapture = () => {
      throw new Error("InvalidPointerId");
    };
    const onMove = vi.fn();
    const onEnd = vi.fn();
    startPointerSession(el, 7, { onMove, onEnd });
    fire("pointermove", 7);
    fire("pointermove", 8);
    expect(onMove).toHaveBeenCalledTimes(1);
    fire("pointerup", 8);
    expect(onEnd).not.toHaveBeenCalled();
    fire("pointerup", 7);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0][1]).toBe(false);
    // Listeners are gone after the end.
    fire("pointermove", 7);
    fire("pointerup", 7);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("treats pointercancel as the end, flagged as cancelled", () => {
    const el = document.createElement("div");
    el.setPointerCapture = vi.fn();
    const onEnd = vi.fn();
    startPointerSession(el, 1, { onMove: () => {}, onEnd });
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);
    fire("pointercancel", 1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd.mock.calls[0][1]).toBe(true);
  });

  it("stop removes the listeners without ending", () => {
    const el = document.createElement("div");
    const onMove = vi.fn();
    const onEnd = vi.fn();
    const stop = startPointerSession(el, 1, { onMove, onEnd });
    stop();
    fire("pointermove", 1);
    fire("pointerup", 1);
    expect(onMove).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });
});
