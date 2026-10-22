import { useStore } from "zustand";
import type { Shell } from "../hooks/useShell";
import { redo, undo } from "../state/frameCommands";
import { usePlannerStore } from "../state/store";
import { ICON_BUTTON } from "./ui/buttons";
import { cx } from "./ui/cx";
import { RedoIcon, UndoIcon } from "./ui/icons";

/**
 * Undo and Redo for frame changes (§4.5), each disabled when there is nothing to step to.
 * History covers frames only, so outside Arrange the stacked dock hides them (Done takes
 * their slot, §4.6) and the landscape rail disables them (§4.3). Desktop keeps them working.
 */
export function HistoryButtons({ shell, className }: { shell: Shell; className?: string }) {
  const canUndo = useStore(usePlannerStore.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(usePlannerStore.temporal, (s) => s.futureStates.length > 0);
  const arrange = usePlannerStore((s) => s.mode === "arrange");
  if (shell === "stacked" && !arrange) return null;
  const blocked = shell === "landscape" && !arrange;

  return (
    <div className={cx("flex", shell === "landscape" && "flex-col gap-1", className)}>
      <button type="button" aria-label="Undo" title="Undo" disabled={blocked || !canUndo} onClick={undo} className={ICON_BUTTON}>
        <UndoIcon />
      </button>
      <button type="button" aria-label="Redo" title="Redo" disabled={blocked || !canRedo} onClick={redo} className={ICON_BUTTON}>
        <RedoIcon />
      </button>
    </div>
  );
}
