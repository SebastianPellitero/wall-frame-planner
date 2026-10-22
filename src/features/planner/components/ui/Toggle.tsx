import { cx } from "./cx";

interface ToggleProps {
  /** The visible label, which is also the accessible name. */
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
  className?: string;
}

/**
 * A switch row (design-system.md §5.8): label left, 44×26 track right, and the whole `h-touch`
 * row is the button. The knob's position is the non-color cue; the accent fill reinforces it.
 */
export function Toggle({ label, checked, onChange, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx("flex h-touch w-full items-center justify-between gap-3 rounded-control text-left text-ui font-medium text-ink", className)}
    >
      <span className="min-w-0">{label}</span>
      <span
        aria-hidden="true"
        className={cx(
          "relative h-6.5 w-11 shrink-0 rounded-pill transition-colors duration-base ease-out-soft motion-reduce:transition-none",
          checked ? "bg-accent" : "bg-surface-sunken ring-[1.5px] ring-line-strong ring-inset",
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
