import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Shell } from "../../hooks/useShell";
import { initialProject, initialUi } from "../../state/actions";
import { useAnnouncer } from "../../state/announcer";
import { uploadFramePhoto } from "../../state/framePhotoCommands";
import { useSelectionUi } from "../../state/selectionUi";
import { usePlannerStore } from "../../state/store";
import { emptyToastQueue, useToasts } from "../../state/toasts";
import type { Shape } from "../../types";
import { WallContext } from "../wall/WallContext";
import { SelectionBar } from "./SelectionBar";

vi.mock("../../state/framePhotoCommands", () => ({ uploadFramePhoto: vi.fn() }));
const upload = vi.mocked(uploadFramePhoto);

const PHOTO = { imageId: "img", aspect: 0.75, zoom: 1, focusX: 0.5, focusY: 0.5 };
const PLAIN: Shape = { id: "a", kind: "rect", x: 20, y: 30, w: 40, h: 50, color: 4, mat: true };
const WITH_PHOTO: Shape = { ...PLAIN, photo: PHOTO };

/** The bar plus a stand-in frame element, so Adjust has a frame to focus. */
function renderBar(shell: Shell, shape: Shape = PLAIN) {
  usePlannerStore.setState({ shapes: [shape], selectedId: shape.id });
  usePlannerStore.temporal.getState().clear();
  const value = { pxPerCm: 2, wallRef: createRef<HTMLDivElement>(), wallPx: { w: 600, h: 500 } };
  return render(
    <WallContext value={value}>
      <div role="button" tabIndex={0} data-shape-id={shape.id} aria-label="frame" />
      <SelectionBar shell={shell} />
    </WallContext>,
  );
}

const bar = () => within(screen.getByRole("region", { name: "Selected frame" }));
const button = (name: string) => bar().getByRole("button", { name });
const current = () => usePlannerStore.getState().shapes[0];
const steps = () => usePlannerStore.temporal.getState().pastStates.length;
/** The stacked dock shows the photo controls behind its Photo tab. */
const openPhotoTab = (shell: Shell) => {
  if (shell === "stacked") fireEvent.click(bar().getByRole("tab", { name: "Photo" }));
};

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  useSelectionUi.setState({ adjustingId: null, previewZoom: null, detailsTab: "size" });
  useAnnouncer.setState({ text: "", id: 0 });
  useToasts.setState(emptyToastQueue());
  upload.mockReset();
});

const SHELLS = ["stacked", "landscape", "desktop"] as const;

