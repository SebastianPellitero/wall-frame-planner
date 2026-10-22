import { create } from "zustand";

/**
 * The background photo's image for this tab. The project (localStorage) holds only its
 * placement; the image itself lives in IndexedDB and is read into memory once. When IndexedDB
 * is unavailable this is the only copy, so the photo lasts until the tab closes.
 */
export const usePhotoImage = create<{ blob: Blob | null }>(() => ({ blob: null }));

export const setPhotoBlob = (blob: Blob | null) => usePhotoImage.setState({ blob });
