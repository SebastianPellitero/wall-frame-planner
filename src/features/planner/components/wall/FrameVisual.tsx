import type { ReactNode } from "react";
import { bracketArmPx, frameLabel, labelTier, matPx, mouldingPx, openingBox, platePlacement } from "../../lib/frameLook";
import type { ShapeKind } from "../../types";
import { cx } from "../ui/cx";

/** A photo frame's opening content and label state (§3.8). */
export interface FrameVisualPhoto {
  /** The `<img>`, once its object URL is known; null while it loads (the opening shows `bg-aperture`). */
  image: ReactNode | null;
  /** The size plate: not rendered (adjusting, Photo mode), at rest (hidden unless hovered), or shown (selected, lifted). */
  plate: "none" | "rest" | "shown";
  /** Adjust mode: the crop outline replaces the bevel or rebate. */
  adjusting: boolean;
}

interface FrameVisualProps {
  kind: ShapeKind;
  wCm: number;
  hCm: number;
  wPx: number;
  hPx: number;
  selected: boolean;
  /** Arrange mode: desktop hover deepens the shadow. */
  hoverable: boolean;
  /** False where a caption outside the frame carries the size (the Frame creator preview). */
  showLabel?: boolean;
  /** The mat between moulding and opening (§3.8); off, the opening fills the moulding. */
  mat?: boolean;
  /** The frame's photo; absent for plain frames, and for a photo that failed to load (plain-frame rules). */
  photo?: FrameVisualPhoto;
}

const LABEL_CLASS = {
  full: "text-caption font-stretch-semi-condensed",
  compact: "text-micro font-stretch-condensed",
} as const;

/**
 * The frame look (design-system.md §3): mitred moulding, mat, picture opening with its bevel,
 * the size label tier that fits, and the selection brackets. Purely visual. Square corners on
 * every layer of a rectangle or square. The colors come from the nearest `data-frame-color`
 * ancestor, which every caller sets (§3.2).
 */
export function FrameVisual({ kind, wCm, hCm, wPx, hPx, selected, hoverable, showLabel = true, mat = true, photo }: FrameVisualProps) {
  const s = Math.min(wPx, hPx);
  const t = mouldingPx(s);
  const m = mat ? matPx(s) : 0;
  const tier = showLabel ? labelTier(kind, wCm, hCm, wPx, hPx) : "hidden";
  const circle = kind === "circle";
  const hover = hoverable && "can-hover:group-hover:shadow-frame-hover";

  let label: ReactNode = null;
  if (tier !== "hidden" && !photo) {
    label = (
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
        <span className={cx("font-medium whitespace-nowrap text-frame-ink tabular-nums tracking-label", LABEL_CLASS[tier])}>
          {frameLabel(kind, wCm, hCm, tier)}
        </span>
      </div>
    );
  } else if (tier !== "hidden" && photo?.image && photo.plate !== "none") {
    label = (
      <LabelPlate
        text={frameLabel(kind, wCm, hCm, tier)}
        tierClass={LABEL_CLASS[tier]}
        placement={platePlacement(kind, openingBox(wPx, hPx, mat).h)}
        offset={t + m}
        shown={photo.plate === "shown"}
        hoverable={hoverable}
      />
    );
  }

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
        className={cx("absolute bg-mat inset-shadow-mat", circle ? "rounded-full" : "inset-0")}
        style={{ padding: m, ...(circle ? { inset: t } : null) }}
      >
        {photo ? (
          <div data-photo-opening className={cx("relative size-full overflow-hidden bg-aperture", circle && "rounded-full")}>
            {photo.image}
            <span
              aria-hidden="true"
              className={cx(
                "pointer-events-none absolute inset-0",
                circle && "rounded-full",
                photo.adjusting ? "inset-shadow-crop" : mat ? "inset-shadow-aperture" : "inset-shadow-rebate",
              )}
            />
          </div>
        ) : (
          <div className={cx("size-full bg-aperture inset-shadow-aperture", circle && "rounded-full")} />
        )}
      </div>
      {label}
      {selected && !photo?.adjusting && <SelectionBrackets wPx={wPx} hPx={hPx} offset={circle ? 4 : t + 4} arm={bracketArmPx(s)} />}
    </div>
  );
}

/**
 * The size label over a photo (§3.8): a square graphite plate, 4px above the opening's bottom (or
 * centered on short openings and circles). Hidden at rest, shown when selected or lifted and on
 * hover; the fade is `duration-quick` (none under reduced motion).
 */
function LabelPlate(props: { text: string; tierClass: string; placement: "bottom" | "center"; offset: number; shown: boolean; hoverable: boolean }) {
  const { text, tierClass, placement, offset, shown, hoverable } = props;
  return (
    <div className="pointer-events-none absolute" style={{ inset: offset }} aria-hidden="true">
      <span
        data-testid="label-plate"
        className={cx(
          "absolute left-1/2 -translate-x-1/2 bg-label-plate px-1 py-px font-medium whitespace-nowrap text-on-inverse tabular-nums tracking-label",
          "transition-opacity duration-quick motion-reduce:transition-none",
          placement === "bottom" ? "bottom-1" : "top-1/2 -translate-y-1/2",
          tierClass,
          shown ? "opacity-100" : "opacity-0",
          hoverable && "can-hover:group-hover:opacity-100",
        )}
      >
        {text}
      </span>
    </div>
  );
}

/** Four crop-mark L's just outside the frame's box (§3.7): a halo stroke under an accent stroke, square like the frames. */
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
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d={d} className="stroke-halo" strokeWidth={5.5} />
      <path d={d} className="stroke-accent" strokeWidth={2.5} />
    </svg>
  );
}
