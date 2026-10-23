import { describe, expect, it } from "vitest";
import { resolveShortcut, type KeyLike } from "./shortcuts";

const key = (k: string, mods: Partial<KeyLike> = {}): KeyLike => ({
  key: k,
  code: "",
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  ...mods,
});

const win = (e: KeyLike) => resolveShortcut(e, { mac: false });
const mac = (e: KeyLike) => resolveShortcut(e, { mac: true });

describe("resolveShortcut", () => {
  it("deletes with Delete and Backspace", () => {
    expect(win(key("Delete"))).toEqual({ type: "delete" });
    expect(win(key("Backspace"))).toEqual({ type: "delete" });
    expect(mac(key("Backspace"))).toEqual({ type: "delete" });
  });

  it("duplicates with Ctrl+D, or Cmd+D on a Mac", () => {
    expect(win(key("d", { ctrlKey: true }))).toEqual({ type: "duplicate" });
    expect(mac(key("d", { metaKey: true }))).toEqual({ type: "duplicate" });
    expect(win(key("D", { ctrlKey: true }))).toEqual({ type: "duplicate" });
  });

  it("uses only the platform's own modifier", () => {
    expect(win(key("d", { metaKey: true }))).toBeNull();
    expect(mac(key("d", { ctrlKey: true }))).toBeNull();
    expect(mac(key("z", { ctrlKey: true }))).toBeNull();
    expect(win(key("d"))).toBeNull();
  });

  it("undoes with Ctrl/Cmd+Z and redoes with Ctrl/Cmd+Shift+Z", () => {
    expect(win(key("z", { ctrlKey: true }))).toEqual({ type: "undo" });
    expect(mac(key("z", { metaKey: true }))).toEqual({ type: "undo" });
    expect(win(key("Z", { ctrlKey: true, shiftKey: true }))).toEqual({ type: "redo" });
    expect(mac(key("Z", { metaKey: true, shiftKey: true }))).toEqual({ type: "redo" });
  });

  it("redoes with Ctrl+Y off a Mac only (Cmd+Y is the browser's history there)", () => {
    expect(win(key("y", { ctrlKey: true }))).toEqual({ type: "redo" });
    expect(mac(key("y", { metaKey: true }))).toBeNull();
  });

  it("reads the physical key when the layout gives a non-Latin character", () => {
    expect(win(key("я", { code: "KeyZ", ctrlKey: true }))).toEqual({ type: "undo" });
    expect(win(key("в", { code: "KeyD", ctrlKey: true }))).toEqual({ type: "duplicate" });
  });

  it("nudges 1 cm with the arrows and 10 cm with Shift", () => {
    expect(win(key("ArrowRight"))).toEqual({ type: "nudge", dx: 1, dy: 0 });
    expect(win(key("ArrowLeft"))).toEqual({ type: "nudge", dx: -1, dy: 0 });
    expect(win(key("ArrowUp"))).toEqual({ type: "nudge", dx: 0, dy: -1 });
    expect(win(key("ArrowDown"))).toEqual({ type: "nudge", dx: 0, dy: 1 });
    expect(win(key("ArrowRight", { shiftKey: true }))).toEqual({ type: "nudge", dx: 10, dy: 0 });
    expect(mac(key("ArrowUp", { shiftKey: true }))).toEqual({ type: "nudge", dx: 0, dy: -10 });
  });

  it("deselects with Escape", () => {
    expect(win(key("Escape"))).toEqual({ type: "deselect" });
  });

  it("leaves modified arrows, Delete and Escape to the browser and OS", () => {
    expect(win(key("ArrowRight", { ctrlKey: true }))).toBeNull();
    expect(mac(key("ArrowLeft", { metaKey: true }))).toBeNull();
    expect(win(key("ArrowLeft", { altKey: true }))).toBeNull();
    expect(win(key("Delete", { ctrlKey: true }))).toBeNull();
    expect(mac(key("Backspace", { metaKey: true }))).toBeNull();
    expect(win(key("Escape", { shiftKey: true }))).toBeNull();
    expect(win(key("z", { ctrlKey: true, altKey: true }))).toBeNull();
  });

  it("repeats nudges and history steps while held, but never duplicate, delete or deselect", () => {
    expect(win(key("ArrowRight", { repeat: true }))).toEqual({ type: "nudge", dx: 1, dy: 0 });
    expect(win(key("z", { ctrlKey: true, repeat: true }))).toEqual({ type: "undo" });
    expect(win(key("d", { ctrlKey: true, repeat: true }))).toBeNull();
    expect(win(key("Delete", { repeat: true }))).toBeNull();
    expect(win(key("Escape", { repeat: true }))).toBeNull();
  });

  it("ignores everything else", () => {
    expect(win(key("a"))).toBeNull();
    expect(win(key("Enter"))).toBeNull();
    expect(win(key("x", { ctrlKey: true }))).toBeNull();
  });
});

describe("resolveShortcut: adjust-mode zoom keys", () => {
  it("maps + and = to zoom in and - to zoom out, Shift included (+ needs it on many layouts)", () => {
    expect(win(key("+", { shiftKey: true }))).toEqual({ type: "zoom", dir: 1 });
    expect(win(key("="))).toEqual({ type: "zoom", dir: 1 });
    expect(win(key("-"))).toEqual({ type: "zoom", dir: -1 });
    expect(mac(key("-"))).toEqual({ type: "zoom", dir: -1 });
  });

  it("leaves Ctrl/Cmd + and - to the browser (page zoom)", () => {
    expect(win(key("+", { ctrlKey: true }))).toBeNull();
    expect(mac(key("-", { metaKey: true }))).toBeNull();
  });
});
