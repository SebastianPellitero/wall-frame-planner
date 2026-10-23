import { motion } from "motion/react";
import { useState } from "react";
import type { PhotoMotionValues } from "../../hooks/usePhotoMotion";
import { cx } from "../ui/cx";

/** Object URLs already decoded once: a duplicate's copy shows its photo from its first frame, with no fade (§6.3). */
const decoded = new Set<string>();

/**
 * A frame photo `<img>` (§3.8): decorative (`alt=""`), never a drag source, placed in px by the
 * layout motion values. It fades in over `duration-quick` once decoded (none under reduced
 * motion); until then the opening's `bg-aperture` shows.
 */
export function FramePhotoImage({ url, layout, testId }: { url: string; layout: PhotoMotionValues; testId: string }) {
  const [loaded, setLoaded] = useState(() => decoded.has(url));
  return (
    <motion.img
      data-testid={testId}
      src={url}
      alt=""
      draggable={false}
      decoding="async"
      onLoad={() => {
        decoded.add(url);
        setLoaded(true);
      }}
      style={{ left: layout.left, top: layout.top, width: layout.width, height: layout.height }}
      className={cx(
        "pointer-events-none absolute max-w-none select-none transition-opacity duration-quick motion-reduce:transition-none",
        !loaded && "opacity-0",
      )}
    />
  );
}
