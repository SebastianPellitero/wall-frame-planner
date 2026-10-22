import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { reducedMotion, settle, tween } from "../../lib/physics";

/** The ring pulse after a tap (§5.13): 0.6 → 1.6 scale, fading over 320ms (`duration-slow`). */
const PULSE = { from: 0.6, to: 1.6, ms: 320 };

interface OriginMarkerProps {
  /** The origin, in wall cm. */
  x: number;
  y: number;
  pxPerCm: number;
  /** Grid origin mode: a bigger crosshair with a center dot, and a pulse on every move. */
  setting: boolean;
}

/**
 * The grid origin crosshair (design-system.md §5.13): 2.5px accent over a 5.5px halo, 14px, or
 * 20px with a dot while setting the origin. A new origin springs there (`settle`) and, in Grid
 * origin mode, plays one ring pulse; a rescale (wall resize, rotation) jumps, like frames do.
 */
export function OriginMarker({ x, y, pxPerCm, setting }: OriginMarkerProps) {
  const reduced = useReducedMotion() === true;
  const mx = useMotionValue(x * pxPerCm);
  const my = useMotionValue(y * pxPerCm);
  const shown = useRef({ x, y, pxPerCm });
  // One pulse per new origin in Grid origin mode, skipped under reduced motion (§6.4). Derived
  // while rendering (the previous origin lives in state), so the ring mounts with the move.
  const [pulseFor, setPulseFor] = useState({ x, y, n: 0 });
  if (pulseFor.x !== x || pulseFor.y !== y) setPulseFor({ x, y, n: setting && !reduced ? pulseFor.n + 1 : pulseFor.n });
  const pulse = pulseFor.n;

  useLayoutEffect(() => {
    const prev = shown.current;
    shown.current = { x, y, pxPerCm };
    if (prev.pxPerCm !== pxPerCm) {
      mx.jump(x * pxPerCm);
      my.jump(y * pxPerCm);
      return;
    }
    if (prev.x === x && prev.y === y) return;
    const move = reduced ? tween(reducedMotion.tweenMs) : settle;
    animate(mx, x * pxPerCm, move);
    animate(my, y * pxPerCm, move);
  }, [x, y, pxPerCm, reduced, mx, my]);

  const arm = setting ? 10 : 7; // 20px / 14px crosshair
  const cross = `M${-arm} 0H${arm}M0 ${-arm}V${arm}`;

  return (
    <motion.g data-testid="grid-origin-marker" style={{ x: mx, y: my }} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {setting && pulse > 0 && (
        <motion.circle
          key={pulse}
          data-testid="origin-pulse"
          r={arm}
          className="stroke-accent"
          strokeWidth={2}
          initial={{ scale: PULSE.from, opacity: 1 }}
          animate={{ scale: PULSE.to, opacity: 0 }}
          transition={{ duration: PULSE.ms / 1000, ease: reducedMotion.ease }}
        />
      )}
      <path d={cross} className="stroke-halo" strokeWidth={5.5} />
      <path d={cross} className="stroke-accent" strokeWidth={2.5} />
      {setting && <circle r={2} className="fill-accent" />}
    </motion.g>
  );
}
