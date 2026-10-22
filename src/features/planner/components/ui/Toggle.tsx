import { cx } from "./cx";

interface ToggleProps {
  /** The visible label, which is also the accessible name. */
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
  /** Greyed out and inert, e.g. Snap to grid while the grid is off (§5.16). */
  disabled?: boolean;
  className?: string;
}

/**
 * A switch row (design-system.md §5.8): label left, 44×26 track right, and the whole `h-touch`
 * row is the button. The knob's position is the non-color cue; the accent fill reinforces it.
 */
export function Toggle({ label, checked, onChange, disabled, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("flex h-touch w-full items-center justify-between gap-3 rounded-control text-left text-ui font-medium", disabled ? "text-ink-disabled" : "text-ink", className)}
    >
      <span className="min-w-0">{label}</span>
      <span
        aria-hidden="true"
        className={cx(
          "relative h-6.5 w-11 shrink-0 rounded-pill transition-colors duration-base ease-out-soft motion-reduce:transition-none",
          checked
            ? disabled
              ? "bg-ink-disabled"
              : "bg-accent"
            : cx("bg-surface-sunken ring-[1.5px] ring-inset", disabled ? "ring-ink-disabled" : "ring-line-strong"),
        )}
      >
        <span
          data-testid="toggle-knob"
          className={cx(
            "absolute top-[3px] left-[3px] size-5 rounded-full bg-surface shadow-raised transition-transform duration-base ease-out-soft motion-reduce:transition-none",
            checked && "translate-x-[18px]",
          )}
        />
      </span>
    </button>
  );
}
