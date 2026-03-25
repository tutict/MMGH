import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Zoom } from "swiper/modules";
import "swiper/css";
import "swiper/css/zoom";

import {
  addOutline,
  calendarClearOutline,
  closeOutline,
  gridOutline,
  imagesOutline,
  removeOutline,
  sparklesOutline,
} from "ionicons/icons";
import "../CSS/menu.css";
import Menu from "./Menu";
import { useI18n } from "../i18n";

const STORAGE_KEY = "mmgh.album.photos.v1";
const MIN_COLS = 3;
const MAX_COLS = 9;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const getBaseCols = (width) =>
  clamp(width >= 1360 ? 8 : width >= 1200 ? 7 : width >= 1024 ? 6 : width >= 860 ? 5 : 4, MIN_COLS, MAX_COLS);

const getTouchDistance = (touches) => {
  if (!touches || touches.length < 2) {
    return null;
  }

  const [t1, t2] = touches;
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
};

const formatDay = (date, locale) =>
  new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);

const formatClock = (value, locale) =>
  new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const formatMoment = (value, locale) =>
  new Date(value).toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function createPhotoRecord(src, createdAt = Date.now()) {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    src,
    createdAt,
  };
}

const Album = () => {
  const { t, lang } = useI18n();
  const [photos, setPhotos] = useState([]);
  const [photoToViewId, setPhotoToViewId] = useState(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isPicking, setIsPicking] = useState(false);
  const [gridCols, setGridCols] = useState(() => {
    const width = typeof window !== "undefined" ? window.innerWidth : 430;
    return getBaseCols(width);
  });

  const userOffsetRef = useRef(0);
  const pinchStateRef = useRef({ startDistance: null, startCols: gridCols });
  const rafRef = useRef(null);
  const viewerSwiperRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return;
      }

      const normalized = parsed
        .map((item) => {
          if (typeof item === "string") {
            return createPhotoRecord(item);
          }

          if (item && typeof item === "object" && typeof item.src === "string") {
            return {
              id:
                item.id ||
                (globalThis.crypto?.randomUUID?.() ??
                  `${Date.now()}-${Math.random().toString(16).slice(2)}`),
              src: item.src,
              createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
            };
          }

          return null;
        })
        .filter(Boolean);

      setPhotos(normalized);
    } catch (error) {
      console.warn("Failed to load album cache", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    } catch (error) {
      console.warn("Failed to persist album cache", error);
    }
  }, [photos]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      const baseCols = getBaseCols(window.innerWidth);
      const nextCols = clamp(baseCols + userOffsetRef.current, MIN_COLS, MAX_COLS);
      setGridCols(nextCols);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const sortedPhotos = useMemo(
    () => [...photos].sort((left, right) => right.createdAt - left.createdAt),
    [photos]
  );

  const hasPhotos = sortedPhotos.length > 0;
  const latestPhoto = sortedPhotos[0] ?? null;

  const galleryInstructions = useMemo(
    () =>
      hasPhotos ? t("album.instructions.hasPhotos") : t("album.instructions.empty"),
    [hasPhotos, t]
  );

  const groupedPhotos = useMemo(() => {
    const buckets = new Map();

    for (const photo of sortedPhotos) {
      const date = new Date(photo.createdAt);
      const dayKey = Number.isNaN(date.getTime())
        ? "unknown"
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
            date.getDate()
          ).padStart(2, "0")}`;

      if (!buckets.has(dayKey)) {
        buckets.set(dayKey, {
          dayKey,
          label: dayKey === "unknown" ? t("album.section.unknown") : formatDay(date, lang),
          items: [],
        });
      }

      buckets.get(dayKey).items.push(photo);
    }

    return Array.from(buckets.values()).sort((left, right) =>
      left.dayKey < right.dayKey ? 1 : -1
    );
  }, [lang, sortedPhotos, t]);

  const photoIndexById = useMemo(() => {
    const map = new Map();
    sortedPhotos.forEach((photo, index) => map.set(photo.id, index));
    return map;
  }, [sortedPhotos]);

  const monthPhotoCount = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return sortedPhotos.filter((photo) => {
      const date = new Date(photo.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
  }, [sortedPhotos]);

  const statCards = useMemo(
    () => [
      {
        id: "total",
        icon: imagesOutline,
        label: t("album.stats.total"),
        value: sortedPhotos.length,
      },
      {
        id: "days",
        icon: calendarClearOutline,
        label: t("album.stats.days"),
        value: groupedPhotos.length,
      },
      {
        id: "month",
        icon: sparklesOutline,
        label: t("album.stats.month"),
        value: monthPhotoCount,
      },
      {
        id: "grid",
        icon: gridOutline,
        label: t("album.stats.grid"),
        value: gridCols,
      },
    ],
    [gridCols, groupedPhotos.length, monthPhotoCount, sortedPhotos.length, t]
  );

  const selectPhoto = useCallback(async () => {
    setIsPicking(true);
    try {
      const pickImages = Camera.pickImages;
      if (typeof pickImages === "function") {
        const result = await pickImages({ quality: 90 });
        const picked = result?.photos?.map((photo) => photo.webPath).filter(Boolean) ?? [];

        if (picked.length > 0) {
          setPhotos((prev) => [...picked.map((src) => createPhotoRecord(src)), ...prev]);
        }
        return;
      }

      const image = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality: 90,
      });

      if (image.webPath) {
        setPhotos((prev) => [createPhotoRecord(image.webPath), ...prev]);
      }
    } catch (error) {
      console.warn("Failed to import photo", error);
    } finally {
      setIsPicking(false);
    }
  }, []);

  const openViewer = useCallback(
    (photoId) => {
      const nextIndex = photoIndexById.get(photoId) ?? 0;
      setPhotoToViewId(photoId);
      setViewerIndex(nextIndex);
      viewerSwiperRef.current?.slideTo(nextIndex, 0);
    },
    [photoIndexById]
  );

  const applyGridCols = useCallback((nextCols) => {
    const width = typeof window !== "undefined" ? window.innerWidth : 430;
    const baseCols = getBaseCols(width);
    const clamped = clamp(nextCols, MIN_COLS, MAX_COLS);
    userOffsetRef.current = clamped - baseCols;
    setGridCols(clamped);
  }, []);

  const handleTouchStart = useCallback(
    (event) => {
      const startDistance = getTouchDistance(event.touches);
      if (startDistance == null) {
        return;
      }
      pinchStateRef.current = { startDistance, startCols: gridCols };
    },
    [gridCols]
  );

  const handleTouchMove = useCallback(
    (event) => {
      const startDistance = pinchStateRef.current.startDistance;
      if (!startDistance) {
        return;
      }

      const currentDistance = getTouchDistance(event.touches);
      if (!currentDistance) {
        return;
      }

      const ratio = currentDistance / startDistance;
      const nextCols = clamp(
        Math.round(pinchStateRef.current.startCols / ratio),
        MIN_COLS,
        MAX_COLS
      );

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => applyGridCols(nextCols));
    },
    [applyGridCols]
  );

  const handleTouchEnd = useCallback(() => {
    pinchStateRef.current = { startDistance: null, startCols: gridCols };
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [gridCols]);

  const handleWheel = useCallback(
    (event) => {
      if (!event.ctrlKey) {
        return;
      }

      event.preventDefault?.();
      const direction = Math.sign(event.deltaY);
      applyGridCols(gridCols + direction);
    },
    [applyGridCols, gridCols]
  );

  const closeViewer = useCallback(() => {
    setPhotoToViewId(null);
  }, []);

  const selectViewerPhoto = useCallback((index) => {
    setViewerIndex(index);
    viewerSwiperRef.current?.slideTo(index);
  }, []);

  const gridStyle = useMemo(() => ({ "--album-cols": gridCols }), [gridCols]);
  const activePhoto = useMemo(
    () => sortedPhotos[viewerIndex] ?? null,
    [sortedPhotos, viewerIndex]
  );

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <div className="page-shell">
          <Menu />
          <section className="album-wrapper album-shell glass-panel">
            <header className="panel-header album-header">
              <div>
                <p className="panel-eyebrow">{t("album.eyebrow")}</p>
                <h1>{t("album.title")}</h1>
              </div>
              <IonText className="panel-hint">{galleryInstructions}</IonText>
            </header>

            {hasPhotos ? (
              <>
                <div className="album-dashboard">
                  <button
                    type="button"
                    className="album-hero-card"
                    onClick={() => openViewer(latestPhoto.id)}
                    aria-label={t("album.tile.view")}
                  >
                    <img src={latestPhoto.src} alt={t("album.tile.alt")} />
                    <div className="album-hero-card__scrim" />
                    <div className="album-hero-card__content">
                      <span className="album-hero-card__badge">{t("album.hero.latest")}</span>
                      <h2>{formatDay(new Date(latestPhoto.createdAt), lang)}</h2>
                      <p>{t("album.hero.description")}</p>
                      <div className="album-hero-card__meta">
                        <span>{formatMoment(latestPhoto.createdAt, lang)}</span>
                        <span>{t("album.tile.view")}</span>
                      </div>
                    </div>
                  </button>

                  <div className="album-side-panel">
                    <div className="album-stats">
                      {statCards.map((card) => (
                        <article key={card.id} className="album-stat-card">
                          <IonIcon icon={card.icon} />
                          <strong>{card.value}</strong>
                          <span>{card.label}</span>
                        </article>
                      ))}
                    </div>

                    <div className="album-command-bar">
                      <div className="album-command-bar__copy">
                        <span className="album-command-bar__eyebrow">{t("album.zoom.aria")}</span>
                        <p>{galleryInstructions}</p>
                      </div>
                      <div className="album-command-bar__actions">
                        <div className="album-zoom-controls" aria-label={t("album.zoom.aria")}>
                          <IonButton
                            fill="clear"
                            shape="round"
                            onClick={() => applyGridCols(gridCols + 1)}
                            aria-label={t("album.zoom.in")}
                          >
                            <IonIcon icon={addOutline} />
                          </IonButton>
                          <IonButton
                            fill="clear"
                            shape="round"
                            onClick={() => applyGridCols(gridCols - 1)}
                            aria-label={t("album.zoom.out")}
                          >
                            <IonIcon icon={removeOutline} />
                          </IonButton>
                        </div>

                        <IonButton
                          className="album-import-button"
                          shape="round"
                          onClick={selectPhoto}
                          disabled={isPicking}
                        >
                          {isPicking ? (
                            <>
                              <IonSpinner name="crescent" slot="start" />
                              {t("album.importing")}
                            </>
                          ) : (
                            <>
                              <IonIcon icon={imagesOutline} slot="start" />
                              {t("album.import")}
                            </>
                          )}
                        </IonButton>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="album-library"
                  style={gridStyle}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                >
                  {groupedPhotos.map((group) => (
                    <section key={group.dayKey} className="album-section">
                      <div className="album-section-header">
                        <div>
                          <h3>{group.label}</h3>
                          <span>{t("album.section.count", { count: group.items.length })}</span>
                        </div>
                      </div>
                      <div className="album-grid">
                        {group.items.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            className="album-tile"
                            onClick={() => openViewer(photo.id)}
                            aria-label={t("album.tile.view")}
                          >
                            <img src={photo.src} alt={t("album.tile.alt")} loading="lazy" />
                            <span className="album-tile__time">
                              {formatClock(photo.createdAt, lang)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <div className="album-empty" role="status">
                <IonIcon icon={imagesOutline} size="large" />
                <p>{t("album.empty.title")}</p>
                <span>{t("album.empty.desc")}</span>
                <IonButton
                  className="album-import-button"
                  shape="round"
                  onClick={selectPhoto}
                  disabled={isPicking}
                >
                  {isPicking ? (
                    <>
                      <IonSpinner name="crescent" slot="start" />
                      {t("album.importing")}
                    </>
                  ) : (
                    <>
                      <IonIcon icon={imagesOutline} slot="start" />
                      {t("album.import")}
                    </>
                  )}
                </IonButton>
              </div>
            )}
          </section>
        </div>

        <IonModal
          isOpen={!!photoToViewId}
          onDidDismiss={closeViewer}
          cssClass="album-viewer-modal"
        >
          <div className="album-viewer">
            <div className="album-viewer-topbar">
              <div className="album-viewer-topbar__meta">
                <span className="album-viewer-counter">
                  {sortedPhotos.length > 0 ? `${viewerIndex + 1} / ${sortedPhotos.length}` : ""}
                </span>
                <span className="album-viewer-hint">{t("album.viewer.hint")}</span>
              </div>
              <IonButton
                fill="clear"
                shape="round"
                onClick={closeViewer}
                aria-label={t("album.viewer.close")}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
            </div>

            <Swiper
              key={`${photoToViewId}-${sortedPhotos.length}`}
              modules={[Zoom, A11y]}
              zoom={{ maxRatio: 3 }}
              initialSlide={viewerIndex}
              onSwiper={(swiper) => {
                viewerSwiperRef.current = swiper;
              }}
              onSlideChange={(swiper) => setViewerIndex(swiper.activeIndex ?? 0)}
              className="album-viewer-swiper"
            >
              {sortedPhotos.map((photo) => (
                <SwiperSlide key={photo.id} className="album-viewer-slide">
                  <div className="swiper-zoom-container">
                    <img src={photo.src} alt={t("album.viewer.alt")} />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {activePhoto ? (
              <div className="album-viewer-bottom">
                <div className="album-viewer-meta">
                  <strong>{formatMoment(activePhoto.createdAt, lang)}</strong>
                  <span>{t("album.viewer.timeline")}</span>
                </div>
                <div
                  className="album-viewer-filmstrip"
                  aria-label={t("album.viewer.timeline")}
                >
                  {sortedPhotos.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      className={`album-viewer-thumb ${
                        index === viewerIndex ? "is-active" : ""
                      }`}
                      onClick={() => selectViewerPhoto(index)}
                    >
                      <img src={photo.src} alt={t("album.tile.alt")} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Album;
