import { createContext, use, type RefObject } from "react";

export interface WallContextValue {
  /** Screen px per wall cm. 0 until the stage is first measured. */
  pxPerCm: number;
  /** The wall element: hit-testing (palette drops) and client px to wall cm conversion. */
  wallRef: RefObject<HTMLDivElement | null>;
  /** The wall's size on screen, in px. */
  wallPx: { w: number; h: number };
}

export const WallContext = createContext<WallContextValue | null>(null);

export function useWallContext(): WallContextValue {
  const value = use(WallContext);
  if (!value) throw new Error("useWallContext must be used inside <WallContext>");
  return value;
}
