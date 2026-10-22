import { useMemo, useRef } from "react";
import { useShell } from "../hooks/useShell";
import { useShortcuts } from "../hooks/useShortcuts";
import { useWallScale } from "../hooks/useWallScale";
import { STAGE_PADDING_PX } from "../lib/wallScale";
import { usePlannerStore } from "../state/store";
import { DesktopShell } from "./shell/DesktopShell";
import { LandscapeShell } from "./shell/LandscapeShell";
import { StackedShell } from "./shell/StackedShell";
import { RotateHint } from "./ui/RotateHint";
import { WallContext } from "./wall/WallContext";
import { WallStage } from "./wall/WallStage";

/** The editor. Client-only (see PlannerAppLoader), so storage never causes hydration mismatches. */
export function PlannerApp() {
  const shell = useShell();
  useShortcuts();
  const wall = usePlannerStore((s) => s.wall);
  const { stageRef, pxPerCm, wallPx } = useWallScale(wall, shell === "desktop" ? STAGE_PADDING_PX.desktop : STAGE_PADDING_PX.phone);
  const wallRef = useRef<HTMLDivElement>(null);
  const { w, h } = wallPx;
  // Above the shell, so the palette (outside the stage) can hit-test drops on the wall too.
  const context = useMemo(() => ({ pxPerCm, wallRef, wallPx: { w, h } }), [pxPerCm, w, h]);

  const stage = (
    <WallStage stageRef={stageRef} shell={shell}>
      {shell === "stacked" && <RotateHint />}
      {/* T10: toast region, bottom-center of the stage */}
    </WallStage>
  );

  return (
    <WallContext value={context}>
      {shell === "landscape" ? (
        <LandscapeShell stage={stage} />
      ) : shell === "desktop" ? (
        <DesktopShell stage={stage} />
      ) : (
        <StackedShell stage={stage} />
      )}
    </WallContext>
  );
}
