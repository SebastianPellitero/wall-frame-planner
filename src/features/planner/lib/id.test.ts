import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./id";

afterEach(() => vi.unstubAllGlobals());

describe("newId", () => {
  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-from-crypto" });
    expect(newId()).toBe("uuid-from-crypto");
  });

  it("falls back to a random + time id when randomUUID is missing (insecure origins)", () => {
    vi.stubGlobal("crypto", {});
    const id = newId();
    expect(id).toMatch(/^[a-z0-9]{8,}$/);
    expect(newId()).not.toBe(id);
  });

  it("falls back when crypto itself is undefined", () => {
    vi.stubGlobal("crypto", undefined);
    expect(newId()).toMatch(/^[a-z0-9]{8,}$/);
  });
});
