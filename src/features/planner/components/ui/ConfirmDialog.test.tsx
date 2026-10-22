import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { isModalOpen } from "../../state/modalUi";
import { ConfirmDialog } from "./ConfirmDialog";

function Harness({ onConfirm = () => {} }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Remove photo
      </button>
      <ConfirmDialog
        open={open}
        title="Remove the photo?"
        confirmLabel="Remove photo"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(isModalOpen()).toBe(false);
  });

  it("is a named alertdialog with Cancel focused first and the danger action last (§5.11)", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    const dialog = screen.getByRole("alertdialog", { name: "Remove the photo?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(cancel).toHaveFocus();
    const buttons = [...dialog.querySelectorAll("button")].map((b) => b.textContent);
    expect(buttons).toEqual(["Cancel", "Remove photo"]);
    expect(dialog.querySelectorAll("button")[1]).toHaveClass("bg-danger", "text-on-danger");
    expect(isModalOpen()).toBe(true);
  });

  it("traps Tab, cancels on Esc and returns focus to the opener", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    const opener = screen.getByRole("button", { name: "Remove photo" });
    await userEvent.click(opener);
    const dialog = screen.getByRole("alertdialog");
    await userEvent.tab();
    expect(dialog.querySelectorAll("button")[1]).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(opener).toHaveFocus();
    expect(isModalOpen()).toBe(false);
  });

  it("confirms", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(dialog.querySelectorAll("button")[1]);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
