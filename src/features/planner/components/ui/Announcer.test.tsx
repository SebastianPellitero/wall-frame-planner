import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { announce } from "../../state/announcer";
import { Announcer } from "./Announcer";

describe("Announcer", () => {
  it("is a hidden polite status region that speaks what announce() says", () => {
    render(<Announcer />);
    const region = screen.getByTestId("announcer");
    expect(region).toHaveAttribute("role", "status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveClass("sr-only");
    expect(region).toHaveTextContent("");

    act(() => announce("Frame added"));
    expect(region).toHaveTextContent("Frame added");
  });

  it("replaces the text node on a repeat, so the same message is spoken again", () => {
    render(<Announcer />);
    act(() => announce("Frame added"));
    const first = screen.getByText("Frame added");
    act(() => announce("Frame added"));
    const second = screen.getByText("Frame added");
    expect(second).not.toBe(first);
  });
});
