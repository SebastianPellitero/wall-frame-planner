import { useId } from "react";
import type { Shell } from "../../hooks/useShell";
import { previewCaption } from "../../lib/frameLook";
import { sizeLimits } from "../../lib/paletteMath";
import { deleteFrame, duplicateFrame } from "../../state/frameCommands";
import { useSelectionUi } from "../../state/selectionUi";
import { usePlannerStore } from "../../state/store";
import type { Shape, ShapeKind, Wall } from "../../types";
import { DANGER_ICON_BUTTON, ICON_BUTTON, SECONDARY_BUTTON, SECONDARY_DANGER_BUTTON } from "../ui/buttons";
import { CmField } from "../ui/CmField";
import { cx } from "../ui/cx";
import { useSharedHelper } from "../ui/useSharedHelper";
import { CloseIcon, DuplicateIcon, TrashIcon } from "../ui/icons";
import { rescueFocus } from "../../hooks/rescueFocus";
import { AdjustTools } from "./AdjustTools";
import { DetailsTabs, tabId } from "./DetailsTabs";
import { MatIconSwitch, type ControlLook } from "./FramePhotoControls";
import { DesktopFramePhoto, DockPhotoControls, RailPhotoControls } from "./FramePhotoGroups";
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

const deleteSelected = (id: string) => {
  rescueFocus(id);
  deleteFrame(id);
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
  const adjusting = useSelectionUi((s) => shape !== undefined && s.adjustingId === shape.id);
  const tab = useSelectionUi((s) => s.detailsTab);
  // The landscape rail's compact pairs each share one helper line below them (§5.2).
  const sizeHelper = useSharedHelper();
  const positionHelper = useSharedHelper();
  const tabsId = useId();
  if (!shape) return null;

  const { size, position } = fieldSpecs(shape, wall);
  const landscape = shell === "landscape";
  const stacked = shell === "stacked";
  const single = size.length === 1;

  const renderField = (f: FieldSpec, className: string, compact = false, helper?: ReturnType<typeof useSharedHelper>) => (
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
      {...(helper ? helper.bind(f.key) : {})}
    />
  );

  const look: ControlLook = landscape ? "icon" : stacked ? "dock" : "label";
  const actions = <SelectionActions shape={shape} look={look} />;

  if (stacked) {
    const panelId = `${tabsId}-panel`;
    return (
      <PanelSection title="Selected frame">
        {/* Rows 56 + 64 fill the 128px dock (§4.2); pr-24 leaves row A's end to Undo/Redo. */}
        <div className="grid grid-rows-[56px_64px] gap-2">
          {adjusting ? (
            <AdjustTools shape={shape} shell={shell} />
          ) : (
            <>
              <div className="flex items-center gap-2 pr-24">
                <DetailsTabs baseId={tabsId} panelId={panelId} />
                {actions}
              </div>
              <div
                id={panelId}
                role="tabpanel"
                aria-labelledby={tabId(tabsId, tab)}
                className={cx("flex gap-2", tab === "photo" && "items-end")}
              >
                {tab === "size" ? [...size, ...position].map((f) => renderField(f, "flex-1", !single)) : <DockPhotoControls shape={shape} />}
              </div>
            </>
          )}
        </div>
      </PanelSection>
    );
  }

  if (landscape && adjusting) {
    return (
      <PanelSection title="Selected frame" className="h-full gap-2">
        <AdjustTools shape={shape} shell={shell} />
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
      {/* The rail's action row: three borderless icons, Mat the third (§4.3). */}
      <div className={landscape ? "grid grid-cols-3" : "grid grid-cols-2 gap-2"}>
        {actions}
        {landscape && <MatIconSwitch shape={shape} />}
      </div>
      <div className={cx("grid grid-cols-2 gap-x-2", landscape ? "gap-y-2" : "gap-y-3")}>
        {size.map((f) =>
          renderField(f, cx("min-w-0", single && landscape && "col-span-2"), landscape && !single, landscape && !single ? sizeHelper : undefined),
        )}
        {landscape && !single && sizeHelper.helper}
        {/* X always starts a row, so a lone Side or Diameter sits above X and Y. */}
        {position.map((f, i) => renderField(f, cx("min-w-0", i === 0 && "col-start-1"), landscape, landscape ? positionHelper : undefined))}
        {landscape && positionHelper.helper}
      </div>
      {landscape ? <RailPhotoControls shape={shape} /> : <DesktopFramePhoto shape={shape} adjusting={adjusting} />}
    </PanelSection>
  );
}

/**
 * Duplicate and Delete: labelled on desktop, borderless icons in the landscape rail, and in the
 * dock labelled from 640px and icon-only below (§4.2). Always named by `aria-label`.
 */
function SelectionActions({ shape, look }: { shape: Shape; look: ControlLook }) {
  const icon = look === "icon";
  const style = (base: string, iconBase: string) => (icon ? iconBase : cx(base, look === "dock" && "max-sm:w-touch max-sm:px-0"));
  const text = (t: string) => (icon ? null : <span className={cx(look === "dock" && "max-sm:hidden")}>{t}</span>);
  const title = (t: string) => (look === "label" ? undefined : t);
  return (
    <>
      <button
        type="button"
        aria-label="Duplicate"
        title={title("Duplicate")}
        onClick={() => duplicateFrame(shape.id)}
        className={style(SECONDARY_BUTTON, ICON_BUTTON)}
      >
        <DuplicateIcon size={icon ? 20 : 18} />
        {text("Duplicate")}
      </button>
      <button
        type="button"
        aria-label="Delete"
        title={title("Delete")}
        onClick={() => deleteSelected(shape.id)}
        className={style(SECONDARY_DANGER_BUTTON, DANGER_ICON_BUTTON)}
      >
        <TrashIcon size={icon ? 20 : 18} />
        {text("Delete")}
      </button>
    </>
  );
}
