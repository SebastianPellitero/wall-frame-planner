import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeStorage } from "./safeStorage";
import { sanitizeProject } from "./sanitize";
import { storageEvents, type StorageEvent } from "./storageEvents";

const sample = sanitizeProject({});

let events: StorageEvent[];
let unsubscribe: () => void;

beforeEach(() => {
  events = [];
  unsubscribe = storageEvents.subscribe((e) => events.push(e));
});
afterEach(() => {
  unsubscribe();
  vi.restoreAllMocks();
});

describe("storageEvents", () => {
  it("stops notifying after unsubscribe", () => {
    const fn = vi.fn();
    const off = storageEvents.subscribe(fn);
    off();
    storageEvents.emit({ type: "unavailable" });
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("safeStorage.getItem", () => {
  it("returns the parsed value", () => {
    localStorage.setItem("k", JSON.stringify({ state: { a: 1 }, version: 1 }));
    expect(safeStorage.getItem("k")).toEqual({ state: { a: 1 }, version: 1 });
    expect(events).toEqual([]);
  });

  it("returns null for a missing key", () => {
    expect(safeStorage.getItem("nope")).toBeNull();
    expect(events).toEqual([]);
  });

  it("backs up corrupt JSON, removes the original and emits corrupt", () => {
    localStorage.setItem("k", "{not json");
    expect(safeStorage.getItem("k")).toBeNull();
    expect(localStorage.getItem("k")).toBeNull();
    const [event] = events;
    expect(event.type).toBe("corrupt");
    const backupKey = (event as Extract<StorageEvent, { type: "corrupt" }>).backupKey;
    expect(backupKey).toMatch(/^wallplanner:corrupt-\d+$/);
    expect(localStorage.getItem(backupKey)).toBe("{not json");
  });

  it("emits unavailable and returns null when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(safeStorage.getItem("k")).toBeNull();
    expect(events).toEqual([{ type: "unavailable" }]);
  });
});

describe("safeStorage.setItem / removeItem", () => {
  it("writes JSON", () => {
    safeStorage.setItem("k", { state: sample, version: 1 });
    expect(JSON.parse(localStorage.getItem("k") ?? "")).toEqual({ state: sample, version: 1 });
  });

  it("emits write-failed instead of throwing on quota errors", () => {
    const error = new DOMException("full", "QuotaExceededError");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw error;
    });
    expect(() => safeStorage.setItem("k", { state: sample, version: 1 })).not.toThrow();
    expect(events).toEqual([{ type: "write-failed", error }]);
  });

  it("removes a key and never throws", () => {
    localStorage.setItem("k", "1");
    safeStorage.removeItem("k");
    expect(localStorage.getItem("k")).toBeNull();
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => safeStorage.removeItem("k")).not.toThrow();
  });
});
