import { create } from "zustand";

/**
 * The Custom wall color's live preview (design-system.md §5.18): the picker's value while it is
 * open, shown on the wall before its `change` commits `setWall({ color })`. Not persisted, not in history.
 */
export const useWallPaintPreview = create<{ color: string | null }>()(() => ({ color: null }));
