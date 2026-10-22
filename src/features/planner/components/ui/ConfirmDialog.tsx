import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { trapTab } from "../../hooks/focusTrap";
import { registerModal } from "../../state/modalUi";
import { DANGER_BUTTON, SECONDARY_BUTTON } from "./buttons";

interface ConfirmDialogProps {
  open: boolean;
  /** The serif title, e.g. "Remove the photo?"; also the dialog's name. */
  title: string;
  /** Optional body, `text-ui ink-muted`. */
  description?: ReactNode;
  /** The danger button, named like the action that opened the dialog ("Remove photo"). */
  confirmLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

/**
 * A destructive-action check (design-system.md §5.11): a centered alertdialog over the scrim,
 * Cancel (initial focus) then the danger action. Esc cancels; the scrim does not, so the choice
 * is always explicit. Portalled to <body> above any sheet (`z-dialog`); while open it owns the
 * keyboard (modalUi, so the shortcuts and the Settings sheet stand down), traps Tab and hands
 * focus back to whatever opened it.
 */
export function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
  if (!open) return null;
  return createPortal(<ConfirmDialogBox {...props} />, document.body);
}

function ConfirmDialogBox({ title, description, confirmLabel, onConfirm, onCancel }: Omit<ConfirmDialogProps, "open">) {
  const titleId = useId();
  const bodyId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const latestCancel = useRef(onCancel);
  useLayoutEffect(() => {
    latestCancel.current = onCancel;
  });

  // Registered before Cancel takes focus, so a sheet underneath already stands down.
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal = registerModal();
    const onKeyDown = (e: KeyboardEvent) => {
      const el = boxRef.current;
      if (!el || !modal.isTop()) return;
      if (e.key === "Escape") {
        e.preventDefault();
        latestCancel.current();
        return;
      }
      trapTab(e, el);
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = boxRef.current;
      if (el && modal.isTop() && e.target instanceof Node && !el.contains(e.target)) cancelRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    cancelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      modal();
      // After the focus guard is gone, so it cannot pull focus back in.
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-dialog grid place-items-center bg-scrim p-4 transition-opacity duration-quick ease-out-soft starting:opacity-0 motion-reduce:transition-none">
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? bodyId : undefined}
        className="flex w-[min(360px,calc(100vw-32px))] flex-col gap-3 rounded-tile bg-surface p-5 shadow-sheet"
      >
        <h2 id={titleId} className="font-serif text-title font-medium tracking-title text-ink">
          {title}
        </h2>
        {description && (
          <p id={bodyId} className="text-ui text-ink-muted">
            {description}
          </p>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={DANGER_BUTTON}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
