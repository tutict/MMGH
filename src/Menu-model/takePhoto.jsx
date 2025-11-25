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

defineCustomElements(window);

const TakePhoto = () => {
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

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

  const savePhoto = async (photoBlob) => {
    const base64Data = await convertBlobToBase64(photoBlob);
    setPhotoBase64(base64Data);

    const fileName = `${Date.now()}.jpeg`;
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
    setIsCapturing(true);
    try {
      const cameraPhoto = await Camera.getPhoto({
        quality: 90,
        source: CameraSource.Camera,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      });

      if (cameraPhoto.webPath) {
        const response = await fetch(cameraPhoto.webPath);
        const blob = await response.blob();
        const savedImageFile = await savePhoto(blob);
        setPhotoPreview(savedImageFile.webviewPath);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error taking photo", error);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <Menu />
        <section className="camera-wrapper glass-panel">
          <header className="panel-header">
            <div>
              <p className="panel-eyebrow">即刻留影</p>
              <h1>捕捉此刻的光影</h1>
            </div>
            <IonButton
              shape="round"
              disabled={isCapturing}
              onClick={takePhoto}
            >
              <IonIcon icon={cameraOutline} slot="start" />
              {isCapturing ? "拍摄中..." : "拍照"}
            </IonButton>
          </header>
          <p className="panel-hint">
            已保存的照片会出现在下方，方便再次查看。
          </p>

          {photoPreview ? (
            <div className="camera-preview" role="img" aria-label="最新照片">
              <img src={photoPreview} alt="最新拍摄" />
            </div>
          ) : (
            <div className="camera-placeholder">
              <IonIcon icon={cameraOutline} size="large" />
              <IonText>目前还没有照片，点击上方按钮试试。</IonText>
            </div>
          )}
        </section>

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <div className="album-modal-content">
            <img
              src={`data:image/jpeg;base64,${photoBase64}`}
              alt="Captured photo"
              className="album-modal-image"
            />
            <IonButton onClick={() => setShowModal(false)}>关闭</IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default TakePhoto;
