import { motion, useReducedMotion } from "motion/react";
import { useRef, type KeyboardEvent } from "react";
import { reducedMotion, sheet } from "../../lib/physics";
import { useSelectionUi, type DetailsTab } from "../../state/selectionUi";
import { cx } from "../ui/cx";
import { ImageIcon, RulerIcon } from "../ui/icons";

const TABS: { tab: DetailsTab; label: string; Icon: typeof RulerIcon }[] = [
  { tab: "size", label: "Size", Icon: RulerIcon },
  { tab: "photo", label: "Photo", Icon: ImageIcon },
];

const NEXT_INDEX: Record<string, (i: number, n: number) => number> = {
  ArrowRight: (i) => i + 1,
  ArrowLeft: (i) => i - 1,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/** The id of a tab, so the tabpanel can be labelled by the selected one. */
export const tabId = (base: string, tab: DetailsTab) => `${base}-${tab}`;

/**
 * The stacked dock's Size | Photo tabs (design-system.md §4.7), built like the segmented control
 * (§5.3). Arrow keys move and activate; Tab lands on the selected tab. Below 360px they are
 * icon-only (`ruler`, `image`), named by `aria-label`.
 */
export function DetailsTabs({ baseId, panelId }: { baseId: string; panelId: string }) {
  const selected = useSelectionUi((s) => s.detailsTab);
  const reduce = useReducedMotion();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const step = NEXT_INDEX[e.key];
    if (!step) return;
    e.preventDefault();
    const n = TABS.length;
    const next = (step(index, n) + n) % n;
    useSelectionUi.getState().setDetailsTab(TABS[next].tab);
    tabs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Frame details" className="flex h-touch shrink-0 rounded-pill bg-surface-sunken">
      {TABS.map(({ tab, label, Icon }, index) => {
        const on = tab === selected;
        return (
          <button
            key={tab}
            ref={(el) => {
              tabs.current[index] = el;
            }}
            id={tabId(baseId, tab)}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={panelId}
            aria-label={label}
            tabIndex={on ? 0 : -1}
            onClick={() => useSelectionUi.getState().setDetailsTab(tab)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cx(
              "relative flex h-touch shrink-0 items-center justify-center rounded-pill px-3 text-ui transition-colors duration-quick ease-out-soft max-[359px]:w-touch max-[359px]:px-0",
              on ? "font-semibold text-ink" : "font-medium text-ink-muted can-hover:hover:text-ink",
            )}
          >
            {on && (
              <motion.span
                layoutId="details-tab-thumb"
                transition={reduce ? { duration: reducedMotion.tweenLongMs / 1000, ease: reducedMotion.ease } : sheet}
                className="absolute inset-[3px] rounded-pill bg-surface shadow-raised ring-1 ring-line"
              />
            )}
            <span className="relative max-[359px]:hidden">{label}</span>
            <Icon className="relative hidden max-[359px]:block" />
          </button>
        );
      })}
    </div>
  );
}
