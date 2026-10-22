import type { ComponentType } from "react";
import { useMoreBelow } from "../hooks/useMoreBelow";
import type { Shell } from "../hooks/useShell";
import { usePlannerStore } from "../state/store";
import type { Mode } from "../types";
import { OriginTools } from "./panel/OriginTools";
import { PhotoTools } from "./panel/PhotoTools";
import { SelectionBar } from "./panel/SelectionBar";
import { FrameCreator } from "./palette/FrameCreator";
import { MatrixControl } from "./palette/MatrixControl";
import { cx } from "./ui/cx";

type Content = "arrange" | "selection" | "photo" | "origin";

/**
 * §4.1 table. On a wide desktop the selection goes to the right panel, so the Frame creator
 * stays; a narrow desktop has no right panel, so the selection takes the sidebar (§4.4).
 */
function pickContent(mode: Mode, hasSelection: boolean, shell: Shell, narrow: boolean): Content {
  if (mode === "photo") return "photo";
  if (mode === "gridOrigin") return "origin";
  return hasSelection && (shell !== "desktop" || narrow) ? "selection" : "arrange";
}

const CONTENT: Record<Content, ComponentType<{ shell: Shell }>> = {
  arrange: ArrangeTools,
  selection: SelectionBar,
  photo: PhotoTools,
  origin: OriginTools,
};

/**
 * Arrange with nothing selected: the Frame creator, then the Matrix control on landscape and
 * desktop. Stacked shells keep the Matrix control in Settings > Grid (§4.2, §5.16).
 */
function ArrangeTools({ shell }: { shell: Shell }) {
  if (shell === "stacked") return <FrameCreator shell={shell} />;
  return (
    <div className="flex flex-col gap-2 desktop:gap-3">
      <FrameCreator shell={shell} />
      <div className="border-t border-line pt-3">
        <MatrixControl shell={shell} />
      </div>
    </div>
  );
}

/**
 * The context panel container: the dock (stacked), left rail (landscape) or left sidebar
 * (desktop). Its box depends only on the shell, never on the content, so swapping content
 * never resizes the stage and the wall never rescales (§4.1, §4.6). A rail or sidebar that
 * scrolls fades its bottom edge while more sits below the fold (§4.3).
 */
export function ContextPanel({ shell, narrow = false }: { shell: Shell; narrow?: boolean }) {
  const content = usePlannerStore((s) => pickContent(s.mode, s.selectedId !== null, shell, narrow));
  const Content = CONTENT[content];
  const stacked = shell === "stacked";
  const moreRef = useMoreBelow<HTMLDivElement>(!stacked);

  return (
    <div
      data-testid="context-panel"
      // Stacked: the dock's two rows, 56 + 8 + 64px (§4.2). Rails and sidebar fill their column.
      className={cx("relative", stacked ? "h-[128px]" : "min-h-0 flex-1")}
    >
      <div
        // Remounts per content, so the new content fades in (CSS @starting-style).
        key={content}
        ref={moreRef}
        data-testid="context-scroller"
        className={cx(
          "absolute inset-0 transition-opacity duration-base ease-in-out-soft starting:opacity-0 motion-reduce:transition-none",
          stacked
            ? "overflow-hidden"
            : "touch-pan-y overflow-y-auto overscroll-contain data-more:[mask-image:linear-gradient(to_bottom,#000_calc(100%-16px),transparent)]",
        )}
      >
        <Content shell={shell} />
      </div>
    </div>
  );
}
