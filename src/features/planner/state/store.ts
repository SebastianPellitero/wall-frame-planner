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
  paletteKind: s.paletteKind,
  creatorColor: s.creatorColor,
});

/** A fresh store. Tests use this for isolation; the app uses the `usePlannerStore` singleton. */
export function createPlannerStore(opts: { storage?: PersistStorage<PersistedSlice>; name?: string } = {}) {
  const store = create<PlannerState>()(
    persist(
      temporal(
        (set, get) => ({
          ...initialProject(),
          ...initialUi,
          ...createActions(set, get, () => store.temporal.getState().clear()),
        }),
        {
          partialize: (s) => ({ shapes: s.shapes }),
          limit: HISTORY_LIMIT,
          equality: (a, b) => a.shapes === b.shapes,
        },
      ),
      {
        name: opts.name ?? PERSIST_KEY,
        version: 1,
        storage: opts.storage ?? safeStorage,
        partialize: pickPersisted,
        migrate: (persisted) => sanitizeProject(persisted),
        // A save without a creator color keeps the one rolled for this session.
        merge: (persisted, current) => ({ ...current, ...sanitizeProject(persisted, current.creatorColor) }),
      },
    ),
  );

  // persist wraps temporal, so zundo's undo/redo writes go through persist and are saved.
  // Hydration is not an undoable edit.
  store.temporal.getState().clear();

  store.subscribe((s, prev) => {
    // After undo/redo the selected shape may be gone.
    if (s.selectedId !== null && !s.shapes.some((shape) => shape.id === s.selectedId)) {
      store.setState({ selectedId: null });
    }
    // pushedIds only describes the change that set it; any other shapes change makes it stale.
    if (s.shapes !== prev.shapes && s.pushedIds === prev.pushedIds && s.pushedIds.length > 0) {
      store.setState({ pushedIds: [] });
    }
  });

  return store;
}

export const usePlannerStore = createPlannerStore();
