import React, { useCallback, useMemo, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonImg,
  IonModal,
  IonPage,
  IonSpinner,
  IonText,
} from "@ionic/react";
import { imagesOutline } from "ionicons/icons";
import "../CSS/menu.css";
import Menu from "./Menu";

const Album = () => {
  const [photos, setPhotos] = useState([]);
  const [photoToView, setPhotoToView] = useState(null);
  const [isPicking, setIsPicking] = useState(false);

  const hasPhotos = photos.length > 0;

  const galleryInstructions = useMemo(
    () =>
      hasPhotos
        ? "点击任何缩略图即可放大预览"
        : "相册暂时为空，挑选一张喜欢的照片开始吧",
    [hasPhotos]
  );

  const selectPhoto = useCallback(async () => {
    setIsPicking(true);
    try {
      const image = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality: 90,
      });

      if (image.webPath) {
        setPhotos((prev) => [image.webPath, ...prev]);
      }
    } catch (error) {
      console.warn("Failed to import photo", error);
    } finally {
      setIsPicking(false);
    }
  }, []);

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <Menu />
        <section className="album-wrapper glass-panel">
          <header className="panel-header">
            <div>
              <p className="panel-eyebrow">回忆相册</p>
              <h1>轻触即可放大浏览</h1>
            </div>
            <IonText className="panel-hint">{galleryInstructions}</IonText>
          </header>

          {hasPhotos ? (
            <div className="album-grid">
              {photos.map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  type="button"
                  className="album-tile"
                  onClick={() => setPhotoToView(photo)}
                  aria-label="预览照片"
                >
                  <IonImg src={photo} alt="相册图片" />
                </button>
              ))}
            </div>
          ) : (
            <div className="album-empty" role="status">
              <IonIcon icon={imagesOutline} size="large" />
              <p>暂无照片</p>
              <span>导入一张喜欢的照片，填满这个空间。</span>
            </div>
          )}
        </section>

        <div className="album-fab">
          <IonButton
            shape="round"
            size="large"
            onClick={selectPhoto}
            disabled={isPicking}
          >
            {isPicking ? (
              <>
                <IonSpinner name="crescent" slot="start" />
                正在导入
              </>
            ) : (
              <>
                <IonIcon icon={imagesOutline} slot="start" />
                选择照片
              </>
            )}
          </IonButton>
        </div>

        <IonModal
          isOpen={!!photoToView}
          onDidDismiss={() => setPhotoToView(null)}
          cssClass="album-modal"
        >
          <div className="album-modal-content">
            <IonImg
              src={photoToView ?? undefined}
              alt="查看大图"
              className="album-modal-image"
            />
            <IonButton onClick={() => setPhotoToView(null)}>关闭</IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Album;
