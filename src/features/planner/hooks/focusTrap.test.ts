import { describe, expect, it } from "vitest";
import { trapTab } from "./focusTrap";

function tab(container: HTMLElement, shiftKey = false) {
  let prevented = false;
  trapTab({ key: "Tab", shiftKey, preventDefault: () => (prevented = true) }, container);
  return prevented;
}

describe("trapTab", () => {
  it("skips hidden, display:none and visibility:hidden elements when wrapping", () => {
    const box = document.createElement("div");
    box.innerHTML = `
      <button id="first">First</button>
      <button id="last">Last</button>
      <button hidden>Hidden attr</button>
      <div style="display:none"><button>Inside display none</button></div>
      <button style="visibility:hidden">Invisible</button>
    `;
    document.body.appendChild(box);
    (box.querySelector("#last") as HTMLElement).focus();
    expect(tab(box)).toBe(true);
    expect(document.activeElement?.id).toBe("first");
    expect(tab(box, true)).toBe(true);
    expect(document.activeElement?.id).toBe("last");
    box.remove();
  });
});
