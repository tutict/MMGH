import React, { useMemo } from "react";
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
    const needle = gallerySearch.trim().toLowerCase();
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
  }, [galleryFilter, galleryItems, gallerySearch]);
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
  }, [filteredGalleryItems]);

  const latestImage = filteredGalleryItems[0] || galleryItems[0] || null;
  const activeImage =
    galleryItems.find((item) => item.id === galleryViewerId) || filteredGalleryItems[0] || null;

  return (
    <section className="gallery-panel panel-surface">
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

      {galleryViewerId && activeImage ? (
        <div className="gallery-viewer" role="dialog" aria-modal="true">
          <div className="gallery-viewer__scrim" onClick={() => setGalleryViewerId("")} />
          <div className="gallery-viewer__card panel-surface">
            <div className="gallery-viewer__head">
              <div>
                <span className="eyebrow">{t("app.gallery.preview")}</span>
                <h3>{activeImage.name}</h3>
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
                  onClick={() => handleDeleteGalleryItem(activeImage.id)}
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

function formatGalleryTime(value, lang) {
  return new Date(value).toLocaleString(lang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default GalleryWorkspace;
