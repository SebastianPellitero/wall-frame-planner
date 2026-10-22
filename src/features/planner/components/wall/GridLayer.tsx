import { useMemo } from "react";
import { gridLines } from "../../lib/gridLines";
import { usePlannerStore } from "../../state/store";
import { OriginMarker } from "./OriginMarker";
import { useWallContext } from "./WallContext";

/** Centers a 1px line on a device pixel. */
const crisp = (px: number) => Math.round(px) + 0.5;
const isOrigin = (cm: number, origin: number) => Math.abs(cm - origin) < 1e-6;

/**
 * Grid lines every spacingX/spacingY cm through the origin, with the two origin lines in
 * `grid-origin` and the origin crosshair (design-system.md §5.13). Lines draw only while the
 * grid is on; the marker also shows in Grid origin mode, where it grows and gains a dot.
 */
export function GridLayer() {
  const { pxPerCm, wallPx } = useWallContext();
  const width = usePlannerStore((s) => s.wall.width);
  const height = usePlannerStore((s) => s.wall.height);
  const grid = usePlannerStore((s) => s.grid);
  const settingOrigin = usePlannerStore((s) => s.mode === "gridOrigin");
  // Over a visible photo every line gets a light underlay.
  const overPhoto = usePlannerStore((s) => s.background.hasImage && s.background.visible);

  const { xs, ys } = useMemo(() => gridLines({ width, height }, grid), [width, height, grid]);
  if (!grid.enabled && !settingOrigin) return null;

  const { w, h } = wallPx;
  const vertical = (cm: number) => ({ x1: crisp(cm * pxPerCm), x2: crisp(cm * pxPerCm), y1: 0, y2: h });
  const horizontal = (cm: number) => ({ x1: 0, x2: w, y1: crisp(cm * pxPerCm), y2: crisp(cm * pxPerCm) });
  const all = [...xs.map(vertical), ...ys.map(horizontal)];
  const regular = [...xs.filter((x) => !isOrigin(x, grid.originX)).map(vertical), ...ys.filter((y) => !isOrigin(y, grid.originY)).map(horizontal)];
  const origin = [
    ...xs.filter((x) => isOrigin(x, grid.originX)).map(vertical),
    ...ys.filter((y) => isOrigin(y, grid.originY)).map(horizontal),
  ];


  return (
    <svg
      data-testid="grid"
      aria-hidden="true"
      width={w}
      height={h}
      className="pointer-events-none absolute inset-0 z-grid overflow-visible"
    >
      {grid.enabled && (
        <g shapeRendering="crispEdges" strokeWidth={1}>
          {overPhoto && (
            <g className="stroke-grid-halo" strokeWidth={3}>
              {all.map((line, i) => (
                <line key={i} {...line} />
              ))}
            </g>
          )}
          <g className="stroke-grid">
            {regular.map((line, i) => (
              <line key={i} data-line="grid" {...line} />
            ))}
          </g>
          <g className="stroke-grid-origin">
            {origin.map((line, i) => (
              <line key={i} data-line="origin" {...line} />
            ))}
          </g>
        </g>
      )}
      <OriginMarker x={grid.originX} y={grid.originY} pxPerCm={pxPerCm} setting={settingOrigin} />
    </svg>
  );
}
