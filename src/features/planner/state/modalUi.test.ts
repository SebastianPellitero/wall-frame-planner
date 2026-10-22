import { describe, expect, it } from "vitest";
import { isModalOpen, registerModal } from "./modalUi";

describe("modalUi", () => {
  it("is open while any registered modal is, and a release counts once", () => {
    expect(isModalOpen()).toBe(false);
    const a = registerModal();
    const b = registerModal();
    a();
    a();
    expect(isModalOpen()).toBe(true);
    b();
    expect(isModalOpen()).toBe(false);
  });

  it("knows which modal is on top, so a dialog over the Settings sheet owns the keyboard", () => {
    const sheet = registerModal();
    expect(sheet.isTop()).toBe(true);
    const confirm = registerModal();
    expect(sheet.isTop()).toBe(false);
    expect(confirm.isTop()).toBe(true);
    confirm();
    expect(sheet.isTop()).toBe(true);
    expect(confirm.isTop()).toBe(false);
    sheet();
    expect(sheet.isTop()).toBe(false);
  });
});
