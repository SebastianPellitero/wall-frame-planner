import { motion, useReducedMotion } from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import { reducedMotion, sheet } from "../lib/physics";
import { usePlannerStore } from "../state/store";
import type { Mode } from "../types";
import { cx } from "./ui/cx";
import { ArrangeIcon, OriginIcon, PhotoIcon } from "./ui/icons";

const MODES: { mode: Mode; name: string; short: string; Icon: typeof ArrangeIcon }[] = [
  { mode: "arrange", name: "Arrange", short: "Arrange", Icon: ArrangeIcon },
  { mode: "photo", name: "Photo", short: "Photo", Icon: PhotoIcon },
  { mode: "gridOrigin", name: "Grid origin", short: "Origin", Icon: OriginIcon },
];

const NEXT_INDEX: Record<string, (i: number, n: number) => number> = {
  ArrowRight: (i) => i + 1,
  ArrowDown: (i) => i + 1,
  ArrowLeft: (i) => i - 1,
  ArrowUp: (i) => i - 1,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/**
 * Segmented radio group for the three modes (design-system.md §5.3). Horizontal in the top
 * bars, vertical (icon over caption) in the landscape right rail. Every radio is its own
 * ≥44px hit box; the track has no padding.
 */
export function ModeSwitch({ orientation }: { orientation: "horizontal" | "vertical" }) {
  const mode = usePlannerStore((s) => s.mode);
  const setMode = usePlannerStore((s) => s.setMode);
  const reduce = useReducedMotion();
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const vertical = orientation === "vertical";

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = NEXT_INDEX[event.key];
    if (!step) return;
    event.preventDefault();
    const n = MODES.length;
    const next = (step(index, n) + n) % n;
    setMode(MODES[next].mode);
    radios.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Mode"
      className={cx("flex bg-surface-sunken", vertical ? "flex-col rounded-tile" : "h-touch rounded-pill")}
    >
      {MODES.map(({ mode: value, name, short, Icon }, index) => {
        const checked = value === mode;
        return (
          <button
            key={value}
            ref={(el) => {
              radios.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={name}
            tabIndex={checked ? 0 : -1}
            onClick={() => setMode(value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              "relative shrink-0 transition-colors duration-quick ease-out-soft",
              vertical
                ? "flex size-[52px] flex-col items-center justify-center gap-0.5 rounded-tile"
                : "h-touch rounded-pill px-3.5 text-ui",
              checked ? "font-semibold text-ink" : "font-medium text-ink-muted can-hover:hover:text-ink",
            )}
          >
            {checked && (
              <motion.span
                layoutId={`mode-thumb-${orientation}`}
                transition={reduce ? { duration: reducedMotion.tweenLongMs / 1000, ease: reducedMotion.ease } : sheet}
                className={cx(
                  "absolute inset-[3px] bg-surface shadow-raised ring-1 ring-line",
                  vertical ? "rounded-tile" : "rounded-pill",
                )}
              />
            )}
            {vertical ? (
              <>
                <Icon size={20} className="relative" />
                <span className="relative text-micro font-stretch-semi-condensed">{short}</span>
              </>
            ) : short === name ? (
              <span className="relative">{name}</span>
            ) : (
              // Phones say "Origin"; from 640px the label is the full name (§4.2).
              <>
                <span className="relative sm:hidden">{short}</span>
                <span className="relative hidden sm:inline">{name}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
