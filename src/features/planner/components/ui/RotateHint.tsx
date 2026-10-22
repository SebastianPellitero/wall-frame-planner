import { useState } from "react";
import { CloseIcon, RotateIcon } from "./icons";

export const ROTATE_HINT_KEY = "wallplanner:ui:rotateHintDismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(ROTATE_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(ROTATE_HINT_KEY, "1");
  } catch {
    // Storage is blocked or full: the hint stays hidden for this visit only.
  }
}

/**
 * "Rotate for a bigger wall" pill (design-system.md §5.10). Only phone portrait shows it
 * (`phone-portrait:`), so it hides by itself in landscape. Fades in 600ms after load,
 * instantly under reduced motion. ToastRegion places it at the stage's bottom-center, under the toasts.
 */
export function RotateHint() {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  return (
    <div
      className="pointer-events-auto hidden h-touch items-center gap-1.5 whitespace-nowrap rounded-pill bg-surface pr-1 pl-3.5 text-ui text-ink shadow-float transition-opacity delay-[600ms] duration-slow ease-out-soft starting:opacity-0 motion-reduce:transition-none phone-portrait:flex"
    >
      <RotateIcon size={18} />
      <span>Rotate for a bigger wall</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          writeDismissed();
          setDismissed(true);
        }}
        className="grid size-touch place-items-center rounded-pill text-ink-muted transition-colors duration-quick can-hover:hover:bg-surface-pressed can-hover:hover:text-ink"
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}
