import { create } from "zustand";

/**
 * The toast queue (design-system.md §5.9). Info toasts (`role="status"`) auto-dismiss; errors
 * (`role="alert"`) stay until dismissed. The pure parts are `enqueueToast` and `dismissToast`;
 * `useToasts` holds the live queue for ToastRegion.
 */

export type ToastTone = "info" | "error";

export interface ToastInput {
  /** Identifies the kind of toast: a visible toast with the same key is replaced, not stacked. */
  key: string;
  tone: ToastTone;
  message: string;
  /** Minimum time between two showings of this key, for events that can fire on every commit. */
  throttleMs?: number;
}

export interface Toast {
  id: number;
  key: string;
  tone: ToastTone;
  message: string;
}

export interface ToastQueue {
  /** Oldest first; the newest is drawn at the bottom. */
  toasts: Toast[];
  /** When each key was last shown (ms), for throttling. */
  lastShown: Record<string, number>;
  nextId: number;
}

/** At most two stack (§5.9). */
export const MAX_TOASTS = 2;

export const emptyToastQueue = (): ToastQueue => ({ toasts: [], lastShown: {}, nextId: 1 });

/** Adds `input` as the newest toast at time `now`, unless its key is throttled; the oldest go first past MAX_TOASTS. */
export function enqueueToast(q: ToastQueue, input: ToastInput, now: number): ToastQueue {
  const last = q.lastShown[input.key];
  if (input.throttleMs !== undefined && last !== undefined && now - last < input.throttleMs) return q;
  const toast: Toast = { id: q.nextId, key: input.key, tone: input.tone, message: input.message };
  const toasts = [...q.toasts.filter((t) => t.key !== input.key), toast].slice(-MAX_TOASTS);
  return { toasts, lastShown: { ...q.lastShown, [input.key]: now }, nextId: q.nextId + 1 };
}

export function dismissToast(q: ToastQueue, id: number): ToastQueue {
  if (!q.toasts.some((t) => t.id === id)) return q;
  return { ...q, toasts: q.toasts.filter((t) => t.id !== id) };
}

export const useToasts = create<ToastQueue>(emptyToastQueue);

export const showToast = (input: ToastInput) => useToasts.setState((q) => enqueueToast(q, input, Date.now()));
export const hideToast = (id: number) => useToasts.setState((q) => dismissToast(q, id));
