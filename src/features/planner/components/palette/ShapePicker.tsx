import { motion, useReducedMotion } from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import { KIND_NAME } from "../../lib/frameLook";
import { reducedMotion, sheet } from "../../lib/physics";
import type { ShapeKind } from "../../types";
import { cx } from "../ui/cx";
import { ShapeCircleIcon, ShapeRectIcon, ShapeSquareIcon } from "../ui/icons";

const SHAPES: { kind: ShapeKind; Icon: typeof ShapeRectIcon }[] = [
  { kind: "rect", Icon: ShapeRectIcon },
  { kind: "square", Icon: ShapeSquareIcon },
  { kind: "circle", Icon: ShapeCircleIcon },
];

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * The Frame creator's shape picker (design-system.md §5.1, §5.3): an icon-only segmented radio
 * group named "Shape". Arrow keys move the selection; Tab lands on the checked radio.
 */
export function ShapePicker({ value, onChange, stretch }: { value: ShapeKind; onChange(kind: ShapeKind): void; stretch?: boolean }) {
  const reduce = useReducedMotion();
  const radios = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const step = STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (index + step + SHAPES.length) % SHAPES.length;
    onChange(SHAPES[next].kind);
    radios.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Shape" className={cx("flex h-touch shrink-0 rounded-pill bg-surface-sunken", stretch && "w-full")}>
      {SHAPES.map(({ kind, Icon }, index) => {
        const checked = kind === value;
        return (
          <button
            key={kind}
            ref={(el) => {
              radios.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={KIND_NAME[kind]}
            title={KIND_NAME[kind]}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cx(
              "relative grid h-touch place-items-center rounded-pill transition-colors duration-quick ease-out-soft",
              stretch ? "flex-1" : "w-touch",
              checked ? "text-ink" : "text-ink-muted can-hover:hover:text-ink",
            )}
          >
            {checked && (
              <motion.span
                layoutId="shape-thumb"
                transition={reduce ? { duration: reducedMotion.tweenLongMs / 1000, ease: reducedMotion.ease } : sheet}
                className="absolute inset-[3px] rounded-pill bg-surface shadow-raised ring-1 ring-line"
              />
            )}
            <Icon size={20} className="relative" />
          </button>
        );
      })}
    </div>
  );
}
