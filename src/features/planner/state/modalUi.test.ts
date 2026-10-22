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
});
