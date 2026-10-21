import { useId, useState, type KeyboardEvent } from "react";
import { formatCm } from "../../lib/format";
import { parseCm } from "../../lib/parseCm";
import { cx } from "./cx";

interface CmFieldProps {
  /** The visible label, e.g. "Width". The accessible name is "Width (cm)". */
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit(value: number): void;
  /** Sizing: `w-field` by default, e.g. `flex-1` in rows. */
  className?: string;
}

/**
 * A numeric length field in cm (design-system.md §5.2). Commits on Enter or blur, reverts on
 * Esc and selects all on focus. An invalid entry stays visible, marked, with the limits below.
 */
export function CmField({ label, value, min, max, onCommit, className = "w-field" }: CmFieldProps) {
  /** The text being edited; null shows `value`. */
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const helperId = useId();

  const revert = () => {
    setDraft(null);
    setInvalid(false);
  };

  const commit = () => {
    if (draft === null) return;
    const parsed = parseCm(draft, min, max);
    if (!parsed.ok) {
      setInvalid(true);
      return;
    }
    revert();
    if (parsed.value !== value) onCommit(parsed.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      revert();
    }
  };

  return (
    <label className={cx("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-caption text-ink-muted">{label}</span>
      <span className="relative flex">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`${label} (cm)`}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? helperId : undefined}
          value={draft ?? formatCm(value)}
          onChange={(e) => {
            setDraft(e.target.value);
            setInvalid(false);
          }}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className={cx(
            "h-touch w-full min-w-0 rounded-control border bg-surface-sunken pr-8 pl-2.5 text-body text-ink tabular-nums",
            invalid ? "border-danger" : "border-line-strong",
          )}
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-2.5 grid place-items-center text-caption text-ink-muted">
          cm
        </span>
      </span>
      {invalid && (
        <span id={helperId} className="text-caption text-danger">
          Use {formatCm(min)}–{formatCm(max)} cm
        </span>
      )}
    </label>
  );
}
