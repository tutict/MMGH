import React, { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { useI18n } from "../i18n";

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
  const galleryDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(lang, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [lang]
  );

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
  const favoriteCount = useMemo(
    () => filteredGalleryItems.filter((item) => item.favorite).length,
    [filteredGalleryItems]
  );

  const groupedGalleryItems = useMemo(() => {
    const groups = new Map();
    filteredGalleryItems.forEach((item) => {
      const key = new Date(item.createdAt).toDateString();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: galleryDateFormatter.format(new Date(items[0].createdAt)),
      items,
    }));
  }, [filteredGalleryItems, galleryDateFormatter]);

  const latestImage = filteredGalleryItems[0] || galleryItems[0] || null;
  const activeImage = galleryItems.find((item) => item.id === galleryViewerId) || null;
  const viewerBackgroundProps = galleryViewerId && activeImage ? { "aria-hidden": "true", inert: "" } : {};

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
    <section className="gallery-panel panel-surface">
      <div {...viewerBackgroundProps}>
        <div className="gallery-toolbar">
          <div className="section-head gallery-toolbar__head">
            <div>
              <span className="eyebrow">{t("app.gallery.eyebrow")}</span>
              <h3>{t("app.gallery.title")}</h3>
            </div>
            <span className="section-note">
              {t("app.gallery.imageCount", { count: filteredGalleryItems.length })} /{" "}
              {t(`app.gallery.filter.${galleryFilter}`)}
            </span>
          </div>

          <div className="gallery-toolbar__summary">
            <span className="gallery-toolbar__pill">{t(`app.gallery.filter.${galleryFilter}`)}</span>
            <span className="gallery-toolbar__pill">
              {t("app.gallery.filter.favorites")} {favoriteCount}
            </span>
            {latestImage ? (
              <span className="gallery-toolbar__pill">
                {formatGalleryTime(latestImage.createdAt, lang)}
              </span>
            ) : null}
          </div>

          <div className="gallery-toolbar__actions">
            <input
              className="field-input"
              value={gallerySearch}
              onChange={(event) => setGallerySearch(event.target.value)}
              placeholder={t("app.gallery.search")}
            />
            <div className="segmented-filter">
              <button
                type="button"
                className={`segmented-filter__button ${
                  galleryFilter === "all" ? "is-active" : ""
                }`}
                onClick={() => setGalleryFilter("all")}
              >
                {t("app.gallery.filter.all")}
              </button>
              <button
                type="button"
                className={`segmented-filter__button ${
                  galleryFilter === "favorites" ? "is-active" : ""
                }`}
                onClick={() => setGalleryFilter("favorites")}
              >
                {t("app.gallery.filter.favorites")}
              </button>
            </div>
            <button
              type="button"
              className="solid-button"
              onClick={() => galleryUploadInputRef.current?.click()}
            >
              {t("app.gallery.import")}
            </button>
          </div>
        </div>

        <div className="gallery-stage">
          {groupedGalleryItems.length > 0 ? (
            groupedGalleryItems.map((group) => (
              <section key={group.key} className="gallery-group">
                <div className="gallery-group__head">
                  <div className="gallery-group__intro">
                    <span className="eyebrow">{group.label}</span>
                    <strong>{group.items[0]?.name}</strong>
                  </div>
                  <span className="section-note">
                    {t("app.gallery.shotCount", { count: group.items.length })}
                  </span>
                </div>
                <div className="gallery-grid">
                  {group.items.map((item) => (
                    <article
                      key={item.id}
                      className={`gallery-card ${item.favorite ? "is-favorite" : ""}`}
                    >
                      <button
                        type="button"
                        className="gallery-card__image"
                        onClick={() => openGalleryViewer(item.id)}
                        aria-haspopup="dialog"
                        aria-expanded={galleryViewerId === item.id}
                        aria-controls="gallery-viewer-dialog"
                      >
                        <img src={item.src} alt={item.name} />
                        <span className="gallery-card__badge">
                          {item.favorite
                            ? t("app.gallery.favoriteImage")
                            : t("app.gallery.libraryImage")}
                        </span>
                      </button>
                      <div className="gallery-card__meta">
                        <div className="gallery-card__copy">
                          <strong>{item.name}</strong>
                          <p>{item.caption || formatGalleryTime(item.createdAt, lang)}</p>
                        </div>
                        <div className="gallery-card__actions">
                          <button
                            type="button"
                            className={`chip-button ${item.favorite ? "is-active" : ""}`}
                            onClick={() => handleToggleFavoriteGalleryItem(item.id)}
                          >
                            {item.favorite
                              ? t("app.gallery.favorited")
                              : t("app.gallery.favorite")}
                          </button>
                          <button
                            type="button"
                            className="chip-button danger"
                            onClick={() => handleDeleteGalleryItem(item.id)}
                          >
                            {t("app.gallery.remove")}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="gallery-empty">
              <span className="eyebrow">{t("app.gallery.empty.eyebrow")}</span>
              <h3>{t("app.gallery.empty.title")}</h3>
              <p>{t("app.gallery.empty.description")}</p>
            </div>
          )}
        </div>

        <input
          ref={galleryUploadInputRef}
          className="upload-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryUpload}
        />
      </div>

      {galleryViewerId && activeImage ? (
        <div className="gallery-viewer" role="dialog" aria-modal="true" aria-labelledby="gallery-viewer-title">
          <div className="gallery-viewer__scrim" onClick={() => setGalleryViewerId("")} />
          <div
            id="gallery-viewer-dialog"
            ref={viewerCardRef}
            className="gallery-viewer__card panel-surface"
            tabIndex={-1}
          >
            <div className="gallery-viewer__head">
              <div>
                <span className="eyebrow">{t("app.gallery.preview")}</span>
                <h3 id="gallery-viewer-title">{activeImage.name}</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setGalleryViewerId("")}
              >
                {t("app.common.close")}
              </button>
            </div>
            <div className="gallery-viewer__image">
              <img src={activeImage.src} alt={activeImage.name} />
            </div>
            <div className="gallery-viewer__foot">
              <div className="gallery-viewer__detail">
                <span>{formatGalleryTime(activeImage.createdAt, lang)}</span>
                <strong>
                  {activeImage.favorite
                    ? t("app.gallery.favoriteImage")
                    : t("app.gallery.libraryImage")}
                </strong>
              </div>
              <div className="gallery-card__actions gallery-viewer__actions">
                <button
                  type="button"
                  className={`chip-button ${activeImage.favorite ? "is-active" : ""}`}
                  onClick={() => handleToggleFavoriteGalleryItem(activeImage.id)}
                >
                  {activeImage.favorite
                    ? t("app.gallery.favorited")
                    : t("app.gallery.favorite")}
                </button>
                <button
                  type="button"
                  className="chip-button danger"
                  onClick={() => {
                    handleDeleteGalleryItem(activeImage.id);
                    setGalleryViewerId("");
                  }}
                >
                  {t("app.gallery.remove")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getViewerFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => {
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

function focusViewerPanel(panel) {
  if (!panel) {
    return;
  }

  const [firstFocusable] = getViewerFocusableElements(panel);
  const target = firstFocusable || panel;

  if (target instanceof HTMLElement) {
    target.focus();
  }
}

function trapFocusWithinViewer(event, panel) {
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
