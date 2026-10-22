import { useCallback, useEffect, useSyncExternalStore } from "react";
import { framePhotoUrls, IDLE_FRAME_PHOTO, type FramePhotoUrls, type FramePhotoView } from "../state/framePhotoUrls";

/**
 * A frame photo's object URL and load state, held while the calling frame is mounted: frames
 * sharing an image share one URL, revoked after the last one unmounts.
 */
export function useFramePhotoUrl(imageId: string | undefined, cache: FramePhotoUrls = framePhotoUrls): FramePhotoView {
  useEffect(() => {
    if (!imageId) return;
    cache.acquire(imageId);
    return () => cache.release(imageId);
  }, [imageId, cache]);

  const read = useCallback(() => (imageId ? cache.snapshot(imageId) : IDLE_FRAME_PHOTO), [imageId, cache]);
  return useSyncExternalStore(cache.subscribe, read, read);
}
