import type { Shell } from "../../hooks/useShell";
import { previewCaption } from "../../lib/frameLook";
import { sizeLimits } from "../../lib/paletteMath";
import { duplicateFrame } from "../../state/frameCommands";
import { usePlannerStore } from "../../state/store";
import type { Shape, ShapeKind, Wall } from "../../types";
import { ICON_BUTTON, SECONDARY_BUTTON } from "../ui/buttons";
import { CmField } from "../ui/CmField";
import { cx } from "../ui/cx";
import { CloseIcon, DuplicateIcon, TrashIcon } from "../ui/icons";
import { rescueFocus } from "../../hooks/rescueFocus";
import { PanelSection } from "./PanelSection";

const SIZE_LABEL: Record<ShapeKind, string> = { rect: "Width", square: "Side", circle: "Diameter" };

type Patch = Partial<Pick<Shape, "x" | "y" | "w" | "h">>;
interface FieldSpec {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  patch(v: number): Patch;
}

/** Size, then position (§5.4). Limits keep the frame on the wall; the store clamps anyway. */
function fieldSpecs(shape: Shape, wall: Wall): { size: FieldSpec[]; position: FieldSpec[] } {
  const limits = sizeLimits(shape.kind, wall);
  const size: FieldSpec[] =
    shape.kind === "rect"
      ? [
          { key: "w", label: "Width", value: shape.w, ...limits.w, patch: (w) => ({ w }) },
          { key: "h", label: "Height", value: shape.h, ...limits.h, patch: (h) => ({ h }) },
        ]
      : [{ key: "w", label: SIZE_LABEL[shape.kind], value: shape.w, ...limits.w, patch: (s) => ({ w: s, h: s }) }];
  const position: FieldSpec[] = [
    { key: "x", label: "X", value: shape.x, min: 0, max: Math.max(0, wall.width - shape.w), patch: (x) => ({ x }) },
    { key: "y", label: "Y", value: shape.y, min: 0, max: Math.max(0, wall.height - shape.h), patch: (y) => ({ y }) },
  ];
  return { size, position };
}

const deleteFrame = (id: string) => {
  rescueFocus(id);
  usePlannerStore.getState().deleteShape(id);
};

const deselect = () => {
  rescueFocus();
  usePlannerStore.getState().select(null);
};

/**
 * The selected frame's actions and exact size and position (design-system.md §5.4), laid out
 * per shell: two dock rows (stacked; Undo/Redo sit at the end of row A, from the shell), the
 * left-rail body with a header (landscape), or the right panel's first section (desktop).
 * Every edit commits through `commitShape`, so it clamps and pushes neighbors.
 */
export function SelectionBar({ shell }: { shell: Shell }) {
  const shape = usePlannerStore((s) => s.shapes.find((shape) => shape.id === s.selectedId));
  const wall = usePlannerStore((s) => s.wall);
  if (!shape) return null;

  const { size, position } = fieldSpecs(shape, wall);
  const landscape = shell === "landscape";
  const stacked = shell === "stacked";
  const single = size.length === 1;

  const renderField = (f: FieldSpec, className: string, compact = false) => (
    <CmField
      key={`${shape.id}-${f.key}`}
      label={f.label}
      value={f.value}
      min={f.min}
      max={f.max}
      onCommit={(v) => usePlannerStore.getState().commitShape(shape.id, f.patch(v))}
      className={className}
      compact={compact}
      errorInLabel={stacked}
    />
  );

  const actions = (
    <>
      <button
        type="button"
        aria-label={landscape ? "Duplicate" : undefined}
        title={landscape ? "Duplicate" : undefined}
        onClick={() => duplicateFrame(shape.id)}
        className={cx(SECONDARY_BUTTON, landscape && "px-0")}
      >
        <DuplicateIcon size={landscape ? 20 : 18} />
        {!landscape && "Duplicate"}
      </button>
      <button
        type="button"
        aria-label={landscape ? "Delete" : undefined}
        title={landscape ? "Delete" : undefined}
        onClick={() => deleteFrame(shape.id)}
        className={cx(SECONDARY_BUTTON, "text-danger", landscape && "px-0")}
      >
        <TrashIcon size={landscape ? 20 : 18} />
        {!landscape && "Delete"}
      </button>
    </>
  );

  if (stacked) {
    return (
      <PanelSection title="Selected frame">
        {/* Rows 56 + 64 fill the 128px dock (§4.2); pr-24 leaves row A's end to Undo/Redo. */}
        <div className="grid grid-rows-[56px_64px] gap-2">
          <div className="flex items-center gap-2 pr-24">{actions}</div>
          <div className="flex gap-2">{[...size, ...position].map((f) => renderField(f, "flex-1", !single))}</div>
        </div>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Selected frame">
      {landscape && (
        <div className="flex items-center justify-between gap-1">
          <span className="min-w-0 truncate pl-0.5 text-caption text-ink-muted tabular-nums">
            {previewCaption(shape.kind, shape.w, shape.h)}
          </span>
          <button type="button" aria-label="Deselect" title="Deselect" onClick={deselect} className={cx(ICON_BUTTON, "-mr-1")}>
            <CloseIcon />
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">{actions}</div>
      <div className={cx("grid grid-cols-2 gap-x-2", landscape ? "gap-y-2" : "gap-y-3")}>
        {size.map((f) => renderField(f, cx("min-w-0", single && landscape && "col-span-2"), landscape && !single))}
        {/* X always starts a row, so a lone Side or Diameter sits above X and Y. */}
        {position.map((f, i) => renderField(f, cx("min-w-0", i === 0 && "col-start-1"), landscape))}
      </div>
    </PanelSection>
  );
}
