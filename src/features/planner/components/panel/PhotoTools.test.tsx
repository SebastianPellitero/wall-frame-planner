import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/imageStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/imageStore")>()),
  downscaleImage: vi.fn(),
  saveBackgroundImage: vi.fn(),
  deleteBackgroundImage: vi.fn(),
}));

import { DEFAULT_BACKGROUND } from "../../defaults";
import type { Shell } from "../../hooks/useShell";
import { deleteBackgroundImage, downscaleImage, saveBackgroundImage } from "../../lib/imageStore";
import { initialProject, initialUi } from "../../state/actions";
import { usePhotoImage } from "../../state/photoImage";
import { usePlannerStore } from "../../state/store";
import type { Background } from "../../types";
import { PhotoSettings } from "./PhotoSettings";
import { PhotoTools } from "./PhotoTools";

const PHOTO: Background = { ...DEFAULT_BACKGROUND, hasImage: true, x: 0, y: -25, width: 300, aspect: 1, opacity: 0.6 };
const SHELLS: Shell[] = ["stacked", "landscape", "desktop"];
const bg = () => usePlannerStore.getState().background;
const tools = () => screen.getByRole("region", { name: "Photo tools" });

beforeEach(() => {
  vi.mocked(downscaleImage).mockReset();
  vi.mocked(saveBackgroundImage).mockReset();
  vi.mocked(deleteBackgroundImage).mockReset().mockResolvedValue();
  usePlannerStore.setState({ ...initialProject(), ...initialUi, mode: "photo", background: PHOTO });
  usePhotoImage.setState({ blob: new Blob(["img"]) });
});

