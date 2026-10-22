import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/imageStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/imageStore")>();
  return { ...actual, deleteBackgroundImage: vi.fn() };
});

import { DEFAULT_BACKGROUND, DEFAULT_GRID, DEFAULT_PALETTE_SIZES, DEFAULT_WALL } from "../defaults";
import * as imageStore from "../lib/imageStore";
import { initialProject, initialUi } from "./actions";
import { usePhotoImage } from "./photoImage";
import { resetWall } from "./projectCommands";
import { usePlannerStore } from "./store";
import { emptyToastQueue, useToasts } from "./toasts";

const mocked = vi.mocked(imageStore);

beforeEach(() => {
  vi.resetAllMocks();
  useToasts.setState(emptyToastQueue());
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  usePlannerStore.temporal.getState().clear();
  // A worked-on wall: frames (with history), every setting changed and a photo.
  const s = usePlannerStore.getState();
  s.addShape("rect");
  s.addShape("circle");
  s.setWall({ width: 420, height: 260, pushGap: 8 });
  s.setGrid({ enabled: true, spacingX: 25, snap: false });
  s.generate("square", { w: 55, h: 55 });
  s.setBackground({ hasImage: true, x: -40, width: 600, opacity: 0.5 });
  s.setMode("photo");
  usePhotoImage.setState({ blob: new Blob(["photo"]) });
});

describe("resetWall", () => {
  it("clears frames, wall size, push gap, grid, palette sizes, the photo and the undo history", async () => {
    expect(usePlannerStore.temporal.getState().pastStates.length).toBeGreaterThan(0);
    await resetWall();

    const s = usePlannerStore.getState();
    expect(s.shapes).toEqual([]);
    expect(s.wall).toEqual(DEFAULT_WALL);
    expect(s.grid).toEqual(DEFAULT_GRID);
    expect(s.paletteSizes).toEqual(DEFAULT_PALETTE_SIZES);
    expect(s.paletteKind).toBe("rect");
    expect(s.background).toEqual(DEFAULT_BACKGROUND);
    expect(s.mode).toBe("arrange");
    expect(s.selectedId).toBeNull();
    expect(usePlannerStore.temporal.getState().pastStates).toEqual([]);
    expect(usePhotoImage.getState().blob).toBeNull();
    expect(mocked.deleteBackgroundImage).toHaveBeenCalledTimes(1);
  });

  it("shows a short 'Wall reset.' info toast", async () => {
    await resetWall();
    expect(useToasts.getState().toasts).toMatchObject([{ tone: "info", message: "Wall reset." }]);
  });

  it("still resets when the stored image can't be deleted", async () => {
    mocked.deleteBackgroundImage.mockRejectedValue(new Error("IDB broke"));
    await expect(resetWall()).resolves.toBeUndefined();
    expect(usePlannerStore.getState().shapes).toEqual([]);
    expect(usePlannerStore.getState().background).toEqual(DEFAULT_BACKGROUND);
  });
});
