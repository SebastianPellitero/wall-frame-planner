import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { trapTab } from "../../hooks/focusTrap";
import { useSheetDrag } from "../../hooks/useSheetDrag";
import { reducedMotion, sheet, tween } from "../../lib/physics";
import { ICON_BUTTON } from "../ui/buttons";
import { cx } from "../ui/cx";
import { CloseIcon } from "../ui/icons";
import { SettingsSections } from "./SettingsSections";

export type SheetShell = "stacked" | "landscape";

interface SettingsDialogProps {
  shell: SheetShell;
  /** True while the sheet slides out; it is inert meanwhile and `onExited` fires at the end. */
  closing: boolean;
  onRequestClose(): void;
  onExited(): void;
}

/**
 * The phones' Settings sheet (design-system.md §5.6): a modal dialog over a scrim, with a fixed
 * header and a body that scrolls on its own. Stacked: a bottom sheet at min(content, 60dvh),
 * dragged from the header only (down closes, up grows it to 85dvh). Landscape: a right side
 * sheet with no drag, over the light scrim so the wall stays visible. Both slide on the `sheet`
 * spring (a 200ms tween under reduced motion); Esc, the scrim and Close all close it.
 */
export function SettingsDialog({ shell, closing, onRequestClose, onExited }: SettingsDialogProps) {
  const stacked = shell === "stacked";
  const reduced = useReducedMotion() === true;
  const transition = reduced ? tween(reducedMotion.tweenLongMs) : sheet;
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  /** The sheet's offset from its open position, px: down (stacked) or right (landscape). */
  const offset = useMotionValue(0);
  const scrim = useMotionValue(0);
  const [expanded, setExpanded] = useState(false);
  const entered = useRef(false);
  const grow = useRef<{ offset: number; height: number } | null>(null);

  const size = () => {
    const r = sheetRef.current?.getBoundingClientRect();
    return (stacked ? r?.height : r?.width) ?? 0;
  };

  // Enter: from off-screen on mount, or back from a half-finished exit.
  useLayoutEffect(() => {
    if (closing) return;
    if (!entered.current) {
      entered.current = true;
      offset.jump(size());
      scrim.jump(0);
      closeRef.current?.focus();
    }
    animate(offset, 0, transition);
    animate(scrim, 1, transition);
    // Only the open/closing switch starts an animation; size and transition are read then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // Exit: slide out from wherever the sheet is (a drag release included), then unmount.
  useEffect(() => {
    if (!closing) return;
    const out = animate(offset, size(), transition);
    animate(scrim, 0, transition);
    let live = true;
    void out.finished.then(() => {
      if (live) onExited();
    });
    return () => {
      live = false;
      out.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing]);

  // Growing to 85dvh moves the sheet's top: start from where the finger left it, then settle.
  useLayoutEffect(() => {
    const g = grow.current;
    if (!g) return;
    grow.current = null;
    offset.jump(g.offset + (size() - g.height));
    animate(offset, 0, transition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const drag = useSheetDrag({
    offset,
    heightPx: size,
    expanded,
    transition,
    onClose: onRequestClose,
    onExpand: (at) => {
      grow.current = { offset: at, height: size() };
      setExpanded(true);
    },
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // A field's own Esc (revert) prevents the default and keeps the sheet open.
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      onRequestClose();
      return;
    }
    if (sheetRef.current) trapTab(e, sheetRef.current);
  };

  return (
    <>
      <motion.div
        data-testid="settings-scrim"
        aria-hidden="true"
        onClick={onRequestClose}
        style={{ opacity: scrim }}
        className={cx("fixed inset-0 z-scrim", stacked ? "bg-scrim" : "bg-scrim-light")}
      />
      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={closing}
        onKeyDown={onKeyDown}
        style={stacked ? { y: offset } : { x: offset }}
        className={cx(
          "fixed z-sheet flex flex-col bg-surface shadow-sheet",
          stacked
            ? cx("inset-x-0 bottom-0 mx-auto w-full rounded-t-sheet sm:max-w-[560px]", expanded ? "max-h-[85dvh]" : "max-h-[60dvh]")
            : "inset-y-0 right-0 h-dvh w-[calc(var(--spacing-sheet)+var(--spacing-safe-right))] rounded-l-sheet pr-safe-right",
        )}
      >
        <div
          data-testid="settings-header"
          onPointerDown={stacked ? drag.onPointerDown : undefined}
          className={cx("shrink-0 border-b border-line", stacked && "touch-none select-none")}
        >
          {stacked && <div data-testid="sheet-handle" aria-hidden="true" className="mx-auto mt-2 h-1 w-9 rounded-pill bg-line-strong" />}
          <div className={cx("flex items-center justify-between gap-2 pr-2 pl-4", stacked ? "pb-1" : "py-2")}>
            <h2 id={titleId} className="font-serif text-title font-medium tracking-title text-ink">
              Settings
            </h2>
            <button ref={closeRef} type="button" aria-label="Close settings" title="Close settings" onClick={onRequestClose} className={ICON_BUTTON}>
              <CloseIcon />
            </button>
          </div>
        </div>
        <div
          data-testid="settings-body"
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(24px+var(--spacing-safe-bottom))]"
        >
          <SettingsSections shell={shell} onSetOrigin={onRequestClose} />
        </div>
      </motion.div>
    </>
  );
}
