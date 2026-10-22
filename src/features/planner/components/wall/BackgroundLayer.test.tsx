import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/imageStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/imageStore")>()),
  loadBackgroundImage: vi.fn(),
}));

import { DEFAULT_BACKGROUND } from "../../defaults";
import { loadBackgroundImage } from "../../lib/imageStore";
import { initialProject, initialUi } from "../../state/actions";
import { usePhotoImage } from "../../state/photoImage";
import { usePlannerStore } from "../../state/store";
import type { Background } from "../../types";
import { WallContext } from "./WallContext";
import { WallStage } from "./WallStage";

const PX_PER_CM = 2;
const WALL_LEFT = 100;
const WALL_TOP = 50;
const PHOTO: Background = { ...DEFAULT_BACKGROUND, hasImage: true, x: -10, y: -20, width: 400, aspect: 0.75, opacity: 0.6 };

function renderStage() {
  const { width, height } = usePlannerStore.getState().wall;
  const value = { pxPerCm: PX_PER_CM, wallRef: createRef<HTMLDivElement>(), wallPx: { w: width * PX_PER_CM, h: height * PX_PER_CM } };
  render(
    <WallContext value={value}>
      <WallStage stageRef={() => {}} shell="landscape" />
    </WallContext>,
  );
  const wall = screen.getByTestId("wall");
  wall.getBoundingClientRect = () => ({ left: WALL_LEFT, top: WALL_TOP, width: 600, height: 500 }) as DOMRect;
  return { stage: screen.getByTestId("stage"), wall };
}

/** A window-level pointer event, as the pointer session listens there. */
function firePointer(type: string, pointerId: number, clientX: number, clientY: number) {
  const e = new Event(type);
  Object.assign(e, { pointerId, clientX, clientY });
  window.dispatchEvent(e);
}

const down = (el: Element, pointerId: number, clientX: number, clientY: number, pointerType = "touch") =>
  fireEvent.pointerDown(el, { pointerId, clientX, clientY, button: 0, pointerType });

const bg = () => usePlannerStore.getState().background;

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:photo");
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.mocked(loadBackgroundImage).mockReset();
  usePlannerStore.setState({ ...initialProject(), ...initialUi, background: PHOTO });
  usePhotoImage.setState({ blob: new Blob(["img"]) });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BackgroundLayer", () => {
  it("draws nothing without a photo", () => {
    usePlannerStore.setState({ background: DEFAULT_BACKGROUND });
    usePhotoImage.setState({ blob: null });
    renderStage();
    expect(screen.queryByTestId("background-photo")).not.toBeInTheDocument();
    expect(loadBackgroundImage).not.toHaveBeenCalled();
  });

  it("places the decorative photo in wall cm at the user's opacity, clipped to the wall in Arrange", async () => {
    renderStage();
    const img = await screen.findByTestId("background-photo");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("src", "blob:photo");
    expect(screen.getByTestId("background")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("background")).toHaveClass("z-photo", "overflow-hidden", "pointer-events-none");
    await waitFor(() => expect(img.style.left).toBe("-20px"));
    expect(img.style.top).toBe("-40px");
    expect(img.style.width).toBe("800px");
    expect(img.style.height).toBe("600px");
    expect(img.style.opacity).toBe("0.6");
    expect(screen.queryByTestId("photo-veil")).not.toBeInTheDocument();
  });

  it("runs past the wall in Photo mode, veiled outside it", async () => {
    usePlannerStore.setState({ mode: "photo" });
    renderStage();
    await screen.findByTestId("background-photo");
    expect(screen.getByTestId("background")).not.toHaveClass("overflow-hidden");
    expect(screen.getByTestId("photo-veil").className).toContain("var(--color-photo-dim)");
  });

  it("hides while Show photo is off", async () => {
    usePlannerStore.setState({ background: { ...PHOTO, visible: false } });
    renderStage();
    await act(async () => {});
    expect(screen.queryByTestId("background-photo")).not.toBeInTheDocument();
  });

  it("reads the saved image back after a reload, and revokes its URL when it changes", async () => {
    usePhotoImage.setState({ blob: null });
    vi.mocked(loadBackgroundImage).mockResolvedValue(new Blob(["saved"]));
    renderStage();
    expect(await screen.findByTestId("background-photo")).toBeInTheDocument();
    expect(loadBackgroundImage).toHaveBeenCalledOnce();
    act(() => usePhotoImage.setState({ blob: new Blob(["replaced"]) }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
  });
});

