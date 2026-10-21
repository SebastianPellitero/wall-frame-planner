import type { KeyboardEvent, PointerEvent } from "react";
import { frameLabel } from "../../lib/frameLook";
import type { ShapeKind } from "../../types";
import { cx } from "../ui/cx";

export const KIND_NAME: Record<ShapeKind, string> = { rect: "Rectangle", square: "Square", circle: "Circle" };

interface PaletteTileProps {
  kind: ShapeKind;
  size: { w: number; h: number };
  active: boolean;
  onPointerDown(e: PointerEvent<HTMLButtonElement>): void;
  /** Keyboard add (Enter or Space): pointer taps go through `onPointerDown`. */
  onAdd(): void;
}

/**
 * A plain palette tile: name and live size (§5.1 interaction, not its final look; the
 * palette is being redesigned). Taps and drags are handled by the caller's pointer session.
 */
export function PaletteTile({ kind, size, active, onPointerDown, onAdd }: PaletteTileProps) {
  const label = frameLabel(kind, size.w, size.h, "full");
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    onAdd();
  };

  return (
    <button
      type="button"
      aria-label={`Add ${KIND_NAME[kind].toLowerCase()}, ${label} cm`}
      aria-pressed={active}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cx(
        "flex h-tile min-w-0 flex-1 touch-none flex-col items-start justify-center rounded-tile px-3 text-left select-none",
        "transition-transform duration-instant active:scale-[.97] motion-reduce:transition-none",
        active ? "border-2 border-accent bg-accent-soft" : "border border-line bg-surface can-hover:hover:bg-surface-pressed",
      )}
    >
      <span className="text-ui font-medium text-ink">{KIND_NAME[kind]}</span>
      <span className="text-caption text-ink-muted tabular-nums">{label}</span>
    </button>
  );
}
