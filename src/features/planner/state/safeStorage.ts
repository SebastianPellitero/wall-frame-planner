import type { PersistStorage, StorageValue } from "zustand/middleware";
import type { PersistedSlice } from "../types";
import { storageEvents } from "./storageEvents";

const BACKUP_PREFIX = "wallplanner:corrupt-";

const isSecurityError = (error: unknown) => error instanceof DOMException && error.name === "SecurityError";

/** Removes every earlier corrupt backup, so only the one about to be written is kept. */
function dropOldBackups() {
  const old: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(BACKUP_PREFIX)) old.push(key);
  }
  for (const key of old) window.localStorage.removeItem(key);
}

/**
 * localStorage that never throws: unreadable or corrupt saves come back as null (the
 * corrupt text is kept under a backup key, only the latest one) and failed writes only emit
 * an event, so the app keeps working in memory. Once storage is known to be unavailable that
 * is reported once, and later failed writes add nothing ("storage full" would contradict it).
 */
const BACKUP_IMAGE_ID = /"imageId"\s*:\s*"([^"]+)"/g;

/**
 * Every frame photo id a corrupt-save backup still mentions, found by a tolerant text scan (a
 * backup is by definition not valid JSON), so photo garbage collection keeps them on every later
 * load. `null` when localStorage can't be read: the caller must then assume anything is in use.
 */
export function backupImageIds(): string[] | null {
  if (typeof window === "undefined") return [];
  try {
    const ids: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(BACKUP_PREFIX)) continue;
      const text = window.localStorage.getItem(key) ?? "";
      for (const match of text.matchAll(BACKUP_IMAGE_ID)) ids.push(match[1]);
    }
    return ids;
  } catch {
    return null;
  }
}

export interface SafeStorage extends PersistStorage<PersistedSlice> {
  /**
   * Whether the last read failed (storage unavailable, or a corrupt save that was backed up).
   * The state then started from defaults, so it says nothing about what the real save uses:
   * frame photo garbage collection must not run.
   */
  lastReadFailed(): boolean;
}

export function createSafeStorage(): SafeStorage {
  let unavailable = false;
  let readFailed = false;
  const reportUnavailable = () => {
    if (unavailable) return;
    unavailable = true;
    storageEvents.emit({ type: "unavailable" });
  };

  return {
    lastReadFailed: () => readFailed,
    getItem(name) {
      if (typeof window === "undefined") return null;
      readFailed = false;
      let raw: string | null;
      try {
        raw = window.localStorage.getItem(name);
      } catch {
        readFailed = true;
        reportUnavailable();
        return null;
      }
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as StorageValue<PersistedSlice>;
      } catch {
        readFailed = true;
        const backupKey = `${BACKUP_PREFIX}${Date.now()}`;
        try {
          dropOldBackups();
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
        if (isSecurityError(error)) reportUnavailable();
        else if (!unavailable) storageEvents.emit({ type: "write-failed", error });
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
}

export const safeStorage: SafeStorage = createSafeStorage();
