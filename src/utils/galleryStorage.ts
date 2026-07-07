import { updateStoredValue } from "./localStorageCache";

export const GALLERY_STORAGE_KEY = "mmgh-gallery-v1";
export const LEGACY_ALBUM_STORAGE_KEY = "mmgh.album.photos.v1";

export function parseGalleryItemsRaw(raw) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.src === "string"
    );
  } catch (error) {
    console.error("Failed to parse gallery cache", error);
    return [];
  }
}

export function readGalleryItems() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return parseGalleryItemsRaw(window.localStorage.getItem(GALLERY_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read gallery cache", error);
    return [];
  }
}

export function updateStoredGalleryItems(updater) {
  return updateStoredValue({
    key: GALLERY_STORAGE_KEY,
    parseRaw: parseGalleryItemsRaw,
    serialize: (items) => JSON.stringify(Array.isArray(items) ? items : []),
    updater,
    cacheLabel: "gallery cache",
  });
}
