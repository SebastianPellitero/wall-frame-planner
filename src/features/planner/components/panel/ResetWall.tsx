import { useState } from "react";
import { flushSync } from "react-dom";
import { resetWall } from "../../state/projectCommands";
import { SECONDARY_DANGER_BUTTON } from "../ui/buttons";
import { ConfirmDialog } from "../ui/ConfirmDialog";

const BODY =
  "Every frame and the photo are removed, and the wall size, push gap, grid and frame sizes go back to their defaults. The undo history is cleared too, so this can't be undone.";

/**
 * Reset wall (design-system.md §5.6, §5.11): the last item in the Settings content, after a
 * divider, scrolling with it. Opens the confirm dialog; on confirm the whole project starts
 * over (`resetWall`) and `onDone` runs (the phones' sheet closes).
 */
export function ResetWall({ onDone }: { onDone?: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const confirm = () => {
    // Close first, so the dialog hands focus back here before onDone may move it on.
    flushSync(() => setConfirming(false));
    void resetWall();
    onDone?.();
  };

  return (
    <div className="border-t border-line pt-6">
      <button type="button" aria-haspopup="dialog" onClick={() => setConfirming(true)} className={SECONDARY_DANGER_BUTTON}>
        Reset wall
      </button>
      <ConfirmDialog
        open={confirming}
        title="Reset the wall?"
        description={BODY}
        confirmLabel="Reset wall"
        onCancel={() => setConfirming(false)}
        onConfirm={confirm}
      />
    </div>
  );
}
