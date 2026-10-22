import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { addFromPalette, usePaletteDrag } from "../../hooks/usePaletteDrag";
import type { Shell } from "../../hooks/useShell";
import { readyAnnouncement } from "../../lib/frameLook";
import { sizeLimits } from "../../lib/paletteMath";
import { announce } from "../../state/announcer";
import { usePlannerStore } from "../../state/store";
import type { ShapeKind } from "../../types";
import { PanelSection } from "../panel/PanelSection";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { CmField } from "../ui/CmField";
import { cx } from "../ui/cx";
import { useSharedHelper } from "../ui/useSharedHelper";
import { useWallContext } from "../wall/WallContext";
import { CreatorPreview } from "./CreatorPreview";
import { DragGhost } from "./DragGhost";
import { ShapePicker } from "./ShapePicker";

type Size = { w: number; h: number };

/**
 * Where each part sits per shell (design-system.md §4.2–4.4, §5.1). The DOM order is the focus
 * order on every shell, picker → fields → Generate → preview (§7); `order` and grid placement
 * put the preview where the layout draws it.
 */
const LAYOUT: Record<Shell, { form: string; preview: string; fields: string; width: (single: boolean) => string; height: string; generate: string }> = {
  // Row A (56): picker | preview | (Undo/Redo, from the shell: 2 × 44 + 8). Row B (64): fields | Generate.
  // Fills the 128px dock exactly; the margin keeps row A full, so the fields wrap to row B.
  stacked: {
    form: "flex flex-wrap gap-2",
    preview: "order-2 mr-24 h-tile flex-1 basis-[calc(100%-236px)]",
    fields: "order-3 flex min-w-0 flex-1 gap-2",
    width: () => "flex-1",
    height: "flex-1",
    generate: "order-3 self-end",
  },
  landscape: {
    form: "flex flex-col gap-2",
    preview: "order-2 h-preview shrink-0 [@media(max-height:305px)]:h-14",
    fields: "order-3 grid grid-cols-2 gap-2",
    width: (single) => (single ? "col-span-2" : "min-w-0"),
    height: "min-w-0",
    generate: "order-4 w-full",
  },
  // The sketch's dimension drawing: Height left of the preview, Width centered under it.
  desktop: {
    form: "grid grid-cols-[76px_minmax(0,1fr)] gap-x-2 gap-y-3",
    preview: "row-start-2 h-preview-lg",
    fields: "contents",
    width: () => "row-start-3 -mt-1 w-field justify-self-center",
    height: "col-start-1 row-start-2 w-field self-center",
    generate: "col-span-2 row-start-4 w-full",
  },
};

const FIELD_LABEL: Record<ShapeKind, string> = { rect: "Width", square: "Side", circle: "Diameter" };

/**
 * The Frame creator (design-system.md §5.1): pick a shape, type its size, press Generate, then
 * drag the preview onto the wall or tap it. Typed sizes stay drafts until Generate, so the
 * preview always shows exactly what will be added.
 */
export function FrameCreator({ shell }: { shell: Shell }) {
  const { pxPerCm } = useWallContext();
  const kind = usePlannerStore((s) => s.paletteKind);
  const generated = usePlannerStore((s) => s.paletteSizes[kind]);
  const color = usePlannerStore((s) => s.creatorColor);
  const wall = usePlannerStore((s) => s.wall);
  const { onPointerDown, ghost, motion } = usePaletteDrag();
  const [draft, setDraftState] = useState<Size>(generated);
  // Read on submit, which can follow a field's Enter commit before a re-render.
  const draftRef = useRef(draft);
  useLayoutEffect(() => {
    draftRef.current = draft;
  });
  // A new shape or a new generated size (Generate, clamped; a reset) replaces the draft.
  const [shown, setShown] = useState({ kind, generated });
  if (shown.kind !== kind || shown.generated !== generated) {
    setShown({ kind, generated });
    setDraftState(generated);
  }
  const [generation, setGeneration] = useState(0);
  const layout = LAYOUT[shell];
  const stacked = shell === "stacked";
  const single = kind !== "rect";
  const limits = sizeLimits(kind, wall);

  const setDraft = (next: Size) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const invalid = e.currentTarget.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
    if (invalid) {
      invalid.focus();
      return;
    }
    const { w, h } = draftRef.current;
    usePlannerStore.getState().generate(kind, single ? { w, h: w } : { w, h });
    // The store clamps to the wall, so announce what it kept.
    const ready = usePlannerStore.getState().paletteSizes[kind];
    announce(readyAnnouncement(kind, ready.w, ready.h));
    setGeneration((g) => g + 1);
  };

  // The rail's two compact columns share one helper line below them (§5.2).
  const compact = shell === "landscape" && !single;
  const shared = useSharedHelper();
  const fieldProps = { compact, errorInLabel: stacked };

  return (
    <PanelSection title="Frame creator">
      <form noValidate onSubmit={onSubmit} className={layout.form}>
        <div className={cx("order-1", shell === "desktop" && "col-span-2 row-start-1")}>
          {/* A shape shows its last generated size and keeps the current color. */}
          <ShapePicker value={kind} onChange={(next) => usePlannerStore.getState().setPaletteKind(next)} stretch={shell !== "stacked"} />
        </div>
        <div className={layout.fields}>
          <CmField
            key={`${kind}-w`}
            label={FIELD_LABEL[kind]}
            value={draft.w}
            {...limits.w}
            onCommit={(w) => setDraft(single ? { w, h: w } : { ...draftRef.current, w })}
            className={cx(layout.width(single), shell === "desktop" && (single ? "col-span-2" : "col-start-2"))}
            centerHelper={shell === "desktop"}
            {...fieldProps}
            {...(compact ? shared.bind("w") : {})}
          />
          {!single && (
            <CmField
              key={`${kind}-h`}
              label="Height"
              value={draft.h}
              {...limits.h}
              onCommit={(h) => setDraft({ ...draftRef.current, h })}
              className={layout.height}
              {...fieldProps}
              {...(compact ? shared.bind("h") : {})}
            />
          )}
          {compact && shared.helper}
        </div>
        <button
          type="submit"
          className={cx(
            PRIMARY_BUTTON,
            layout.generate,
          )}
        >
          Generate
        </button>
        <CreatorPreview
          kind={kind}
          size={generated}
          color={color}
          generation={generation}
          caption={!stacked}
          className={cx(layout.preview, shell === "desktop" && (single ? "col-span-2" : "col-start-2"))}
          onPress={(e, source) => onPointerDown(kind, e, source)}
          onAdd={() => addFromPalette(kind)}
        />
      </form>
      {ghost && <DragGhost ghost={ghost} motion={motion} pxPerCm={pxPerCm} />}
    </PanelSection>
  );
}
