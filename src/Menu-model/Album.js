import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IonContent, IonGrid, IonRow, IonCol, IonImg, IonButton, IonModal, IonPage } from '@ionic/react';
import '../CSS/menu.css';
import Menu from "./Menu";

const Album = () => {
    const [photos, setPhotos] = useState([]);
    const [photoToView, setPhotoToView] = useState(null);

    const selectPhoto = async () => {
        const image = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos,
            quality: 100
        });

        if (image.webPath) {
            setPhotos([image.webPath, ...photos]);
        }
    };

    const viewPhoto = (photo) => {
        setPhotoToView(photo);
    };

    return (
        <IonContent class="content-background-menu">
            <Menu />
                <IonGrid>
                    <IonRow>
                        {photos.map((photo, index) => (
                            <IonCol size="2" key={index}>
                                <IonImg src={photo} onClick={() => viewPhoto(photo)} />
                            </IonCol>
                        ))}
                    </IonRow>
                </IonGrid>
                <div className="fixed-button-container">
                    <IonButton fill="outline" style={{ width: '100px' }} onClick={ selectPhoto }>选择图片</IonButton>
                </div>
            <IonModal isOpen={!!photoToView} onDidDismiss={() => setPhotoToView(null)} >
                <IonImg src={photoToView} style={{ width: '100%', height: '100%' }} />
            </IonModal>
        </IonContent>
    );
};

export default Album;
