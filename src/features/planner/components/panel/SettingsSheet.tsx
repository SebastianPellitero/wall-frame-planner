import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ICON_BUTTON } from "../ui/buttons";
import { cx } from "../ui/cx";
import { SettingsIcon } from "../ui/icons";
import { SettingsDialog, type SheetShell } from "./SettingsDialog";

/**
 * The Settings entry (design-system.md §4.5): an icon button at the top bar's right end
 * (stacked, and narrow desktop with the landscape side sheet) or the right rail's bottom
 * (landscape) that opens the Settings sheet. The sheet is portalled to <body> so it rides above
 * every chrome strip; closing returns focus here. A wide desktop has no entry: the same sections
 * are always open in the right panel.
 */
export function SettingsSheet({ shell, className }: { shell: SheetShell; className?: string }) {
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setState((s) => (s === "open" ? "closing" : s));
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Settings"
        title="Settings"
        aria-haspopup="dialog"
        aria-expanded={state === "open"}
        onClick={() => setState("open")}
        className={cx(ICON_BUTTON, className)}
      >
        <SettingsIcon />
      </button>
      {state !== "closed" &&
        createPortal(
          <SettingsDialog shell={shell} closing={state === "closing"} onRequestClose={close} onExited={() => setState("closed")} />,
          document.body,
        )}
    </>
  );
}
