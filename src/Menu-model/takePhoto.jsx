import React, { useState } from "react";
import {
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
  IonText,
} from "@ionic/react";
import { cameraOutline } from "ionicons/icons";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { defineCustomElements } from "@ionic/pwa-elements/loader";

import Menu from "./Menu";
import "../CSS/menu.css";
import { useI18n } from "../i18n";

defineCustomElements(window);

const TakePhoto = () => {
  const { t } = useI18n();
  const [photoPreview, setPhotoPreview] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const convertBlobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Problem reading input file."));
      reader.onload = () => {
        if (typeof reader.result === "string") {
          const base64String = reader.result.split(",")[1];
          if (base64String) {
            resolve(base64String);
          } else {
            reject(new Error("Could not extract base64 string."));
          }
        } else {
          reject(new Error("Reader result is not a string."));
        }
      };
      reader.readAsDataURL(blob);
    });

  const savePhoto = async (photoWebPath) => {
    const response = await fetch(photoWebPath);
    const blob = await response.blob();
    const base64Data = await convertBlobToBase64(blob);

    const fileName = `photo-${Date.now()}.jpeg`;
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    const webviewPath = Capacitor.convertFileSrc(savedFile.uri);
    setPhotoPreview(webviewPath);

    return {
      filepath: fileName,
      webviewPath,
    };
  };

  const takePhoto = async () => {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);
    setErrorMessage("");
    try {
      const cameraPhoto = await Camera.getPhoto({
        quality: 90,
        source: CameraSource.Camera,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      });

      if (cameraPhoto.webPath) {
        await savePhoto(cameraPhoto.webPath);
        setShowModal(true);
      } else {
        setErrorMessage(t("photo.error.noPath"));
      }
    } catch (error) {
      console.error("Error taking photo", error);
      setErrorMessage(t("photo.error.captureFailed"));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <div className="page-shell">
          <Menu />
          <section className="camera-wrapper glass-panel">
            <header className="panel-header">
              <div>
                <p className="panel-eyebrow">{t("photo.eyebrow")}</p>
                <h1>{t("photo.title")}</h1>
              </div>
              <IonButton
                shape="round"
                disabled={isCapturing}
                onClick={takePhoto}
              >
                <IonIcon icon={cameraOutline} slot="start" />
                {isCapturing
                  ? t("photo.button.capturing")
                  : t("photo.button.take")}
              </IonButton>
            </header>
            <p className="panel-hint">{t("photo.hint")}</p>

            {errorMessage && (
              <IonText color="danger">
                <p>{errorMessage}</p>
              </IonText>
            )}

            {photoPreview ? (
              <div className="camera-preview" role="img" aria-label={t("photo.preview.aria")}>
                <img src={photoPreview} alt={t("photo.preview.alt")} />
              </div>
            ) : (
              <div className="camera-placeholder">
                <IonIcon icon={cameraOutline} size="large" />
                <IonText>{t("photo.empty")}</IonText>
              </div>
            )}
          </section>
        </div>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <div className="album-modal-content">
            <img
              src={photoPreview}
              alt={t("photo.modal.alt")}
              className="album-modal-image"
            />
            <IonButton onClick={() => setShowModal(false)}>
              {t("photo.modal.close")}
            </IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default TakePhoto;
