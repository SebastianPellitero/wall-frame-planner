import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHELL_QUERIES, useShell } from "./useShell";

/** A controllable matchMedia: `set(query, matches)` flips a query and notifies its listeners. */
function mockMatchMedia() {
  const matches = new Map<string, boolean>();
  const listeners = new Map<string, Set<() => void>>();
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return matches.get(query) ?? false;
    },
    media: query,
    addEventListener: (_: "change", fn: () => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(fn);
    },
    removeEventListener: (_: "change", fn: () => void) => listeners.get(query)?.delete(fn),
  }));
  window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
  return {
    set(query: string, value: boolean) {
      matches.set(query, value);
      listeners.get(query)?.forEach((fn) => fn());
    },
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

const original = window.matchMedia;
let media: ReturnType<typeof mockMatchMedia>;
beforeEach(() => {
  media = mockMatchMedia();
});
afterEach(() => {
  window.matchMedia = original;
});

describe("SHELL_QUERIES", () => {
  it("uses exactly the design-system §4.1 media queries", () => {
    expect(SHELL_QUERIES.landscape).toBe("(orientation: landscape) and (max-height: 500px)");
    expect(SHELL_QUERIES.desktop).toBe("(min-width: 1024px) and (min-height: 501px)");
  });
});

describe("useShell", () => {
  it("is stacked when neither query matches", () => {
    const { result } = renderHook(() => useShell());
    expect(result.current).toBe("stacked");
  });

  it("picks landscape and desktop from their queries", () => {
    media.set(SHELL_QUERIES.landscape, true);
    expect(renderHook(() => useShell()).result.current).toBe("landscape");
    media.set(SHELL_QUERIES.landscape, false);
    media.set(SHELL_QUERIES.desktop, true);
    expect(renderHook(() => useShell()).result.current).toBe("desktop");
  });

  it("follows media changes, such as rotating the phone", () => {
    const { result } = renderHook(() => useShell());
    act(() => media.set(SHELL_QUERIES.landscape, true));
    expect(result.current).toBe("landscape");
    act(() => media.set(SHELL_QUERIES.landscape, false));
    expect(result.current).toBe("stacked");
  });

  it("stops listening on unmount", () => {
    const { unmount } = renderHook(() => useShell());
    expect(media.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(media.listenerCount()).toBe(0);
  });
});
