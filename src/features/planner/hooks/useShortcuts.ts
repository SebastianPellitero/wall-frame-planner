import { useEffect } from "react";
import { resolveShortcut } from "../lib/shortcuts";
import { useDragUi } from "../state/dragUi";
import { isModalOpen } from "../state/modalUi";
import { deleteFrame, duplicateFrame, nudgeFrame, redo, undo } from "../state/frameCommands";
import { usePlannerStore } from "../state/store";
import { rescueFocus } from "./rescueFocus";

/** Text entry keeps every key, including Ctrl+Z (its own undo). */
const TYPING = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
/** A modal dialog (the Settings sheet) owns its keys; the wall behind it is out of reach. */
const MODAL = '[aria-modal="true"]';
/** Radio groups (mode switch, shape picker) move their checked option with the arrows. */
const OWNS_ARROWS = '[role="radiogroup"]';

const isMac = () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * Desktop keyboard shortcuts (design-system.md §7), one document-level keydown. The mapping
 * is `resolveShortcut`; this decides whether a key may act: never while typing or inside a
 * modal dialog, never during a drag, and outside Arrange or without a selection only Undo and Redo.
 */
export function useShortcuts() {
  useEffect(() => {
    const mac = isMac();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || useDragUi.getState().draggingId !== null) return;
      const target = e.target instanceof Element ? e.target : null;
      if (isModalOpen() || target?.closest(TYPING) || target?.closest(MODAL)) return;
      const action = resolveShortcut(e, { mac });
      if (!action) return;

      if (action.type === "undo" || action.type === "redo") {
        e.preventDefault();
        if (action.type === "undo") undo();
        else redo();
        return;
      }

      const { mode, selectedId } = usePlannerStore.getState();
      if (mode !== "arrange" || selectedId === null) return;
      if (action.type === "nudge" && target?.closest(OWNS_ARROWS)) return;
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
