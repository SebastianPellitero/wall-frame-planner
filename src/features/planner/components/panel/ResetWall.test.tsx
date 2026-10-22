import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/imageStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/imageStore")>();
  return { ...actual, deleteBackgroundImage: vi.fn(async () => {}) };
});

import { DEFAULT_BACKGROUND, DEFAULT_WALL } from "../../defaults";
import * as imageStore from "../../lib/imageStore";
import { initialProject, initialUi } from "../../state/actions";
import { isModalOpen } from "../../state/modalUi";
import { usePlannerStore } from "../../state/store";
import { emptyToastQueue, useToasts } from "../../state/toasts";
import { textColors } from "../ui/textColors.testUtil";
import { ResetWall } from "./ResetWall";

const mocked = vi.mocked(imageStore);

beforeEach(() => {
  vi.clearAllMocks();
  useToasts.setState(emptyToastQueue());
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
  const s = usePlannerStore.getState();
  s.addShape("rect");
  s.setWall({ width: 400 });
  s.setBackground({ hasImage: true, opacity: 0.4 });
});

const dialog = () => within(screen.getByRole("alertdialog", { name: "Reset the wall?" }));

describe("ResetWall", () => {
  it("is a danger-red secondary button that opens the confirm dialog, registered as a modal", async () => {
    render(<ResetWall />);
    const button = screen.getByRole("button", { name: "Reset wall" });
    expect(textColors(button.className)).toEqual(["text-danger"]);
    await userEvent.click(button);
    expect(dialog().getByText(/Every frame and the photo are removed/)).toBeInTheDocument();
    expect(dialog().getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(isModalOpen()).toBe(true);
  });

  it("Reset wall in the dialog restores the defaults, deletes the photo, then calls onDone", async () => {
    const onDone = vi.fn();
    render(<ResetWall onDone={onDone} />);
    await userEvent.click(screen.getByRole("button", { name: "Reset wall" }));
    await userEvent.click(dialog().getByRole("button", { name: "Reset wall" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(isModalOpen()).toBe(false);
    const s = usePlannerStore.getState();
    expect(s.shapes).toEqual([]);
    expect(s.wall).toEqual(DEFAULT_WALL);
    expect(s.background).toEqual(DEFAULT_BACKGROUND);
    expect(mocked.deleteBackgroundImage).toHaveBeenCalledTimes(1);
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(["Wall reset."]);
    expect(onDone).toHaveBeenCalledTimes(1);
    // The dialog hands focus back to the button before onDone runs.
    await waitFor(() => expect(screen.getByRole("button", { name: "Reset wall" })).toHaveFocus());
  });

  it("Cancel changes nothing", async () => {
    const onDone = vi.fn();
    render(<ResetWall onDone={onDone} />);
    await userEvent.click(screen.getByRole("button", { name: "Reset wall" }));
    await userEvent.click(dialog().getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(usePlannerStore.getState().shapes).toHaveLength(1);
    expect(usePlannerStore.getState().wall.width).toBe(400);
    expect(mocked.deleteBackgroundImage).not.toHaveBeenCalled();
    expect(useToasts.getState().toasts).toEqual([]);
    expect(onDone).not.toHaveBeenCalled();
  });
});