describe("Photo mode gestures", () => {
  it("one pointer pans; the store is written once, on lift", async () => {
    usePlannerStore.setState({ mode: "photo" });
    const { stage } = renderStage();
    const writes = vi.fn();
    const off = usePlannerStore.subscribe((s, prev) => s.background !== prev.background && writes());
    down(stage, 1, 300, 200);
    firePointer("pointermove", 1, 320, 210);
    firePointer("pointermove", 1, 340, 220);
    expect(writes).not.toHaveBeenCalled();
    firePointer("pointerup", 1, 340, 220);
    off();
    expect(writes).toHaveBeenCalledOnce();
    expect(bg()).toMatchObject({ x: PHOTO.x + 20, y: PHOTO.y + 10, width: 400 });
  });

  it("treats pointercancel like a lift", () => {
    usePlannerStore.setState({ mode: "photo" });
    const { stage } = renderStage();
    down(stage, 1, 300, 200, "mouse");
    firePointer("pointermove", 1, 310, 200);
    firePointer("pointercancel", 1, 310, 200);
    expect(bg().x).toBe(PHOTO.x + 5);
  });

  it("two pointers pinch about their midpoint", () => {
    usePlannerStore.setState({ mode: "photo" });
    const { stage } = renderStage();
    // Midpoint at client (400, 250) = wall cm (150, 100).
    down(stage, 1, 350, 250);
    down(stage, 2, 450, 250);
    firePointer("pointermove", 1, 300, 250);
    firePointer("pointermove", 2, 500, 250);
    firePointer("pointerup", 1, 300, 250);
    firePointer("pointerup", 2, 500, 250);
    // Distance 100 → 200 px: twice the width, the image point under (150, 100) cm stays there.
    expect(bg().width).toBeCloseTo(800);
    expect((150 - bg().x) / bg().width).toBeCloseTo((150 - PHOTO.x) / PHOTO.width);
    expect((100 - bg().y) / bg().width).toBeCloseTo((100 - PHOTO.y) / PHOTO.width);
  });

  it("the wheel zooms about the cursor and commits once it settles", () => {
    vi.useFakeTimers();
    usePlannerStore.setState({ mode: "photo" });
    const { stage } = renderStage();
    const wheel = new WheelEvent("wheel", { deltaY: -100, clientX: 100, clientY: 50, cancelable: true });
    stage.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    stage.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, clientX: 100, clientY: 50, cancelable: true }));
    expect(bg().width).toBe(400);
    act(() => void vi.advanceTimersByTime(150));
    expect(bg().width).toBeGreaterThan(400);
    // About the wall's top-left corner (the cursor): the corner's image point stays put.
    expect(-bg().x / bg().width).toBeCloseTo(-PHOTO.x / PHOTO.width);
  });

  it("does nothing outside Photo mode, or without a photo", () => {
    const { stage } = renderStage();
    down(stage, 1, 300, 200);
    firePointer("pointermove", 1, 340, 200);
    firePointer("pointerup", 1, 340, 200);
    const wheel = new WheelEvent("wheel", { deltaY: -100, cancelable: true });
    stage.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
    act(() => usePlannerStore.setState({ mode: "photo", background: DEFAULT_BACKGROUND }));
    down(stage, 2, 300, 200);
    firePointer("pointermove", 2, 340, 200);
    firePointer("pointerup", 2, 340, 200);
    expect(bg()).toEqual(DEFAULT_BACKGROUND);
  });

  it("ignores the right mouse button", () => {
    usePlannerStore.setState({ mode: "photo" });
    const { stage } = renderStage();
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 300, clientY: 200, button: 2, pointerType: "mouse" });
    firePointer("pointermove", 1, 340, 200);
    firePointer("pointerup", 1, 340, 200);
    expect(bg().x).toBe(PHOTO.x);
  });
});
