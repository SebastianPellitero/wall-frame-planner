import type { ComponentType } from "react";
import type { Shell } from "../hooks/useShell";
import { usePlannerStore } from "../state/store";
import type { Mode } from "../types";
import { OriginTools } from "./panel/OriginTools";
import { PhotoTools } from "./panel/PhotoTools";
import { SelectionPanel } from "./panel/SelectionPanel";
import { FrameCreator } from "./palette/FrameCreator";
import { MatrixControl } from "./palette/MatrixControl";
import { cx } from "./ui/cx";

type Content = "arrange" | "selection" | "photo" | "origin";

/** §4.1 table. On desktop the selection goes to the right panel, so the Frame creator stays. */
function pickContent(mode: Mode, hasSelection: boolean, shell: Shell): Content {
  if (mode === "photo") return "photo";
  if (mode === "gridOrigin") return "origin";
  return hasSelection && shell !== "desktop" ? "selection" : "arrange";
}

const CONTENT: Record<Content, ComponentType<{ shell: Shell }>> = {
  arrange: ArrangeTools,
  selection: SelectionPanel,
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
 * never resizes the stage and the wall never rescales (§4.1, §4.6).
 */
export function ContextPanel({ shell }: { shell: Shell }) {
  const content = usePlannerStore((s) => pickContent(s.mode, s.selectedId !== null, shell));
  const Content = CONTENT[content];

  return (
    <div
      data-testid="context-panel"
      // Stacked: the dock's two rows, 56 + 8 + 64px (§4.2). Rails and sidebar fill their column.
      className={cx("relative", shell === "stacked" ? "h-[128px]" : "min-h-0 flex-1")}
    >
      <div
        // Remounts per content, so the new content fades in (CSS @starting-style).
        key={content}
        className={cx(
          "absolute inset-0 transition-opacity duration-base ease-in-out-soft starting:opacity-0 motion-reduce:transition-none",
          shell === "stacked" ? "overflow-hidden" : "overflow-y-auto overscroll-contain",
        )}
      >
        <Content shell={shell} />
      </div>
    </div>
  );
}
