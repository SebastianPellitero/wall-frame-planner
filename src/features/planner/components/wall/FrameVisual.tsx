import { bracketArmPx, frameLabel, labelTier, matPx, mouldingPx } from "../../lib/frameLook";
import type { ShapeKind } from "../../types";
import { cx } from "../ui/cx";

interface FrameVisualProps {
  kind: ShapeKind;
  wCm: number;
  hCm: number;
  wPx: number;
  hPx: number;
  selected: boolean;
  /** Arrange mode: desktop hover deepens the shadow. */
  hoverable: boolean;
}

const LABEL_CLASS = {
  full: "text-caption font-stretch-semi-condensed",
  compact: "text-micro font-stretch-condensed",
} as const;

/**
 * The frame look (design-system.md §3): mitred moulding, mat, picture opening with its bevel,
 * the size label tier that fits, and the selection brackets. Purely visual.
 */
export function FrameVisual({ kind, wCm, hCm, wPx, hPx, selected, hoverable }: FrameVisualProps) {
  const s = Math.min(wPx, hPx);
  const t = mouldingPx(s);
  const m = matPx(s);
  const tier = labelTier(kind, wCm, hCm, wPx, hPx);
  const circle = kind === "circle";
  const hover = hoverable && "can-hover:group-hover:shadow-frame-hover";

  const label = tier !== "hidden" && (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
      <span className={cx("font-medium whitespace-nowrap text-ink tabular-nums tracking-label", LABEL_CLASS[tier])}>
        {frameLabel(kind, wCm, hCm, tier)}
      </span>
    </div>
  );

  return (
    <div
      data-frame-body
      className={cx(
        "absolute inset-0 shadow-frame-rest",
        circle
          ? "rounded-full bg-linear-to-b from-frame-top to-frame-bottom"
          : "box-border border-solid border-t-frame-top border-x-frame-side border-b-frame-bottom",
        hover,
      )}
      style={circle ? undefined : { borderWidth: t }}
    >
      <div
        className={cx("absolute bg-mat", circle ? "rounded-full" : "inset-0")}
        style={{ padding: m, ...(circle ? { inset: t } : null) }}
      >
        <div className={cx("size-full bg-aperture inset-shadow-aperture", circle && "rounded-full")} />
      </div>
      {label}
      {selected && <SelectionBrackets wPx={wPx} hPx={hPx} offset={circle ? 4 : t + 4} arm={bracketArmPx(s)} />}
    </div>
  );
}

/** Four crop-mark L's just outside the frame's box (§3.6): a halo stroke under an accent stroke. */
function SelectionBrackets({ wPx, hPx, offset, arm }: { wPx: number; hPx: number; offset: number; arm: number }) {
  const W = wPx + 8;
  const H = hPx + 8;
  const a = arm;
  const d = `M0 ${a}V0H${a} M${W - a} 0H${W}V${a} M${W} ${H - a}V${H}H${W - a} M${a} ${H}H0V${H - a}`;
  return (
    <svg
      data-testid="selection-brackets"
      aria-hidden="true"
      width={W}
      height={H}
      className="pointer-events-none absolute overflow-visible"
      style={{ left: -offset, top: -offset }}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} className="stroke-halo" strokeWidth={5.5} />
      <path d={d} className="stroke-accent" strokeWidth={2.5} />
    </svg>
  );
}
