import { useCallback, useId, useRef, type KeyboardEvent } from "react";
import { isLightColor, WALL_SWATCHES } from "../../lib/wallColor";
import { usePlannerStore } from "../../state/store";
import { useWallPaintPreview } from "../../state/wallPaintUi";
import { cx } from "../ui/cx";
import { CheckIcon, DropperIcon } from "../ui/icons";

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
const CHECKED_RING = "ring-2 ring-accent ring-offset-1 ring-offset-surface";
const toneText = (hex: string) => (isLightColor(hex) ? "text-ink" : "text-on-inverse");

/**
 * The wall paint (design-system.md §5.18): a 4 × 2 swatch radiogroup that commits each selection,
 * plus a Custom tile wrapping the native color input, which previews live on `input` and commits
 * on `change`. Not undoable (`setWall` is untracked).
 */
export function WallColorRow() {
  const labelId = useId();
  const color = usePlannerStore((s) => s.wall.color);
  const preview = useWallPaintPreview((s) => s.color);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const checked = WALL_SWATCHES.findIndex((s) => s.hex === color.toLowerCase());
  const customActive = checked < 0;

  const pick = (index: number) => usePlannerStore.getState().setWall({ color: WALL_SWATCHES[index].hex });

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const step = STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (index + step + WALL_SWATCHES.length) % WALL_SWATCHES.length;
    pick(next);
    radios.current[next]?.focus();
  };

  // React's onChange fires per `input`; the commit needs the native `change` (picker closed).
  const customRef = useCallback((el: HTMLInputElement | null) => {
    if (!el) return;
    const commit = () => {
      usePlannerStore.getState().setWall({ color: el.value });
      useWallPaintPreview.setState({ color: null });
    };
    el.addEventListener("change", commit);
    return () => el.removeEventListener("change", commit);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-ui">
        <span id={labelId} className="text-ink">
          Wall color
        </span>
        <span className="text-ink-muted">{customActive ? `Custom ${color.toLowerCase()}` : WALL_SWATCHES[checked].name}</span>
      </div>
      <div className="flex items-start gap-3">
        <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-[repeat(4,44px)] gap-1">
          {WALL_SWATCHES.map(({ name, hex }, index) => {
            const on = index === checked;
            return (
              <button
                key={hex}
                ref={(el) => {
                  radios.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={name}
                title={name}
                tabIndex={on || (customActive && index === 0) ? 0 : -1}
                onClick={() => pick(index)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className="group grid size-touch place-items-center rounded-control outline-offset-0"
              >
                <span
                  style={{ backgroundColor: hex }}
                  className={cx(
                    "grid size-9 place-items-center rounded-[8px]",
                    on ? CHECKED_RING : "ring-1 ring-swatch-edge ring-inset can-hover:group-hover:ring-line-strong",
                  )}
                >
                  {on && <CheckIcon size={18} className={toneText(hex)} />}
                </span>
              </button>
            );
          })}
        </div>
        <label
          style={customActive ? { backgroundColor: color } : undefined}
          className={cx(
            "relative grid h-[92px] w-[88px] place-content-center justify-items-center gap-1 rounded-control border-[1.5px] border-line-strong text-ui font-medium",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
            customActive ? cx("border-solid", CHECKED_RING, toneText(color)) : "border-dashed bg-surface text-ink",
          )}
        >
          {customActive ? <CheckIcon size={20} /> : <DropperIcon size={20} />}
          Custom
          <input
            ref={customRef}
            type="color"
            value={preview ?? color}
            // shortcut: a preview left by a picker closed without a change stays until the next pick; clear on blur if it shows up.
            onInput={(e) => useWallPaintPreview.setState({ color: e.currentTarget.value })}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
