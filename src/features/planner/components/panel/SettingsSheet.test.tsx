import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createRef } from "react";
import { useShortcuts } from "../../hooks/useShortcuts";
import type { Shell } from "../../hooks/useShell";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
import { ContextPanel } from "../ContextPanel";
import { WallContext } from "../wall/WallContext";
import { SettingsSheet } from "./SettingsSheet";

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
});

const settingsButton = () => screen.getByRole("button", { name: "Settings" });
const dialog = () => screen.getByRole("dialog", { name: "Settings" });

async function open(shell: "stacked" | "landscape" = "stacked") {
  render(<SettingsSheet shell={shell} />);
  await userEvent.click(settingsButton());
  return dialog();
}

const expectClosed = () => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

describe("SettingsSheet", () => {
  it("opens a modal dialog labelled by its title and moves focus into it", async () => {
    expect(render(<SettingsSheet shell="stacked" />).container).toBeTruthy();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(settingsButton());
    const d = dialog();
    expect(d).toHaveAttribute("aria-modal", "true");
    expect(within(d).getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(within(d).getByRole("button", { name: "Close settings" })).toHaveFocus();
    expect(settingsButton()).toHaveAttribute("aria-expanded", "true");
  });

  it("Esc closes it and returns focus to the Settings button", async () => {
    await open();
    await userEvent.keyboard("{Escape}");
    await expectClosed();
    expect(settingsButton()).toHaveFocus();
  });

  it("Esc inside a field only reverts the field", async () => {
    const d = await open();
    const width = within(d).getByRole("textbox", { name: "Wall width (cm)" });
    await userEvent.click(width);
    await userEvent.type(width, "12");
    await userEvent.keyboard("{Escape}");
    expect(dialog()).toBeInTheDocument();
    expect(width).toHaveValue("300");
  });

  it("the close button and a scrim tap close it", async () => {
    const d = await open();
    await userEvent.click(within(d).getByRole("button", { name: "Close settings" }));
    await expectClosed();
    expect(settingsButton()).toHaveFocus();

    await userEvent.click(settingsButton());
    fireEvent.click(screen.getByTestId("settings-scrim"));
    await expectClosed();
  });

  it("traps focus: Tab wraps from the last control to the first and Shift+Tab back", async () => {
    const d = await open();
    const close = within(d).getByRole("button", { name: "Close settings" });
    // Reset wall is the last control in the content (§5.6).
    const last = within(d).getByRole("button", { name: "Reset wall" });
    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
  });

  it("holds Wall and Grid, with the Matrix control on stacked only", async () => {
    const d = await open("stacked");
    expect(within(d).getByRole("region", { name: "Wall" })).toBeInTheDocument();
    expect(within(d).getByRole("region", { name: "Matrix control" })).toBeInTheDocument();
    expect(within(d).getByTestId("settings-body")).toHaveClass("overflow-y-auto", "overscroll-contain", "touch-pan-y");
    expect(within(d).getByTestId("settings-header")).toHaveClass("touch-none");
  });

  it("landscape: a side sheet with no Matrix control and no drag handle", async () => {
    const d = await open("landscape");
    expect(d).toHaveClass("rounded-l-sheet");
    expect(within(d).queryByRole("region", { name: "Matrix control" })).not.toBeInTheDocument();
    expect(within(d).queryByTestId("sheet-handle")).not.toBeInTheDocument();
  });

  it("Remove photo opens the confirm dialog above the sheet, which owns Esc and Tab until it closes", async () => {
    usePlannerStore.setState({ background: { ...initialProject().background, hasImage: true } });
    const d = await open();
    const remove = within(d).getByRole("button", { name: "Remove photo" });
    await userEvent.click(remove);
    const confirm = screen.getByRole("alertdialog", { name: "Remove the photo?" });
    const cancel = within(confirm).getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(within(confirm).getByRole("button", { name: "Remove photo" })).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
    expect(remove).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expectClosed();
  });

  it("after Remove photo in the sheet, focus stays in the sheet, on Upload photo", async () => {
    usePlannerStore.setState({ background: { ...initialProject().background, hasImage: true } });
    const d = await open();
    await userEvent.click(within(d).getByRole("button", { name: "Remove photo" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove photo" }));
    await waitFor(() => expect(within(d).getByRole("button", { name: "Upload photo" })).toHaveFocus());
    expect(dialog()).toBeInTheDocument();
    expect(usePlannerStore.getState().background.hasImage).toBe(false);
  });

  it("Reset wall, once confirmed, resets the project, closes the sheet and returns focus to Settings", async () => {
    usePlannerStore.getState().addShape("rect");
    const d = await open();
    await userEvent.click(within(d).getByRole("button", { name: "Reset wall" }));
    await userEvent.click(within(screen.getByRole("alertdialog", { name: "Reset the wall?" })).getByRole("button", { name: "Reset wall" }));
    await expectClosed();
    expect(settingsButton()).toHaveFocus();
    expect(usePlannerStore.getState().shapes).toEqual([]);
  });

  it("'Set origin on the wall' closes the sheet and enters Grid origin mode", async () => {
    const d = await open();
    await userEvent.click(within(d).getByRole("button", { name: "Set origin on the wall" }));
    await expectClosed();
    expect(usePlannerStore.getState().mode).toBe("gridOrigin");
  });

  it("changes made in the sheet reach the store right away", async () => {
    const d = await open();
    act(() => void within(d).getByRole("switch", { name: "Show grid" }).click());
    expect(usePlannerStore.getState().grid.enabled).toBe(true);
  });
});

describe("SettingsSheet, with focus fallen to <body> (a tap on a caption or label)", () => {
  function WithShortcuts() {
    useShortcuts();
    return <SettingsSheet shell="stacked" />;
  }

  async function openThenDropFocus() {
    usePlannerStore.setState({ shapes: [{ id: "a", kind: "rect", x: 20, y: 30, w: 40, h: 50, color: 1, mat: true }], selectedId: "a" });
    render(<WithShortcuts />);
    await userEvent.click(settingsButton());
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).toBe(document.body);
    return dialog();
  }

  it("a tap on non-focusable content focuses the dialog itself", async () => {
    const d = await openThenDropFocus();
    expect(d).toHaveAttribute("tabindex", "-1");
  });

  it("Tab and Shift+Tab land inside the dialog", async () => {
    const d = await openThenDropFocus();
    await userEvent.tab();
    expect(within(d).getByRole("button", { name: "Close settings" })).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    await userEvent.tab({ shift: true });
    expect(within(d).getByRole("button", { name: "Reset wall" })).toHaveFocus();
  });

  it("Esc still closes it", async () => {
    await openThenDropFocus();
    await userEvent.keyboard("{Escape}");
    await expectClosed();
    expect(settingsButton()).toHaveFocus();
  });

  it("Delete and arrows do not reach the selected frame behind the sheet", async () => {
    await openThenDropFocus();
    fireEvent.keyDown(document.body, { key: "Delete" });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(usePlannerStore.getState().shapes).toEqual([expect.objectContaining({ id: "a", x: 20 })]);
  });

  it("focus moving out to the page behind is pulled back into the dialog", async () => {
    const d = await openThenDropFocus();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    act(() => outside.focus());
    expect(d.contains(document.activeElement)).toBe(true);
    outside.remove();
  });
});

describe("Matrix control, once per shell", () => {
  it.each(["stacked", "landscape"] as const)("the context panel and the open sheet together hold one Matrix control (%s)", async (shell: Shell) => {
    const value = { pxPerCm: 2, wallRef: createRef<HTMLDivElement>(), wallPx: { w: 600, h: 500 } };
    render(
      <WallContext value={value}>
        <ContextPanel shell={shell} />
        <SettingsSheet shell={shell as "stacked" | "landscape"} />
      </WallContext>,
    );
    await userEvent.click(settingsButton());
    expect(screen.getAllByRole("region", { name: "Matrix control" })).toHaveLength(1);
    expect(screen.getAllByRole("switch", { name: "Show grid" })).toHaveLength(1);
    expect(screen.getAllByRole("textbox", { name: "Grid width (cm)" })).toHaveLength(1);
  });
});
