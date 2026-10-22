import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toastMs } from "../../lib/physics";
import { storageEvents } from "../../state/storageEvents";
import { STORAGE_COPY } from "../../state/storageToasts";
import { emptyToastQueue, showToast, useToasts } from "../../state/toasts";
import { ToastRegion } from "./ToastRegion";

beforeEach(() => useToasts.setState(emptyToastQueue()));
afterEach(() => vi.useRealTimers());

// Only timeouts are faked (the auto-dismiss); motion's frame loop keeps real time.
const fakeTimeouts = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
/** Back on real time, the exit fade finishes and the toast unmounts. */
const gone = (text: string) => {
  vi.useRealTimers();
  return waitFor(() => expect(screen.queryByText(text)).not.toBeInTheDocument());
};

describe("ToastRegion", () => {
  it("is a polite live region that shows storage events, including ones fired before it mounted", () => {
    storageEvents.emit({ type: "corrupt", backupKey: "wallplanner:corrupt-1" });
    render(<ToastRegion shell="desktop" />);
    expect(screen.getByTestId("toast-region")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("alert")).toHaveTextContent(STORAGE_COPY.corrupt);

    act(() => storageEvents.emit({ type: "image-missing" }));
    expect(screen.getAllByRole("alert").map((el) => el.textContent)).toEqual([STORAGE_COPY.corrupt, STORAGE_COPY["image-missing"]]);
  });

  it("removes a toast with its Dismiss button", async () => {
    fakeTimeouts();
    act(() => showToast({ key: "x", tone: "error", message: "Something broke." }));
    render(<ToastRegion shell="landscape" />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(useToasts.getState().toasts).toEqual([]);
    await gone("Something broke.");
  });

  it("auto-dismisses info toasts after the doc's duration, but keeps errors", async () => {
    fakeTimeouts();
    render(<ToastRegion shell="stacked" />);
    act(() => {
      showToast({ key: "a", tone: "error", message: "Error stays." });
      showToast({ key: "b", tone: "info", message: "Wall reset." });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Wall reset.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(toastMs - 10);
    });
    expect(useToasts.getState().toasts.map((t) => t.key)).toEqual(["a", "b"]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(useToasts.getState().toasts.map((t) => t.key)).toEqual(["a"]);
    await gone("Wall reset.");
    expect(screen.getByText("Error stays.")).toBeInTheDocument();
  });

  it("pauses the auto-dismiss while the toast has focus", async () => {
    fakeTimeouts();
    render(<ToastRegion shell="desktop" />);
    act(() => showToast({ key: "b", tone: "info", message: "Wall reset." }));
    act(() => screen.getByRole("button", { name: "Dismiss" }).focus());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(toastMs * 2);
    });
    expect(screen.getByText("Wall reset.")).toBeInTheDocument();

    act(() => screen.getByRole("button", { name: "Dismiss" }).blur());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(toastMs);
    });
    expect(useToasts.getState().toasts).toEqual([]);
  });
});
