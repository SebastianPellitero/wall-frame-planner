import { create } from "zustand";

/**
 * The shared polite screen-reader announcement (design-system.md §7), separate from the visual
 * toasts. `id` changes on every call, so repeating a message is spoken again.
 */
export const useAnnouncer = create<{ text: string; id: number }>(() => ({ text: "", id: 0 }));

export const announce = (text: string) => useAnnouncer.setState((s) => ({ text, id: s.id + 1 }));