describe("PhotoTools", () => {
  it.each(SHELLS)("names its region Photo tools and every control once (%s)", (shell) => {
    render(<PhotoTools shell={shell} />);
    const t = within(tools());
    expect(t.getByRole("slider", { name: "Opacity" })).toBeInTheDocument();
    expect(t.getByRole("slider", { name: "Scale" })).toBeInTheDocument();
    expect(t.getByRole("button", { name: "Replace photo" })).toBeInTheDocument();
    expect(t.getByRole("switch", { name: "Show photo" })).toHaveAttribute("aria-checked", "true");
    expect(t.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
    expect(t.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(t.queryByRole("button", { name: "Upload photo" })).not.toBeInTheDocument();
  });

  it.each(SHELLS)("with no photo, offers only Upload photo and Done (%s)", (shell) => {
    usePlannerStore.setState({ background: DEFAULT_BACKGROUND });
    render(<PhotoTools shell={shell} />);
    const t = within(tools());
    expect(t.getByText("Add a photo of your wall to line frames up with it.")).toBeInTheDocument();
    expect(t.getByRole("button", { name: "Upload photo" })).toBeInTheDocument();
    expect(t.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(t.queryByRole("slider")).not.toBeInTheDocument();
    expect(t.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("the Opacity slider writes 0–1 to the store, in 5% steps", () => {
    render(<PhotoTools shell="desktop" />);
    const slider = screen.getByRole("slider", { name: "Opacity" });
    expect(slider).toHaveValue("60");
    expect(slider).toHaveAttribute("step", "5");
    expect(slider).toHaveAttribute("aria-valuetext", "60%");
    fireEvent.change(slider, { target: { value: "35" } });
    expect(bg().opacity).toBeCloseTo(0.35);
  });

  it("the Scale slider maps log2 of the wall width and scales about the wall's center", () => {
    render(<PhotoTools shell="landscape" />);
    const slider = screen.getByRole("slider", { name: "Scale" });
    expect(slider).toHaveAttribute("min", "-2");
    expect(slider).toHaveAttribute("max", "2");
    expect(slider).toHaveValue("0");
    expect(slider).toHaveAttribute("aria-valuetext", "100%");
    fireEvent.change(slider, { target: { value: "1" } });
    // 2× about the wall center (150, 125): x 0 → −150, y −25 → −175.
    expect(bg()).toMatchObject({ width: 600, x: -150, y: -175 });
    expect(slider).toHaveAttribute("aria-valuetext", "200%");
  });

  it("Show photo toggles visibility (an icon switch on phones)", async () => {
    render(<PhotoTools shell="stacked" />);
    const toggle = screen.getByRole("switch", { name: "Show photo" });
    expect(toggle).toHaveAttribute("title", "Show photo");
    await userEvent.click(toggle);
    expect(bg().visible).toBe(false);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("Done returns to Arrange", async () => {
    render(<PhotoTools shell="stacked" />);
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(usePlannerStore.getState().mode).toBe("arrange");
  });

  it("Remove photo asks first; Cancel keeps the photo, Remove photo resets it", async () => {
    render(<PhotoTools shell="landscape" />);
    await userEvent.click(within(tools()).getByRole("button", { name: "Remove photo" }));
    const dialog = screen.getByRole("alertdialog", { name: "Remove the photo?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(bg()).toEqual(PHOTO);
    expect(deleteBackgroundImage).not.toHaveBeenCalled();

    await userEvent.click(within(tools()).getByRole("button", { name: "Remove photo" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove photo" }));
    await waitFor(() => expect(bg()).toEqual(DEFAULT_BACKGROUND));
    expect(deleteBackgroundImage).toHaveBeenCalledOnce();
    expect(usePhotoImage.getState().blob).toBeNull();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it.each(SHELLS)("after Remove photo, focus lands on Upload photo, as the trash button is gone (%s)", async (shell) => {
    render(<PhotoTools shell={shell} />);
    await userEvent.click(within(tools()).getByRole("button", { name: "Remove photo" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove photo" }));
    await waitFor(() => expect(within(tools()).getByRole("button", { name: "Upload photo" })).toHaveFocus());
  });

  it("Upload: downscale → save → cover placement → Photo mode, busy meanwhile", async () => {
    usePlannerStore.setState({ mode: "arrange", background: DEFAULT_BACKGROUND });
    const order: string[] = [];
    let finishSave!: () => void;
    vi.mocked(downscaleImage).mockImplementation(async () => {
      order.push("downscale");
      return { blob: new Blob(["small"]), width: 1000, height: 2000 };
    });
    vi.mocked(saveBackgroundImage).mockImplementation(() => {
      order.push("save");
      return new Promise<void>((r) => (finishSave = r));
    });
    render(<PhotoTools shell="desktop" />);
    const button = screen.getByRole("button", { name: "Upload photo" });
    const input = tools().querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input).toHaveAttribute("accept", "image/*");
    const click = vi.spyOn(input, "click");
    await userEvent.click(button);
    expect(click).toHaveBeenCalled();

    await userEvent.upload(input, new File(["raw"], "wall.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
    await act(async () => finishSave());
    await waitFor(() => expect(usePlannerStore.getState().mode).toBe("photo"));
    expect(order).toEqual(["downscale", "save"]);
    expect(bg()).toEqual({ hasImage: true, x: 0, y: -175, width: 300, aspect: 2, opacity: 1, visible: true });
  });
});

describe("PhotoSettings", () => {
  it("is the Photo settings region with Replace, Show photo, Opacity, Adjust and Remove", () => {
    usePlannerStore.setState({ mode: "arrange" });
    render(<PhotoSettings />);
    const s = within(screen.getByRole("region", { name: "Photo settings" }));
    expect(s.getByRole("heading", { name: "Photo" })).toBeInTheDocument();
    expect(s.getByRole("button", { name: "Replace photo" })).toBeInTheDocument();
    expect(s.getByRole("switch", { name: "Show photo" })).toBeInTheDocument();
    expect(s.getByRole("slider", { name: "Opacity" })).toBeInTheDocument();
    expect(s.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
    expect(s.queryByRole("slider", { name: "Scale" })).not.toBeInTheDocument();
  });

  it("Adjust photo enters Photo mode and tells the sheet to close", async () => {
    usePlannerStore.setState({ mode: "arrange" });
    const onEnterPhoto = vi.fn();
    render(<PhotoSettings onEnterPhoto={onEnterPhoto} />);
    await userEvent.click(screen.getByRole("button", { name: "Adjust photo" }));
    expect(usePlannerStore.getState().mode).toBe("photo");
    expect(onEnterPhoto).toHaveBeenCalledOnce();
  });

  it("hides Adjust photo while already in Photo mode", () => {
    render(<PhotoSettings />);
    expect(screen.queryByRole("button", { name: "Adjust photo" })).not.toBeInTheDocument();
  });

  it("with no photo, offers Upload photo, which closes the sheet once the photo is in", async () => {
    usePlannerStore.setState({ mode: "arrange", background: DEFAULT_BACKGROUND });
    vi.mocked(downscaleImage).mockResolvedValue({ blob: new Blob(["s"]), width: 600, height: 500 });
    vi.mocked(saveBackgroundImage).mockResolvedValue();
    const onEnterPhoto = vi.fn();
    render(<PhotoSettings onEnterPhoto={onEnterPhoto} />);
    const s = screen.getByRole("region", { name: "Photo settings" });
    expect(within(s).queryByRole("switch")).not.toBeInTheDocument();
    await userEvent.upload(s.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["raw"], "w.png", { type: "image/png" }));
    await waitFor(() => expect(onEnterPhoto).toHaveBeenCalledOnce());
    expect(usePlannerStore.getState().mode).toBe("photo");
  });
});
