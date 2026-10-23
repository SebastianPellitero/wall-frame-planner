import { useEffect } from "react";
import { flushSync } from "react-dom";
import { resolveShortcut } from "../lib/shortcuts";
import { useDragUi } from "../state/dragUi";
import { isModalOpen } from "../state/modalUi";
import { exitAdjust, useSelectionUi } from "../state/selectionUi";
import { deleteFrame, duplicateFrame, nudgeFrame, redo, undo } from "../state/frameCommands";
import { usePlannerStore } from "../state/store";
import { rescueFocus } from "./rescueFocus";

/** Text entry keeps every key, including Ctrl+Z (its own undo). */
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
/** A modal dialog (the Settings sheet) owns its keys; the wall behind it is out of reach. */
const MODAL = '[aria-modal="true"]';
/** Radio groups (mode switch, shape picker) and tab lists move their checked option with the arrows. */
const OWNS_ARROWS = '[role="radiogroup"], [role="tablist"]';
/** The Zoom slider: a range input keeps its keys, except Escape, which ends adjust mode (§5.17). */
const RANGE = 'input[type="range"]';

const isMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * Desktop keyboard shortcuts (design-system.md §7), one document-level keydown. The mapping
 * is `resolveShortcut`; this decides whether a key may act: never while typing or inside a
 * modal dialog, never during a drag, and outside Arrange or without a selection only Undo and Redo. In adjust
 * mode Escape ends it and the frame neither moves nor deletes.
 */
export function useShortcuts() {
  useEffect(() => {
    const mac = isMac();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || useDragUi.getState().draggingId !== null) return;
      const target = e.target instanceof Element ? e.target : null;
      if (isModalOpen() || target?.closest(MODAL)) return;
      const action = resolveShortcut(e, { mac });
      if (!action) return;
      const adjusting = useSelectionUi.getState().adjustingId !== null;
      if (target?.closest(TYPING) && !(adjusting && action.type === "deselect" && target.matches(RANGE))) return;

      if (action.type === "undo" || action.type === "redo") {
        e.preventDefault();
        if (action.type === "undo") undo();
        else redo();
        return;
      }

      const { mode, selectedId } = usePlannerStore.getState();
      if (mode !== "arrange" || selectedId === null) return;
      if (adjusting) {
        // The frame stays put while its photo is adjusted: arrows and +/- act on the photo from
        // the frame itself (FrameNode); Delete waits for Escape, which ends adjust mode (§5.17).
        if (action.type === "deselect") {
          e.preventDefault();
          // The tools unmount with the focused control (Zoom, Done): focus stays on the frame (§5.17).
          flushSync(exitAdjust);
          document.querySelector<HTMLElement>(`[data-shape-id="${CSS.escape(selectedId)}"]`)?.focus();
        }
        if (action.type !== "duplicate") return;
      }
      // Zoom keys only mean something on a frame in adjust mode (FrameNode).
      if (action.type === "zoom" || (action.type === "nudge" && target?.closest(OWNS_ARROWS))) return;
      e.preventDefault();
      switch (action.type) {
        case "nudge":
          nudgeFrame(selectedId, action.dx, action.dy, { repeat: e.repeat });
          break;
        case "duplicate":
          duplicateFrame(selectedId);
          break;
        case "delete":
          rescueFocus(selectedId);
          deleteFrame(selectedId);
          break;
        case "deselect":
          rescueFocus();
          usePlannerStore.getState().select(null);
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}
