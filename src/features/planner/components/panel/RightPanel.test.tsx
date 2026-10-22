import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { initialProject, initialUi } from "../../state/actions";
import { usePlannerStore } from "../../state/store";
import { RightPanel } from "./RightPanel";

beforeEach(() => {
  usePlannerStore.setState({ ...initialProject(), ...initialUi });
});

const region = (name: string) => screen.queryByRole("region", { name });

describe("RightPanel", () => {
  it("lists Wall, Grid, Photo and Reset wall", () => {
    render(<RightPanel />);
    expect(region("Wall")).toBeInTheDocument();
    expect(region("Grid")).toBeInTheDocument();
    expect(region("Photo settings")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset wall" })).toBeInTheDocument();
  });

  it("leaves the Photo section out in Photo mode, where the sidebar's Photo tools hold it (§4.4)", () => {
    usePlannerStore.setState({ background: { ...initialProject().background, hasImage: true } });
    render(<RightPanel />);
    act(() => usePlannerStore.getState().setMode("photo"));
    expect(region("Photo settings")).not.toBeInTheDocument();
    expect(screen.queryByRole("slider", { name: "Opacity" })).not.toBeInTheDocument();
    expect(region("Wall")).toBeInTheDocument();
    expect(region("Grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset wall" })).toBeInTheDocument();
    act(() => usePlannerStore.getState().setMode("arrange"));
    expect(region("Photo settings")).toBeInTheDocument();
  });
});
