import { useMemo, useRef, useState } from "react";
import { MobileButton, MobilePage } from "../ui";

export default function MobileGalleryView({
  galleryFilter = "all",
  galleryItems = [],
  gallerySearch = "",
  galleryUploadInputRef,
  galleryViewerId = "",
  handleDeleteGalleryItem,
  handleGalleryUpload,
  handleToggleFavoriteGalleryItem,
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
      if (galleryFilter === "favorites" && !item.favorite) return false;
      if (!query) return true;
      return String(item.name || "").toLowerCase().includes(query);
    });
  }, [galleryFilter, galleryItems, gallerySearch]);
  const active = galleryItems.find((item) => item.id === activeId);
  const openViewer = (id: string) => {
    setViewerId(id);
    setGalleryViewerId?.(id);
  };
  return (
    <MobilePage view="gallery">
      <header className="mobile-editor">
        <input aria-label={t?.("app.gallery.search") || "Search"} value={gallerySearch} onChange={(event) => setGallerySearch?.(event.target.value)} />
        <div className="mobile-segmented">
          {["all", "favorites"].map((filter) => (
            <MobileButton key={filter} variant="text" aria-pressed={galleryFilter === filter} onClick={() => setGalleryFilter?.(filter)}>
              {t?.(`app.gallery.filter.${filter}`) || filter}
            </MobileButton>
          ))}
          <MobileButton variant="text" onClick={() => uploadRef.current?.click()}>{t?.("app.gallery.import") || "Upload"}</MobileButton>
        </div>
        <input ref={uploadRef} hidden type="file" accept="image/*" multiple onChange={handleGalleryUpload} />
      </header>
      {active ? (
        <section className="mobile-editor">
          <img src={active.src} alt={active.name} />
          <strong>{active.name}</strong>
          <MobileButton variant="text" onClick={() => openViewer("")}>{t?.("app.common.close") || "Close"}</MobileButton>
          <MobileButton variant="text" onClick={() => handleToggleFavoriteGalleryItem?.(active.id)}>{t?.("app.gallery.favorite") || "Favorite"}</MobileButton>
          <MobileButton variant="text" onClick={() => handleDeleteGalleryItem?.(active.id)}>{t?.("app.gallery.remove") || "Remove"}</MobileButton>
        </section>
      ) : (
        <div className="mobile-gallery-grid">
          {visible.map((item) => (
            <button key={item.id} type="button" onClick={() => openViewer(item.id)}>
              <img src={item.src} alt={item.name} />
            </button>
          ))}
        </div>
      )}
    </MobilePage>
  );
}
