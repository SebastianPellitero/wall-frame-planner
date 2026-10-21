import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { PersistedSlice } from "../types";
import { storageEvents } from "./storageEvents";

/**
 * localStorage that never throws: unreadable or corrupt saves come back as null (the
 * corrupt text is kept under a backup key) and failed writes only emit an event, so the
 * app keeps working in memory.
 */
export const safeStorage: PersistStorage<PersistedSlice> = {
  getItem(name) {
    if (typeof window === "undefined") return null;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(name);
    } catch {
      storageEvents.emit({ type: "unavailable" });
      return null;
    }
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as StorageValue<PersistedSlice>;
    } catch {
      const backupKey = `wallplanner:corrupt-${Date.now()}`;
      try {
        window.localStorage.setItem(backupKey, raw);
        window.localStorage.removeItem(name);
      } catch {
        // Best effort: even without a backup the app must start from defaults.
      }
      storageEvents.emit({ type: "corrupt", backupKey });
      return null;
    }
  },
  setItem(name, value) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      storageEvents.emit({ type: "write-failed", error });
    }
  },
  removeItem(name) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Nothing useful to do; the save just stays.
    }
  },
};
