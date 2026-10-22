import { beforeEach, describe, expect, it } from "vitest";
import { dismissToast, emptyToastQueue, enqueueToast, MAX_TOASTS, showToast, useToasts, type ToastInput } from "./toasts";

const info = (key: string, message = key): ToastInput => ({ key, tone: "info", message });

describe("enqueueToast", () => {
  it("appends newest last, with increasing ids", () => {
    let q = enqueueToast(emptyToastQueue(), info("a"), 0);
    q = enqueueToast(q, info("b"), 1);
    expect(q.toasts.map((t) => t.key)).toEqual(["a", "b"]);
    expect(q.toasts[1].id).toBeGreaterThan(q.toasts[0].id);
  });

  it(`keeps at most ${MAX_TOASTS}, dropping the oldest first`, () => {
    let q = emptyToastQueue();
    for (const key of ["a", "b", "c", "d"]) q = enqueueToast(q, info(key), 0);
    expect(MAX_TOASTS).toBe(2);
    expect(q.toasts.map((t) => t.key)).toEqual(["c", "d"]);
  });

  it("replaces a visible toast with the same key instead of stacking a copy", () => {
    let q = enqueueToast(emptyToastQueue(), info("a"), 0);
    q = enqueueToast(q, info("b"), 0);
    const firstId = q.toasts[0].id;
    q = enqueueToast(q, info("a", "again"), 0);
    expect(q.toasts.map((t) => t.message)).toEqual(["b", "again"]);
    expect(q.toasts[1].id).not.toBe(firstId);
  });

  it("throttles a key: nothing new within throttleMs of the last time it was shown", () => {
    const failed: ToastInput = { key: "write-failed", tone: "error", message: "full", throttleMs: 30_000 };
    let q = enqueueToast(emptyToastQueue(), failed, 1_000);
    q = dismissToast(q, q.toasts[0].id);
    q = enqueueToast(q, failed, 30_999);
    expect(q.toasts).toEqual([]);
    q = enqueueToast(q, failed, 31_000);
    expect(q.toasts.map((t) => t.key)).toEqual(["write-failed"]);
  });

  it("does not let a throttled repeat restart the throttle window", () => {
    const failed: ToastInput = { key: "w", tone: "error", message: "m", throttleMs: 100 };
    let q = enqueueToast(emptyToastQueue(), failed, 0);
    q = dismissToast(q, q.toasts[0].id);
    q = enqueueToast(q, failed, 50);
    q = enqueueToast(q, failed, 100);
    expect(q.toasts).toHaveLength(1);
  });
});

describe("dismissToast", () => {
  it("removes only that toast and ignores unknown ids", () => {
    let q = enqueueToast(emptyToastQueue(), info("a"), 0);
    q = enqueueToast(q, info("b"), 0);
    expect(dismissToast(q, q.toasts[0].id).toasts.map((t) => t.key)).toEqual(["b"]);
    expect(dismissToast(q, 999)).toBe(q);
  });
});

describe("useToasts", () => {
  beforeEach(() => useToasts.setState(emptyToastQueue()));

  it("showToast enqueues into the store", () => {
    showToast(info("Wall reset."));
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(["Wall reset."]);
  });
});
