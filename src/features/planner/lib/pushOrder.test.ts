import { describe, expect, it } from "vitest";
import type { Shape } from "../types";
import { pushOrder } from "./pushOrder";

const sq = (id: string, x: number, y: number): Shape => ({ id, kind: "square", x, y, w: 10, h: 10 });

describe("pushOrder", () => {
  it("lists only the frames whose object changed, without the anchor", () => {
    const a = sq("a", 0, 0);
    const b = sq("b", 5, 0);
    const c = sq("c", 100, 100);
    const before = [a, b, c];
    const after = [{ ...a, x: 1 }, { ...b, x: 13 }, c];
    expect(pushOrder(before, after, "a")).toEqual(["b"]);
  });

  it("sorts the pushed frames by their distance from the anchor's center, nearest first", () => {
    const anchor = sq("a", 50, 50);
    const far = sq("far", 80, 50);
    const near = sq("near", 55, 50);
    const mid = sq("mid", 50, 65);
    const before = [far, anchor, near, mid];
    const after = [{ ...far, x: 90 }, anchor, { ...near, x: 63 }, { ...mid, y: 70 }];
    expect(pushOrder(before, after, "a")).toEqual(["near", "mid", "far"]);
  });

  it("is empty when nothing was pushed or the anchor is missing", () => {
    const before = [sq("a", 0, 0), sq("b", 50, 50)];
    expect(pushOrder(before, before.slice(), "a")).toEqual([]);
    expect(pushOrder(before, [{ ...before[0] }, { ...before[1] }], "zzz")).toEqual([]);
  });
});
