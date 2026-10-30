import AddPhotoAlternateRoundedIcon from "@mui/icons-material/AddPhotoAlternateRounded";
import { useMemo, useRef, useState } from "react";
import { AppIconButton, MobileButton, MobilePage, MobileTextField } from "../ui";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

export default function MobileGalleryView({
  galleryFilter = "all",
  galleryItems = [],
  gallerySearch = "",
  galleryUploadInputRef,
  galleryViewerId = "",
  handleDeleteGalleryItem,
  handleGalleryUpload,
  handleToggleFavoriteGalleryItem,
  lang,
  setGalleryFilter,
  setGallerySearch,
  setGalleryViewerId,
  t,
}: Record<string, any>) {
  const localUploadRef = useRef<HTMLInputElement>(null);
  const uploadRef = galleryUploadInputRef || localUploadRef;
  const [viewerId, setViewerId] = useState(galleryViewerId);
  const activeId = galleryViewerId || viewerId;
  const visible = useMemo(() => {
    const query = String(gallerySearch || "").trim().toLowerCase();
    return galleryItems.filter((item) => {
      if (galleryFilter === "favorites" && !item.favorite) {
        return false;
      }
      if (!query) {
        return true;
      }
      return String(item.name || "").toLowerCase().includes(query);
    });
  }, [galleryFilter, galleryItems, gallerySearch]);
  const activeIndex = visible.findIndex((item) => item.id === activeId);
  const active = activeIndex >= 0 ? visible[activeIndex] : null;

  const openViewer = (id: string) => {
    setViewerId(id);
    setGalleryViewerId?.(id);
  };

  const stepViewer = (direction: number) => {
    if (visible.length === 0) {
      return;
    }
    const nextIndex = (Math.max(activeIndex, 0) + direction + visible.length) % visible.length;
    openViewer(visible[nextIndex].id);
  };

  const closeViewer = () => openViewer("");

  return (
    <MobilePage view="gallery">
      <div className="mobile-gallery-toolbar">
        <MobileTextField
          value={gallerySearch}
          onChange={(event) => setGallerySearch?.(event.target.value)}
          placeholder={t?.("app.gallery.search") || "Search images"}
          aria-label={t?.("app.gallery.search") || "Search images"}
          size="small"
          fullWidth
        />
        <AppIconButton
          className="mobile-gallery-upload"
          onClick={() => uploadRef.current?.click()}
          aria-label={t?.("app.gallery.import") || "Import images"}
        >
          <AddPhotoAlternateRoundedIcon fontSize="small" aria-hidden="true" />
        </AppIconButton>
        <input ref={uploadRef} hidden type="file" accept="image/*" multiple onChange={handleGalleryUpload} />
      </div>

      <div className="mobile-segmented" role="group" aria-label={t?.("app.gallery.title") || "Gallery"}>
        {["all", "favorites"].map((filter) => (
          <MobileButton
            key={filter}
            variant="text"
            className={galleryFilter === filter ? "is-active" : ""}
            aria-pressed={galleryFilter === filter}
            onClick={() => setGalleryFilter?.(filter)}
          >
            {t?.(`app.gallery.filter.${filter}`) || filter}
          </MobileButton>
        ))}
      </div>

      {galleryItems.length === 0 ? (
        <section className="mobile-empty-hero">
          <strong>{t?.("app.gallery.empty.title") || "No images yet"}</strong>
          <p>{t?.("app.gallery.empty.description")}</p>
          <MobileButton variant="contained" mobileAction="primary" onClick={() => uploadRef.current?.click()}>
            {t?.("app.gallery.import") || "Import images"}
          </MobileButton>
        </section>
      ) : visible.length === 0 ? (
        <p className="mobile-empty">{mobileText(lang, "emptyGallerySearch")}</p>
      ) : (
        <div className="mobile-gallery-grid">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              className="mobile-gallery-tile"
              onClick={() => openViewer(item.id)}
            >
              <img src={item.src} alt={item.name} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <MobileSheet
        id="mobile-gallery-viewer"
        open={Boolean(active)}
        onClose={closeViewer}
        closeLabel={mobileText(lang, "close")}
        title={active?.name || ""}
        variant="full"
        actions={
          <>
            <MobileButton
              variant="text"
              mobileAction="secondary"
              onClick={() => stepViewer(-1)}
              disabled={visible.length < 2}
            >
              {mobileText(lang, "previous")}
            </MobileButton>
            <MobileButton
              variant="text"
              mobileAction="secondary"
              onClick={() => stepViewer(1)}
              disabled={visible.length < 2}
            >
              {mobileText(lang, "next")}
            </MobileButton>
          </>
        }
      >
        {active ? (
          <div className="mobile-gallery-viewer">
            <img src={active.src} alt={active.name} />
            <div className="mobile-gallery-viewer__actions">
              <MobileButton
                variant="outlined"
                mobileAction="secondary"
                onClick={() => handleToggleFavoriteGalleryItem?.(active.id)}
              >
                {active.favorite
                  ? t?.("app.gallery.favorited") || "Favorited"
                  : t?.("app.gallery.favorite") || "Favorite"}
              </MobileButton>
              <MobileButton
                variant="outlined"
                color="error"
                mobileAction="danger"
                onClick={() => {
                  handleDeleteGalleryItem?.(active.id);
                  closeViewer();
                }}
              >
                {t?.("app.gallery.remove") || "Remove"}
              </MobileButton>
            </div>
          </div>
        ) : null}
      </MobileSheet>
    </MobilePage>
  );
}
