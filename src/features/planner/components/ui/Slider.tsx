import { useId, type CSSProperties } from "react";
import { clamp } from "../../lib/geometry";
import { cx } from "./cx";

interface SliderProps {
  /** The visible label, which is also the accessible name. */
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Shown right-aligned and announced as the value, e.g. "60%". */
  readout: string;
  onChange(value: number): void;
  className?: string;
}

/**
 * A slider row (design-system.md §5.7): label, a native `<input type="range">` (restyled in
 * globals.css, `.slider`, so keyboard and screen readers get the platform control) and a
 * readout. The 44px row is the hit area; the track fills with the accent up to the thumb.
 */
export function Slider({ label, value, min, max, step, readout, onChange, className }: SliderProps) {
  const id = useId();
  const pos = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;

  return (
    <div className={cx("flex h-touch items-center gap-3", className)}>
      <label htmlFor={id} className="shrink-0 text-ui font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={readout}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--slider-pos": String(pos) } as CSSProperties}
        className="slider h-touch min-w-0 flex-1"
      />
      <span aria-hidden="true" className="min-w-[4ch] shrink-0 text-right text-ui text-ink-muted tabular-nums">
        {readout}
      </span>
    </div>
  );
}
