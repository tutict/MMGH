import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { IonButton, IonContent, IonIcon, IonImg, IonPage, IonText } from "@ionic/react";
import { cameraOutline } from "ionicons/icons";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, A11y, Navigation, Pagination, Scrollbar } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/scrollbar";

import Menu from "./Menu";
import "../CSS/lunbotu.css";
import "../CSS/menu.css";
import firstPhoto from "../assets/20230908134324.jpg";
import { useI18n } from "../i18n";

const Lunbotu = () => {
  const { t } = useI18n();
  const [images, setImages] = useState([firstPhoto]);
  const [currentBackground, setCurrentBackground] = useState(firstPhoto);
  const swiperRef = useRef(null);

  const updateBackground = useCallback(() => {
    if (!swiperRef.current || images.length === 0) {
      return;
    }

    const index = swiperRef.current.realIndex ?? swiperRef.current.activeIndex;
    setCurrentBackground(images[index % images.length]);
  }, [images]);

  useEffect(() => {
    if (swiperRef.current) {
      updateBackground();
      swiperRef.current.autoplay?.start?.();
      swiperRef.current.on("slideChange", updateBackground);
    }

    return () => {
      swiperRef.current?.off?.("slideChange", updateBackground);
    };
  }, [images, updateBackground]);

  const selectImage = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality: 100,
      });

      if (photo?.webPath) {
        setImages((prev) => [...prev, photo.webPath]);
      }
    } catch (error) {
      console.error("Error accessing photos", error);
    }
  };

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding carousel-page">
        <div
          className="carousel-backdrop"
          style={{ backgroundImage: `url(${currentBackground})` }}
        />
        <div className="carousel-blur-layer" />
        <div className="page-shell">
          <Menu />

          <section className="carousel-shell glass-panel magazine-panel">
            <header className="panel-header">
              <div>
                <p className="panel-eyebrow">{t("carousel.eyebrow")}</p>
                <h1>{t("carousel.title")}</h1>
              </div>
              <IonText className="panel-hint">
                {t("carousel.meta", { count: images.length })}
              </IonText>
            </header>

            <Swiper
              modules={[Autoplay, A11y, Navigation, Pagination, Scrollbar]}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              spaceBetween={30}
              slidesPerView={1}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              navigation
              className="carousel-swiper"
            >
              {images.map((image, index) => (
                <SwiperSlide key={`${image}-${index}`} className="carousel-slide">
                  <IonImg
                    className="carousel-image"
                    src={image}
                    alt={t("carousel.slide.alt", { index: index + 1 })}
                  />
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="carousel-actions">
              <IonButton shape="round" onClick={selectImage}>
                <IonIcon icon={cameraOutline} slot="start" />
                {t("carousel.import")}
              </IonButton>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Lunbotu;
