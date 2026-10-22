import { describe, expect, it } from "vitest";
import * as buttons from "./buttons";
import { textColors } from "./textColors.testUtil";

describe("button variants", () => {
  it.each(Object.entries(buttons))("%s sets exactly one text color", (_, className) => {
    expect(textColors(className)).toHaveLength(1);
  });

  it("the danger variants use text-danger alone", () => {
    expect(textColors(buttons.SECONDARY_DANGER_BUTTON)).toEqual(["text-danger"]);
    expect(textColors(buttons.DANGER_ICON_BUTTON)).toEqual(["text-danger"]);
    expect(textColors(buttons.QUIET_DANGER_BUTTON)).toEqual(["text-danger"]);
  });
});
