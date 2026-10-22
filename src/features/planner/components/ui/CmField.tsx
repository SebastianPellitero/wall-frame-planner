import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatCm } from "../../lib/format";
import { parseCm } from "../../lib/parseCm";
import { cx } from "./cx";

interface CmFieldProps {
  /** The visible label, e.g. "Width". The accessible name is "Width (cm)" unless `name` is given. */
  label: string;
  /** Accessible-name override, e.g. "Grid height (cm)" for the visible "Height" (§5.2). Must contain the label. */
  name?: string;
  value: number;
  min: number;
  max: number;
  onCommit(value: number): void;
  /** Sizing: `w-field` by default, e.g. `flex-1` in rows. */
  className?: string;
  /** The landscape rail's 62px variant: tighter padding, condensed value, unit closer to the edge. */
  compact?: boolean;
  /** For rows with no room below (the stacked dock): an error adds the limits to the label's row instead of a line. */
  errorInLabel?: boolean;
  /** Centers the helper under a centered field (the desktop creator's Width); it may overflow the field. */
  centerHelper?: boolean;
  /**
   * The id of a helper the owner renders once for several fields (the landscape rail's two
   * columns, §5.2). The field then renders no helper and reports its text through `onInvalidChange`.
   */
  helperId?: string;
  /** The helper text while invalid, null once valid again or unmounted. */
  onInvalidChange?(helper: string | null): void;
}

/**
 * A numeric length field in cm (design-system.md §5.2). Commits on Enter or blur, reverts on
 * Esc and selects all on focus. An invalid entry stays visible, marked, with the limits on one
 * line below (or on the label's row, or in a helper the owner shares). Inside a form, Enter
 * commits and then submits; an invalid entry blocks the submit.
 */
export function CmField({
  label,
  name,
  value,
  min,
  max,
  onCommit,
  className = "w-field",
  compact,
  errorInLabel,
  centerHelper,
  helperId: sharedHelperId,
  onInvalidChange,
}: CmFieldProps) {
  /** The text being edited; null shows `value`. */
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const ownHelperId = useId();
  const helperId = sharedHelperId ?? ownHelperId;
  const limits = `${formatCm(min)}–${formatCm(max)} cm`;

  const report = useRef(onInvalidChange);
  useLayoutEffect(() => {
    report.current = onInvalidChange;
  });
  const helperText = invalid ? `Use ${limits}` : null;
  useEffect(() => {
    report.current?.(helperText);
    return () => report.current?.(null);
  }, [helperText]);

  const revert = () => {
    setDraft(null);
    setInvalid(false);
  };

  /** False when the draft is invalid. */
  const commit = (): boolean => {
    if (draft === null) return true;
    const parsed = parseCm(draft, min, max);
    if (!parsed.ok) {
      setInvalid(true);
      return false;
    }
    revert();
    if (parsed.value !== value) onCommit(parsed.value);
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Outside a form there is nothing to submit; inside one, a valid value goes on to submit it.
      if (!commit() || !e.currentTarget.form) e.preventDefault();
    } else if (e.key === "Escape") {
      e.preventDefault();
      revert();
    }
  };

  const labelText = <span className="text-caption text-ink-muted">{label}</span>;

  return (
    <label className={cx("flex min-w-0 flex-col gap-1", className)}>
      {invalid && errorInLabel ? (
        // The field keeps its name; the limits join the label's row (§5.2).
        <span className="flex justify-between gap-1">
          {labelText}
          <span id={helperId} className="text-caption whitespace-nowrap text-danger">
            {/* The leading space is dropped at the start of the visible line but keeps "Use 1–300 cm" spoken as words. */}
            <span className="sr-only">Use</span> {limits}
          </span>
        </span>
      ) : (
        labelText
      )}
      <span className="relative flex">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={name ?? `${label} (cm)`}
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
            "h-touch w-full min-w-0 rounded-control border bg-surface-sunken text-body text-ink tabular-nums",
            // The ring on an invalid field stays danger, so it still looks invalid while focused.
            "aria-invalid:focus:outline-danger aria-invalid:focus-visible:outline-danger",
            compact ? "pr-6 pl-2 font-stretch-semi-condensed" : "pr-8 pl-2.5",
            invalid ? "border-danger" : "border-line-strong",
          )}
        />
        <span
          aria-hidden="true"
          className={cx("pointer-events-none absolute inset-y-0 grid place-items-center text-caption text-ink-muted", compact ? "right-1.5" : "right-2.5")}
        >
          cm
        </span>
      </span>
      {invalid && !errorInLabel && !sharedHelperId && (
        <span id={helperId} className={cx("text-caption whitespace-nowrap text-danger", centerHelper && "self-center")}>
          Use {limits}
        </span>
      )}
    </label>
  );
}