describe("SelectionBar frame photo controls (§4.7)", () => {
  it.each(SHELLS)("a frame without a photo offers Add photo and the Mat switch only (%s)", (shell) => {
    renderBar(shell);
    openPhotoTab(shell);
    expect(button("Add photo to frame")).toHaveTextContent("Add photo");
    expect(bar().getByRole("switch", { name: "Mat" })).toHaveAttribute("aria-checked", "true");
    for (const name of ["Replace frame photo", "Adjust frame photo", "Remove frame photo"]) {
      expect(bar().queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it.each(SHELLS)("a frame with a photo offers Replace, Adjust and Remove (%s)", (shell) => {
    renderBar(shell, WITH_PHOTO);
    openPhotoTab(shell);
    expect(bar().queryByRole("button", { name: "Add photo to frame" })).not.toBeInTheDocument();
    for (const name of ["Replace frame photo", "Adjust frame photo", "Remove frame photo"]) expect(button(name)).toBeInTheDocument();
  });

  it.each(SHELLS)("Mat switches the frame's mat in one undo step (%s)", (shell) => {
    renderBar(shell);
    openPhotoTab(shell);
    fireEvent.click(bar().getByRole("switch", { name: "Mat" }));
    expect(current().mat).toBe(false);
    expect(bar().getByRole("switch", { name: "Mat" })).toHaveAttribute("aria-checked", "false");
    expect(steps()).toBe(1);
  });

  it("landscape: Duplicate, Delete and Mat are the rail's three borderless icons, Mat swapping its icon", () => {
    renderBar("landscape");
    const mat = bar().getByRole("switch", { name: "Mat" });
    const row = mat.parentElement!;
    expect(row).toHaveClass("grid-cols-3");
    expect(within(row).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Duplicate", "Delete"]);
    expect(mat).toHaveAttribute("title", "Mat");
    fireEvent.click(mat);
    expect(mat).toHaveClass("text-ink-muted");
  });

  it.each(SHELLS)("Remove clears the photo, says so, and moves focus to Add photo; Undo brings it back (%s)", (shell) => {
    renderBar(shell, WITH_PHOTO);
    openPhotoTab(shell);
    const remove = button("Remove frame photo");
    remove.focus();
    fireEvent.click(remove);
    expect(current().photo).toBeUndefined();
    expect(useAnnouncer.getState().text).toBe("Photo removed");
    expect(document.activeElement).toBe(button("Add photo to frame"));
    act(() => usePlannerStore.temporal.getState().undo());
    expect(current().photo).toEqual(PHOTO);
  });

  it("Add photo is busy while the photo is processed, then announces the result", async () => {
    let finish!: (r: "added") => void;
    upload.mockReturnValue(new Promise((r) => (finish = r)));
    renderBar("desktop");
    const add = button("Add photo to frame");
    const input = add.nextElementSibling as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/*");
    fireEvent.change(input, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
    expect(add).toHaveAttribute("aria-busy", "true");
    expect(upload).toHaveBeenCalledWith("a", expect.any(File));
    await act(async () => finish("added"));
    expect(add).toHaveAttribute("aria-busy", "false");
    expect(useAnnouncer.getState().text).toBe("Photo added");
  });

  it("Replace announces 'Photo replaced'; a frame gone meanwhile says nothing", async () => {
    upload.mockResolvedValueOnce("replaced").mockResolvedValueOnce("frame-gone");
    renderBar("desktop", WITH_PHOTO);
    const input = button("Replace frame photo").nextElementSibling as HTMLInputElement;
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    await act(async () => void fireEvent.change(input, { target: { files: [file] } }));
    expect(useAnnouncer.getState().text).toBe("Photo replaced");
    useAnnouncer.setState({ text: "", id: 0 });
    await act(async () => void fireEvent.change(input, { target: { files: [file] } }));
    expect(useAnnouncer.getState().text).toBe("");
  });

  it("a file that can't be decoded shows the existing toast and changes nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    upload.mockRejectedValue(new Error("decode"));
    renderBar("desktop");
    const input = button("Add photo to frame").nextElementSibling as HTMLInputElement;
    await act(async () => void fireEvent.change(input, { target: { files: [new File(["x"], "a.txt")] } }));
    expect(useToasts.getState().toasts).toMatchObject([{ key: "photo-unreadable", tone: "error", message: "That file couldn't be opened as an image." }]);
    expect(current().photo).toBeUndefined();
  });
});

describe("SelectionBar in adjust mode (§5.17)", () => {
  it.each(SHELLS)("Adjust enters adjust mode, focuses the frame and shows the hint, Zoom and Done (%s)", (shell) => {
    renderBar(shell, WITH_PHOTO);
    openPhotoTab(shell);
    fireEvent.click(button("Adjust frame photo"));
    expect(useSelectionUi.getState().adjustingId).toBe("a");
    expect(document.activeElement).toHaveAttribute("data-shape-id", "a");
    expect(useAnnouncer.getState().text).toBe("Adjusting photo. Drag or use the arrow keys to move it, Escape to finish.");
    const zoom = bar().getByRole("slider", { name: "Zoom" });
    expect(zoom).toHaveAttribute("aria-valuetext", "100%");
    expect(zoom).toHaveAttribute("min", "100");
    expect(zoom).toHaveAttribute("max", "400");
    expect(bar().getByText("Drag the photo to move it. Pinch to zoom.")).toBeInTheDocument();
    expect(bar().getByText("Drag the photo to move it, or use the arrow keys.")).toHaveClass("hidden", "can-hover:inline");
    expect(bar().queryByRole("button", { name: "Adjust frame photo" })).not.toBeInTheDocument();
  });

  it.each(SHELLS)("Done exits and returns focus to Adjust (%s)", (shell) => {
    renderBar(shell, WITH_PHOTO);
    openPhotoTab(shell);
    fireEvent.click(button("Adjust frame photo"));
    fireEvent.click(button("Done"));
    expect(useSelectionUi.getState().adjustingId).toBeNull();
    expect(document.activeElement).toBe(button("Adjust frame photo"));
  });

  it("the Zoom slider previews live and commits once on release", async () => {
    renderBar("desktop", WITH_PHOTO);
    fireEvent.click(button("Adjust frame photo"));
    const zoom = bar().getByRole("slider", { name: "Zoom" });
    fireEvent.input(zoom, { target: { value: "150" } });
    expect(useSelectionUi.getState().previewZoom).toBe(1.5);
    expect(zoom).toHaveAttribute("aria-valuetext", "150%");
    expect(current().photo!.zoom).toBe(1);
    fireEvent.change(zoom, { target: { value: "160" } });
    await waitFor(() => expect(current().photo!.zoom).toBe(1.6));
    expect(useSelectionUi.getState().previewZoom).toBeNull();
    expect(steps()).toBe(1);
  });

  it("desktop keeps the rest of Selected frame while adjusting; the landscape rail shows only the tools", () => {
    const { unmount } = renderBar("desktop", WITH_PHOTO);
    fireEvent.click(button("Adjust frame photo"));
    expect(bar().getByRole("group", { name: "Frame photo" })).toContainElement(button("Done"));
    expect(bar().getByRole("textbox", { name: "Width (cm)" })).toBeInTheDocument();
    expect(button("Delete")).toBeEnabled();
    unmount();
    renderBar("landscape", WITH_PHOTO);
    act(() => useSelectionUi.setState({ adjustingId: "a" }));
    expect(bar().queryByRole("textbox", { name: "Width (cm)" })).not.toBeInTheDocument();
    expect(button("Done")).toHaveClass("mt-auto", "w-full");
  });

  it("stacked: the tools replace both dock rows", () => {
    renderBar("stacked", WITH_PHOTO);
    act(() => useSelectionUi.setState({ adjustingId: "a" }));
    expect(bar().queryByRole("tablist")).not.toBeInTheDocument();
    expect(bar().queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
    expect(bar().getByRole("slider", { name: "Zoom" })).toBeInTheDocument();
  });
});

describe("SelectionBar stacked details tabs (§4.2, §4.7)", () => {
  it("Size | Photo is a tablist; Size is selected by default and labels the panel", () => {
    renderBar("stacked");
    const tabs = bar().getByRole("tablist", { name: "Frame details" });
    const size = within(tabs).getByRole("tab", { name: "Size" });
    expect(size).toHaveAttribute("aria-selected", "true");
    expect(size).toHaveAttribute("tabindex", "0");
    expect(within(tabs).getByRole("tab", { name: "Photo" })).toHaveAttribute("tabindex", "-1");
    const panel = bar().getByRole("tabpanel", { name: "Size" });
    expect(size).toHaveAttribute("aria-controls", panel.id);
    expect(within(panel).getByRole("textbox", { name: "Width (cm)" })).toBeInTheDocument();
  });

  it("arrow keys move and activate; the tab is kept across selections", () => {
    renderBar("stacked");
    const size = bar().getByRole("tab", { name: "Size" });
    size.focus();
    fireEvent.keyDown(size, { key: "ArrowRight" });
    const photo = bar().getByRole("tab", { name: "Photo" });
    expect(photo).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(photo);
    expect(bar().getByRole("tabpanel", { name: "Photo" })).toContainElement(button("Add photo to frame"));
    act(() => {
      usePlannerStore.getState().select(null);
      usePlannerStore.getState().select("a");
    });
    expect(bar().getByRole("tab", { name: "Photo" })).toHaveAttribute("aria-selected", "true");
  });

  it("below 640px Duplicate, Delete, Replace and Remove go icon-only, named by aria-label and title", () => {
    renderBar("stacked", WITH_PHOTO);
    openPhotoTab("stacked");
    for (const name of ["Duplicate", "Delete", "Replace frame photo", "Remove frame photo"]) {
      const b = button(name);
      expect(b).toHaveAttribute("title", name);
      expect(b).toHaveClass("max-sm:w-touch", "max-sm:px-0");
      expect(b.querySelector("span")).toHaveClass("max-sm:hidden");
    }
    // Adjust keeps its label.
    expect(button("Adjust frame photo")).toHaveTextContent("Adjust");
    expect(button("Adjust frame photo")).not.toHaveClass("max-sm:px-0");
  });
});
