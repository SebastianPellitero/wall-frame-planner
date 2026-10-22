import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { reducedMotion, sheet, toastEnterY, toastExitMs, toastMs, tween } from "../../lib/physics";
import { hideToast, type Toast as ToastData } from "../../state/toasts";
import { AlertIcon, CloseIcon, InfoIcon } from "./icons";

/**
 * One toast (design-system.md §5.9): an icon, the message and a Dismiss ×. Errors are
 * `role="alert"` and stay; info is `role="status"` and leaves after `toastMs`, paused while
 * hovered or focused. Enters with y 12→0 plus a fade on `sheet`, exits with a quick fade; under
 * reduced motion both are plain fades.
 */
export function Toast({ toast }: { toast: ToastData }) {
  const reduced = useReducedMotion() === true;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const error = toast.tone === "error";
  const { id } = toast;

  useEffect(() => {
    if (error || hovered || focused) return;
    const timer = setTimeout(() => hideToast(id), toastMs);
    return () => clearTimeout(timer);
  }, [error, hovered, focused, id]);

  const Icon = error ? AlertIcon : InfoIcon;

  return (
    <motion.div
      role={error ? "alert" : "status"}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: toastEnterY }}
      animate={{ opacity: 1, y: 0, transition: reduced ? tween(reducedMotion.tweenMs) : sheet }}
      exit={{ opacity: 0, transition: tween(reduced ? reducedMotion.tweenMs : toastExitMs) }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="pointer-events-auto flex w-full max-w-[360px] items-center gap-2.5 rounded-tile bg-inverse py-2.5 pr-2 pl-3.5 text-ui text-on-inverse shadow-toast"
    >
      <Icon size={18} className="shrink-0 text-on-inverse-muted" />
      <p className="min-w-0 flex-1">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => hideToast(id)}
        className="-my-2 grid size-touch shrink-0 place-items-center rounded-control text-on-inverse-muted transition-colors duration-quick can-hover:hover:text-on-inverse"
      >
        <CloseIcon size={18} />
      </button>
    </motion.div>
  );
}
