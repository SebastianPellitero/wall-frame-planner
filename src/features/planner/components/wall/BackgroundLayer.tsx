import { motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useState } from "react";
import type { LivePlacement } from "../../hooks/usePinchPan";
import { restorePhoto } from "../../state/photoCommands";
import { usePhotoImage } from "../../state/photoImage";
import { usePlannerStore } from "../../state/store";
import { cx } from "../ui/cx";
import { useWallContext } from "./WallContext";

/** An object URL for `blob`, revoked when the blob changes or the layer unmounts. */
function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL is an external resource tied to this effect's lifetime
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
      setUrl(null);
    };
  }, [blob]);
  return url;
}

/**
 * The background photo (design-system.md §5.14), decorative and inert: tests find it by
 * `data-testid="background-photo"`. Placed in wall cm from the live placement (which equals the
 * store's except during a Photo-mode gesture). Arrange and Grid origin clip it to the wall; Photo
 * mode lets it run past the wall, veiled with `photo-dim` outside, so it can be lined up.
 * After a reload it reads the saved image back (restorePhoto).
 */
export function BackgroundLayer({ live }: { live: LivePlacement }) {
  const { pxPerCm } = useWallContext();
  const hasImage = usePlannerStore((s) => s.background.hasImage);
  const visible = usePlannerStore((s) => s.background.visible);
  const opacity = usePlannerStore((s) => s.background.opacity);
  const aspect = usePlannerStore((s) => s.background.aspect);
  const photoMode = usePlannerStore((s) => s.mode === "photo");
  const blob = usePhotoImage((s) => s.blob);
  const url = useObjectUrl(blob);

  useEffect(() => {
    if (hasImage && !blob) void restorePhoto();
  }, [hasImage, blob]);

  // cm → px for the motion values; the scale and aspect ride along as motion values too.
  const scale = useMotionValue(pxPerCm);
  const ratio = useMotionValue(aspect);
  useLayoutEffect(() => {
    scale.jump(pxPerCm);
    ratio.jump(aspect);
  }, [pxPerCm, aspect, scale, ratio]);
  const left = useTransform([live.x, scale], ([v, k]: number[]) => v * k);
  const top = useTransform([live.y, scale], ([v, k]: number[]) => v * k);
  const width = useTransform([live.width, scale], ([v, k]: number[]) => v * k);
  const height = useTransform([live.width, scale, ratio], ([v, k, a]: number[]) => v * k * a);

  if (!hasImage || !visible || !url) return null;

  return (
    <div aria-hidden="true" data-testid="background" className={cx("pointer-events-none absolute inset-0 z-photo", !photoMode && "overflow-hidden")}>
      <motion.img
        data-testid="background-photo"
        src={url}
        alt=""
        draggable={false}
        style={{ left, top, width, height, opacity }}
        className="absolute max-w-none select-none"
      />
      {photoMode && (
        // The wall edge (1px ink plus a 1px halo) and the veil over the photo outside the wall.
        <div
          data-testid="photo-veil"
          className="absolute inset-0 shadow-[0_0_0_1px_var(--color-ink),0_0_0_2px_var(--color-halo),0_0_0_100vmax_var(--color-photo-dim)]"
        />
      )}
    </div>
  );
}
