import { formatCm } from "../../lib/format";

const LINE = "bg-ink-muted/40";
const LABEL = "absolute whitespace-nowrap text-caption text-ink-muted tabular-nums font-stretch-semi-condensed";

/**
 * Desktop only (§5.13): "300 cm" 20px above the wall and "250 cm" rotated −90° 20px to its
 * left, each on a 1px dimension line with 6px end ticks. Sits in the stage padding; render
 * it inside the wall element so it is positioned against the wall's edges.
 */
export function WallDimensions({ width, height }: { width: number; height: number }) {
  return (
    <div className="pointer-events-none">
      <div className={`absolute inset-x-0 bottom-full mb-5 h-px ${LINE}`}>
        <span className={`absolute top-1/2 left-0 h-1.5 w-px -translate-y-1/2 ${LINE}`} />
        <span className={`absolute top-1/2 right-0 h-1.5 w-px -translate-y-1/2 ${LINE}`} />
        <span className={`${LABEL} bottom-full left-1/2 mb-0.5 -translate-x-1/2`}>{formatCm(width)} cm</span>
      </div>
      <div className={`absolute inset-y-0 right-full mr-5 w-px ${LINE}`}>
        <span className={`absolute top-0 left-1/2 h-px w-1.5 -translate-x-1/2 ${LINE}`} />
        <span className={`absolute bottom-0 left-1/2 h-px w-1.5 -translate-x-1/2 ${LINE}`} />
        <span className={`${LABEL} top-1/2 right-full mr-0.5 -translate-y-1/2 rotate-180 [writing-mode:vertical-rl]`}>
          {formatCm(height)} cm
        </span>
      </div>
    </div>
  );
}
