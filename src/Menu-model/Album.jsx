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

import { addOutline, closeOutline, imagesOutline, removeOutline } from "ionicons/icons";
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

  const hasPhotos = photos.length > 0;

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
            return {
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              src: item,
              createdAt: Date.now(),
            };
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

  const galleryInstructions = useMemo(
    () =>
      hasPhotos ? t("album.instructions.hasPhotos") : t("album.instructions.empty"),
    [hasPhotos, t]
  );

  const groupedPhotos = useMemo(() => {
    const buckets = new Map();

    for (const photo of photos) {
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

    return Array.from(buckets.values()).sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
  }, [photos, lang, t]);

  const photoIndexById = useMemo(() => {
    const map = new Map();
    photos.forEach((photo, index) => map.set(photo.id, index));
    return map;
  }, [photos]);

  const selectPhoto = useCallback(async () => {
    setIsPicking(true);
    try {
      const pickImages = Camera.pickImages;
      if (typeof pickImages === "function") {
        const result = await pickImages({ quality: 90 });
        const picked = result?.photos?.map((photo) => photo.webPath).filter(Boolean) ?? [];

        if (picked.length > 0) {
          setPhotos((prev) => [
            ...picked.map((src) => ({
              id:
                globalThis.crypto?.randomUUID?.() ??
                `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              src,
              createdAt: Date.now(),
            })),
            ...prev,
          ]);
        }
        return;
      }

      const image = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality: 90,
      });

      if (image.webPath) {
        setPhotos((prev) => [
          {
            id:
              globalThis.crypto?.randomUUID?.() ??
              `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            src: image.webPath,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.warn("Failed to import photo", error);
    } finally {
      setIsPicking(false);
    }
  }, []);

  const openViewer = useCallback(
    (photoId) => {
      setPhotoToViewId(photoId);
      setViewerIndex(photoIndexById.get(photoId) ?? 0);
    },
    [photoIndexById]
  );

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

  const applyGridCols = useCallback((nextCols) => {
    const width = typeof window !== "undefined" ? window.innerWidth : 430;
    const baseCols = getBaseCols(width);
    const clamped = clamp(nextCols, MIN_COLS, MAX_COLS);
    userOffsetRef.current = clamped - baseCols;
    setGridCols(clamped);
  }, []);

  const handleTouchMove = useCallback((event) => {
    const startDistance = pinchStateRef.current.startDistance;
    if (!startDistance) {
      return;
    }

    const currentDistance = getTouchDistance(event.touches);
    if (!currentDistance) {
      return;
    }

    const ratio = currentDistance / startDistance;
    const nextCols = clamp(Math.round(pinchStateRef.current.startCols / ratio), MIN_COLS, MAX_COLS);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => applyGridCols(nextCols));
  }, [applyGridCols]);

  const handleTouchEnd = useCallback(() => {
    pinchStateRef.current = { startDistance: null, startCols: gridCols };
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [gridCols]);

  const handleWheel = useCallback((event) => {
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault?.();
    const direction = Math.sign(event.deltaY);
    applyGridCols(gridCols + direction);
  }, [applyGridCols, gridCols]);

  const gridStyle = useMemo(() => ({ "--album-cols": gridCols }), [gridCols]);
  const activePhoto = useMemo(() => photos[viewerIndex] ?? null, [photos, viewerIndex]);

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <div className="page-shell">
          <Menu />
          <section className="album-wrapper glass-panel">
            <header className="panel-header">
              <div>
                <p className="panel-eyebrow">{t("album.eyebrow")}</p>
                <h1>{t("album.title")}</h1>
              </div>
              <IonText className="panel-hint">{galleryInstructions}</IonText>
            </header>

            {hasPhotos ? (
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
                    <div className="album-section-header" aria-hidden="true">
                      {group.label}
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
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="album-empty" role="status">
                <IonIcon icon={imagesOutline} size="large" />
                <p>{t("album.empty.title")}</p>
                <span>{t("album.empty.desc")}</span>
              </div>
            )}
          </section>
        </div>

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

        <div className="album-fab">
          <IonButton shape="round" size="large" onClick={selectPhoto} disabled={isPicking}>
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

        <IonModal
          isOpen={!!photoToViewId}
          onDidDismiss={() => setPhotoToViewId(null)}
          cssClass="album-viewer-modal"
        >
          <div className="album-viewer">
            <div className="album-viewer-topbar">
              <IonButton
                fill="clear"
                shape="round"
                onClick={() => setPhotoToViewId(null)}
                aria-label={t("album.viewer.close")}
              >
                <IonIcon icon={closeOutline} />
              </IonButton>
              <IonText className="album-viewer-counter">
                {photos.length > 0 ? `${viewerIndex + 1} / ${photos.length}` : ""}
              </IonText>
            </div>

            <Swiper
              key={`${photoToViewId}-${photos.length}`}
              modules={[Zoom, A11y]}
              zoom={{ maxRatio: 3 }}
              initialSlide={viewerIndex}
              onSlideChange={(swiper) => setViewerIndex(swiper.activeIndex ?? 0)}
              className="album-viewer-swiper"
            >
              {photos.map((photo) => (
                <SwiperSlide key={photo.id} className="album-viewer-slide">
                  <div className="swiper-zoom-container">
                    <img src={photo.src} alt={t("album.viewer.alt")} />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {activePhoto ? (
              <div className="album-viewer-meta" aria-hidden="true">
                {new Date(activePhoto.createdAt).toLocaleString(lang)}
              </div>
            ) : null}
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Album;
