import { useCallback, useState } from "react";

type Size = { w: number; h: number };

const ZERO: Size = { w: 0, h: 0 };

/**
 * The content-box size of an element in px, kept current with a ResizeObserver. Zero until the
 * first measure (and where ResizeObserver is missing). Attach `ref` to the element.
 */
export function useElementSize<T extends Element>() {
  const [size, setSize] = useState<Size>(ZERO);

  // A callback ref, so a remounted element is observed too.
  const ref = useCallback((el: T | null) => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}
