import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
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
    const last = within(d).getByRole("button", { name: "Set origin on the wall" });
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
