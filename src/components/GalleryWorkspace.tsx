import React, { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { useI18n } from "../i18n";
import { AppButton, AppFileInput, AppTextField } from "./ui";

function GalleryWorkspace({
  galleryFilter,
  galleryItems,
  gallerySearch,
  galleryUploadInputRef,
  galleryViewerId,
  handleDeleteGalleryItem,
  handleGalleryUpload,
  handleToggleFavoriteGalleryItem,
  openGalleryViewer,
  setGalleryFilter,
  setGallerySearch,
  setGalleryViewerId,
}) {
  const { lang, t } = useI18n();
  const viewerCardRef = useRef(null);
  const lastViewerTriggerRef = useRef(null);
  const deferredGallerySearch = useDeferredValue(gallerySearch);

  const filteredGalleryItems = useMemo(() => {
    const needle = deferredGallerySearch.trim().toLowerCase();
    return galleryItems.filter((item) => {
      if (galleryFilter === "favorites" && !item.favorite) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [item.name, item.caption]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [deferredGallerySearch, galleryFilter, galleryItems]);

  const sortedGalleryItems = useMemo(
    () =>
      [...filteredGalleryItems].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [filteredGalleryItems]
  );

  const activeImage = galleryItems.find((item) => item.id === galleryViewerId) || null;
  const viewerBackgroundProps = galleryViewerId && activeImage ? { "aria-hidden": true, inert: true } : {};

  useEffect(() => {
    if (!galleryViewerId || !activeImage) {
      return undefined;
    }

    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastViewerTriggerRef.current = document.activeElement;
    }

    const viewerPanel = viewerCardRef.current;
    const previousOverflow =
      typeof document !== "undefined" ? document.body.style.overflow : "";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setGalleryViewerId("");
        return;
      }

      if (event.key === "Tab" && viewerPanel) {
        trapFocusWithinViewer(event, viewerPanel);
      }
    };

    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
    }

    const focusTimer =
      typeof window !== "undefined"
        ? window.setTimeout(() => focusViewerPanel(viewerPanel), 0)
        : 0;

    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = previousOverflow;
      }
      if (typeof window !== "undefined") {
        window.clearTimeout(focusTimer);
        window.removeEventListener("keydown", handleKeyDown);
      }

      const trigger = lastViewerTriggerRef.current;
      if (trigger?.isConnected) {
        trigger.focus();
      }
      lastViewerTriggerRef.current = null;
    };
  }, [activeImage, galleryViewerId, setGalleryViewerId]);

  return (
    <section className="desk-gallery">
      <div className="gallery-body" {...viewerBackgroundProps}>
        <header className="gallery-toolbar">
          <div className="gallery-toolbar__actions">
            <AppTextField
              className="gallery-toolbar__search"
              value={gallerySearch}
              onChange={(event) => setGallerySearch(event.target.value)}
              placeholder={t("app.gallery.search")}
              size="small"
              fullWidth
            />
            <div className="segmented-filter">
              <AppButton
                className={`segmented-filter__button ${galleryFilter === "all" ? "is-active" : ""}`}
                onClick={() => setGalleryFilter("all")}
              >
                {t("app.gallery.filter.all")}
              </AppButton>
              <AppButton
                className={`segmented-filter__button ${galleryFilter === "favorites" ? "is-active" : ""}`}
                onClick={() => setGalleryFilter("favorites")}
              >
                {t("app.gallery.filter.favorites")}
              </AppButton>
            </div>
            <span className="section-note gallery-toolbar__count">
              {t("app.gallery.imageCount", { count: filteredGalleryItems.length })}
            </span>
            <AppButton
              className="solid-button"
              onClick={() => galleryUploadInputRef.current?.click()}
            >
              {t("app.gallery.import")}
            </AppButton>
          </div>
        </header>

        <div className="gallery-stage">
          {sortedGalleryItems.length > 0 ? (
            <div className="gallery-grid">
              {sortedGalleryItems.map((item) => (
                <figure
                  key={item.id}
                  className={`gallery-tile ${item.favorite ? "is-favorite" : ""}`}
                >
                  <AppButton
                    className="gallery-tile__image"
                    onClick={() => openGalleryViewer(item.id)}
                    aria-haspopup="dialog"
                    aria-expanded={galleryViewerId === item.id}
                    aria-controls="gallery-viewer-dialog"
                  >
                    <img src={item.src} alt={item.name} loading="lazy" />
                  </AppButton>
                  <figcaption className="gallery-tile__meta">
                    <span className="gallery-tile__copy">
                      <strong>{item.name}</strong>
                      <span>{formatGalleryTime(item.createdAt, lang)}</span>
                    </span>
                    <span className="gallery-tile__actions">
                      <AppButton
                        className={`gallery-tile__action ${item.favorite ? "is-active" : ""}`}
                        onClick={() => handleToggleFavoriteGalleryItem(item.id)}
                      >
                        {item.favorite
                          ? t("app.gallery.favorited")
                          : t("app.gallery.favorite")}
                      </AppButton>
                      <AppButton
                        className="gallery-tile__action"
                        onClick={() => handleDeleteGalleryItem(item.id)}
                      >
                        {t("app.gallery.remove")}
                      </AppButton>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="gallery-empty">
              <h3>{t("app.gallery.empty.title")}</h3>
              <p>{t("app.gallery.empty.description")}</p>
            </div>
          )}
        </div>

        <AppFileInput
          ref={galleryUploadInputRef}
          accept="image/*"
          multiple
          onChange={handleGalleryUpload}
        />
      </div>

      {galleryViewerId && activeImage ? (
        <div className="gallery-viewer" role="dialog" aria-modal="true" aria-labelledby="gallery-viewer-title">
          {/* Decorative pointer-only click-catcher: keyboard users dismiss the viewer
              via Escape or the Close button, so it is hidden from assistive tech. */}
          <div className="gallery-viewer__scrim" aria-hidden="true" onClick={() => setGalleryViewerId("")} />
          <div
            id="gallery-viewer-dialog"
            ref={viewerCardRef}
            className="gallery-viewer__card panel-surface"
            tabIndex={-1}
          >
            <header className="gallery-viewer__head">
              <div>
                <h3 id="gallery-viewer-title">{activeImage.name}</h3>
                <span className="section-note">{formatGalleryTime(activeImage.createdAt, lang)}</span>
              </div>
              <AppButton
                className="ghost-button"
                onClick={() => setGalleryViewerId("")}
              >
                {t("app.common.close")}
              </AppButton>
            </header>
            <div className="gallery-viewer__image">
              <img src={activeImage.src} alt={activeImage.name} />
            </div>
            <footer className="gallery-viewer__foot">
              <span className="section-note">
                {activeImage.favorite
                  ? t("app.gallery.favoriteImage")
                  : t("app.gallery.libraryImage")}
              </span>
              <div className="gallery-viewer__actions">
                <AppButton
                  className="ghost-button"
                  onClick={() => handleToggleFavoriteGalleryItem(activeImage.id)}
                >
                  {activeImage.favorite
                    ? t("app.gallery.favorited")
                    : t("app.gallery.favorite")}
                </AppButton>
                <AppButton
                  className="danger-button"
                  onClick={() => {
                    handleDeleteGalleryItem(activeImage.id);
                    setGalleryViewerId("");
                  }}
                >
                  {t("app.gallery.remove")}
                </AppButton>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getViewerFocusableElements(container: ParentNode | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element): element is HTMLElement => {
    if (
      element.hasAttribute("hidden") ||
      element.getAttribute("aria-hidden") === "true" ||
      element.getAttribute("aria-disabled") === "true"
    ) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    return element.getClientRects().length > 0;
  });
}

function focusViewerPanel(panel: HTMLElement | null) {
  if (!panel) {
    return;
  }

  const [firstFocusable] = getViewerFocusableElements(panel);
  const target = firstFocusable || panel;

  if (target instanceof HTMLElement) {
    target.focus();
  }
}

function trapFocusWithinViewer(event: KeyboardEvent, panel: HTMLElement) {
  const focusableElements = getViewerFocusableElements(panel);

  if (!focusableElements.length) {
    event.preventDefault();
    if (panel instanceof HTMLElement) {
      panel.focus();
    }
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey) {
    if (activeElement === firstElement || !panel.contains(activeElement)) {
      event.preventDefault();
      lastElement.focus();
    }
    return;
  }

  if (activeElement === lastElement || !panel.contains(activeElement)) {
    event.preventDefault();
    firstElement.focus();
  }
}

function formatGalleryTime(value, lang) {
  return new Date(value).toLocaleString(lang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default React.memo(GalleryWorkspace);
