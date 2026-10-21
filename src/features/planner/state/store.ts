import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { temporal } from "zundo";
import type { PersistedSlice } from "../types";
import { createActions, initialProject, initialUi } from "./actions";
import { safeStorage } from "./safeStorage";
import { sanitizeProject } from "./sanitize";
import type { PlannerState } from "./storeTypes";

export const PERSIST_KEY = "wallplanner:project";
const HISTORY_LIMIT = 50;

const pickPersisted = (s: PlannerState): PersistedSlice => ({
  wall: s.wall,
  grid: s.grid,
  background: s.background,
  shapes: s.shapes,
  paletteSizes: s.paletteSizes,
});

/** A fresh store. Tests use this for isolation; the app uses the `usePlannerStore` singleton. */
export function createPlannerStore(opts: { storage?: PersistStorage<PersistedSlice>; name?: string } = {}) {
  const store = create<PlannerState>()(
    temporal(
      persist(
        (set, get) => ({
          ...initialProject(),
          ...initialUi,
          ...createActions(set, get, () => store.temporal.getState().clear()),
        }),
        {
          name: opts.name ?? PERSIST_KEY,
          version: 1,
          storage: opts.storage ?? safeStorage,
          partialize: pickPersisted,
          migrate: (persisted) => sanitizeProject(persisted),
          merge: (persisted, current) => ({ ...current, ...sanitizeProject(persisted) }),
        },
      ),
      {
        partialize: (s) => ({ shapes: s.shapes }),
        limit: HISTORY_LIMIT,
        equality: (a, b) => a.shapes === b.shapes,
      },
    ),
  );

  // Hydration is not an undoable edit.
  store.temporal.getState().clear();

  // After undo/redo the selected shape may be gone.
  store.subscribe((s) => {
    if (s.selectedId !== null && !s.shapes.some((shape) => shape.id === s.selectedId)) {
      store.setState({ selectedId: null });
    }
  });

  return store;
}

export const usePlannerStore = createPlannerStore();
