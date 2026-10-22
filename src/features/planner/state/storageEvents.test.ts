import { describe, expect, it, vi } from "vitest";
import { createStorageEvents, type StorageEvent } from "./storageEvents";

describe("createStorageEvents", () => {
  it("buffers events emitted before the first subscriber and replays them in order", () => {
    const bus = createStorageEvents();
    bus.emit({ type: "unavailable" });
    bus.emit({ type: "corrupt", backupKey: "wallplanner:corrupt-1" });

    const seen: StorageEvent[] = [];
    bus.subscribe((e) => seen.push(e));
    expect(seen).toEqual([{ type: "unavailable" }, { type: "corrupt", backupKey: "wallplanner:corrupt-1" }]);
  });

  it("delivers later events live, after the replay", () => {
    const bus = createStorageEvents();
    bus.emit({ type: "unavailable" });
    const seen: string[] = [];
    bus.subscribe((e) => seen.push(e.type));
    bus.emit({ type: "image-missing" });
    expect(seen).toEqual(["unavailable", "image-missing"]);
  });

  it("replays the buffer only once: a second subscriber gets live events only", () => {
    const bus = createStorageEvents();
    bus.emit({ type: "unavailable" });
    const first = vi.fn();
    const off = bus.subscribe(first);
    off();
    const second = vi.fn();
    bus.subscribe(second);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    bus.emit({ type: "image-session-only" });
    expect(second).toHaveBeenCalledWith({ type: "image-session-only" });
  });

  it("drops events once someone has subscribed and nobody listens any more", () => {
    const bus = createStorageEvents();
    bus.subscribe(() => {})();
    bus.emit({ type: "unavailable" });
    const late = vi.fn();
    bus.subscribe(late);
    expect(late).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const bus = createStorageEvents();
    const fn = vi.fn();
    bus.subscribe(() => {});
    const off = bus.subscribe(fn);
    off();
    bus.emit({ type: "unavailable" });
    expect(fn).not.toHaveBeenCalled();
  });
});
