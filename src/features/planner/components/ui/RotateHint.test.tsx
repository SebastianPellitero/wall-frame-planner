import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ROTATE_HINT_KEY, RotateHint } from "./RotateHint";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RotateHint", () => {
  it("uses the documented storage key", () => {
    expect(ROTATE_HINT_KEY).toBe("wallplanner:ui:rotateHintDismissed");
  });

  it("shows until dismissed, and stays dismissed on the next visit", async () => {
    const { unmount } = render(<RotateHint />);
    expect(screen.getByText("Rotate for a bigger wall")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Rotate for a bigger wall")).not.toBeInTheDocument();
    expect(localStorage.getItem(ROTATE_HINT_KEY)).toBe("1");

    unmount();
    render(<RotateHint />);
    expect(screen.queryByText("Rotate for a bigger wall")).not.toBeInTheDocument();
  });

  it("still works when localStorage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<RotateHint />);
    expect(screen.getByText("Rotate for a bigger wall")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Rotate for a bigger wall")).not.toBeInTheDocument();
  });
});
