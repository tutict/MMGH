import { useCallback, useRef, useState } from "react";
import { fileToDataUrl, normalizeError } from "../utils/appUtils";
import {
  GALLERY_STORAGE_KEY,
  LEGACY_ALBUM_STORAGE_KEY,
  readGalleryItems,
  updateStoredGalleryItems,
} from "../utils/galleryStorage";
import { removeLocalStorageKeys } from "../utils/localStorageCache";

export function useGalleryController({ setError, t }) {
  const [galleryItems, setGalleryItems] = useState(() => readGalleryItems());
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [galleryViewerId, setGalleryViewerId] = useState("");
  const galleryUploadInputRef = useRef(null);

  const updateGalleryItems = useCallback((updater) => {
    try {
      const nextItems = updateStoredGalleryItems(updater);
      setGalleryItems(nextItems);
      return { ok: true, value: nextItems };
    } catch (err) {
      setError(t("app.settings.cache.writeFailed", { detail: normalizeError(err) }));
      return { ok: false, value: null };
    }
  }, [setError, t]);

  const syncGalleryCacheFromStorage = useCallback(() => {
    const nextItems = readGalleryItems();
    setGalleryItems(nextItems);
    setGalleryViewerId((prev) => (nextItems.some((item) => item.id === prev) ? prev : ""));
  }, []);

  const handleGalleryUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) {
      return;
    }
    setError("");
    try {
      const items = await Promise.all(
        files.map(async (file) => ({
          id: `gallery-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          caption: "",
          favorite: false,
          createdAt: Date.now(),
          src: await fileToDataUrl(file),
        }))
      );
      const galleryUpdate = updateGalleryItems((prev) => [...items, ...prev]);
      if (!galleryUpdate.ok) {
        return;
      }
      setGalleryViewerId(items[0]?.id || "");
    } catch (error) {
      setError(normalizeError(error));
    } finally {
      event.target.value = "";
    }
  }, [setError, updateGalleryItems]);

  const handleToggleFavoriteGalleryItem = useCallback((itemId) => {
    updateGalleryItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, favorite: !item.favorite } : item))
    );
  }, [updateGalleryItems]);

  const handleDeleteGalleryItem = useCallback((itemId) => {
    if (typeof window !== "undefined" && !window.confirm(t("app.gallery.deleteConfirm"))) {
      return;
    }
    const galleryUpdate = updateGalleryItems((prev) => prev.filter((item) => item.id !== itemId));
    if (!galleryUpdate.ok) {
      return;
    }
    setGalleryViewerId((prev) => (prev === itemId ? "" : prev));
  }, [t, updateGalleryItems]);

  const handleClearMediaCache = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm(t("app.settings.cache.confirm.media"))) {
      return;
    }
    setError("");
    try {
      removeLocalStorageKeys([GALLERY_STORAGE_KEY, LEGACY_ALBUM_STORAGE_KEY]);
      setGalleryItems([]);
      setGallerySearch("");
      setGalleryFilter("all");
      setGalleryViewerId("");
    } catch (err) {
      setError(t("app.settings.cache.clearFailed", { detail: normalizeError(err) }));
    }
  }, [setError, t]);

  return {
    galleryFilter,
    galleryItems,
    gallerySearch,
    galleryUploadInputRef,
    galleryViewerId,
    handleClearMediaCache,
    handleDeleteGalleryItem,
    handleGalleryUpload,
    handleToggleFavoriteGalleryItem,
    setGalleryFilter,
    setGalleryItems,
    setGallerySearch,
    setGalleryViewerId,
    syncGalleryCacheFromStorage,
  };
}
