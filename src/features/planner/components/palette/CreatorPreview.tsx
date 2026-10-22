import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useElementSize } from "../../hooks/useElementSize";
import { previewCaption, previewName } from "../../lib/frameLook";
import { fitPreview } from "../../lib/paletteMath";
import { crossFadeMs, generateFromScale, popIn, tween } from "../../lib/physics";
import type { FrameColor, ShapeKind } from "../../types";
import { cx } from "../ui/cx";
import { FrameVisual } from "../wall/FrameVisual";

/** Caption line (16px) plus its 4px gap above (§5.1). */
const CAPTION_PX = 20;
const CROSS_FADE = tween(crossFadeMs);

interface CreatorPreviewProps {
  kind: ShapeKind;
  size: { w: number; h: number };
  color: FrameColor;
  /** Bumps on every Generate: the new frame pops in; a color roll alone only cross-fades. */
  generation: number;
  /** Stacked dock: no room for the caption, so the frame's own label shows. */
  caption: boolean;
  className?: string;
  /** Press on the preview; `source` is the drawn frame, where a drag ghost grows from. */
  onPress(e: PointerEvent<HTMLElement>, source: Element | null): void;
  /** Keyboard or assistive-tech activation. */
  onAdd(): void;
}

/**
 * The Frame creator's preview box (design-system.md §5.1): a piece of wall with the generated
 * frame drawn in its color, scaled to fit, above its caption. It is the drag source and the
 * tap target (`role="button"`, named by what it adds).
 */
export function CreatorPreview({ kind, size, color, generation, caption, className, onPress, onAdd }: CreatorPreviewProps) {
  const reduced = useReducedMotion() === true;
  const [contentRef, content] = useElementSize<HTMLDivElement>();
  /** The newest drawn frame; an exiting one never clears it. */
  const frameRef = useRef<HTMLDivElement | null>(null);
  /**
   * A primary pointer press handles its own tap; the click it produces must not add a second
   * frame. Cleared once that click cycle is over (a drag produces no click) and on any key, so
   * it never swallows a later assistive-tech click.
   */
  const pointerPressed = useRef(false);
  const fit = fitPreview(size, content, caption ? CAPTION_PX : 0);
  const frameKey = `${generation}:${color}`;
  // Only the frame a Generate mounted pops in; a color roll after an add just cross-fades (§6.3).
  const [seenGeneration, setSeenGeneration] = useState(generation);
  const [popKey, setPopKey] = useState<string | null>(null);
  if (generation !== seenGeneration) {
    setSeenGeneration(generation);
    setPopKey(frameKey);
  }
  const pop = !reduced && popKey === frameKey;

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.isPrimary && e.button === 0) {
      pointerPressed.current = true;
      // The click, if any, fires in the same task as the pointerup; after that the press is spent.
      const { pointerId } = e;
      const spent = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointerup", spent);
        window.removeEventListener("pointercancel", spent);
        setTimeout(() => (pointerPressed.current = false), 0);
      };
      window.addEventListener("pointerup", spent);
      window.addEventListener("pointercancel", spent);
    }
    onPress(e, frameRef.current);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    pointerPressed.current = false;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!e.repeat) onAdd();
  };
  const onClick = () => {
    if (pointerPressed.current) {
      pointerPressed.current = false;
      return;
    }
    onAdd();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={previewName(kind, size.w, size.h)}
      data-testid="creator-preview"
      data-frame-color={color}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cx(
        "relative min-w-0 touch-none overflow-hidden rounded-tile bg-wall ring-1 ring-line ring-inset select-none",
        "transition-transform duration-instant active:scale-[.97] motion-reduce:transition-none can-hover:hover:ring-line-strong",
        caption ? "p-3" : "p-1.5",
        className,
      )}
    >
      <div ref={contentRef} className="flex size-full flex-col items-center justify-center">
        <div className="relative shrink-0" style={{ width: fit.w, height: fit.h }}>
          <AnimatePresence initial={false}>
            <motion.div
              key={frameKey}
              ref={(el) => {
                if (el) frameRef.current = el;
              }}
              data-frame-color={color}
              className="absolute top-1/2 left-1/2 -translate-1/2"
              style={{ width: fit.w, height: fit.h }}
              initial={reduced ? false : { opacity: 0, scale: pop ? generateFromScale : 1 }}
              animate={{ opacity: 1, scale: 1, transition: { opacity: CROSS_FADE, scale: popIn } }}
              exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transition: CROSS_FADE }}
            >
              <FrameVisual kind={kind} wCm={size.w} hCm={size.h} wPx={fit.w} hPx={fit.h} selected={false} hoverable={false} showLabel={!caption} />
            </motion.div>
          </AnimatePresence>
        </div>
        {caption && (
          <span aria-hidden="true" className="mt-1 shrink-0 text-caption text-ink-muted tabular-nums">
            {previewCaption(kind, size.w, size.h)}
          </span>
        )}
      </div>
    </div>
  );
}
