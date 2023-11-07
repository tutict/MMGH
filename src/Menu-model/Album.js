import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IonContent, IonGrid, IonRow, IonCol, IonImg, IonButton, IonModal } from '@ionic/react';
import '../CSS/menu.css'
import Menu from "./Menu";
import ParticlesMenu from "./ParticleEffectMenu";

const Album: React.FC = () => {
    const [photos, setPhotos] = useState([]); // 状态不需要类型
    const [photoToView, setPhotoToView] = useState(null);

    const takePhoto = async () => {
        const image = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos,
            quality: 100
        });

        if (image.webPath) {
            setPhotos([image.webPath, ...photos]);
        }
    };

    const viewPhoto = (photo: string) => {
        setPhotoToView(photo);
    };

    return (
        <IonContent >
            <Menu />
            <ParticlesMenu />
            <IonGrid>
                <IonRow>
                    {photos.map((photo, index) => (
                        <IonCol size="2" key={index}>
                            <IonImg src={photo} onClick={() => viewPhoto(photo)} />
                        </IonCol>
                    ))}
                </IonRow>
                <div className="fixed-button-container">
                    <IonButton fill="outline" style={{ width: '100px' }} onClick={takePhoto}>选择图片</IonButton>
                </div>
            </IonGrid>

            <IonModal isOpen={!!photoToView} onDidDismiss={() => setPhotoToView(null)} >
                <IonImg src={photoToView} style={{ width: '100%', height: '100%' }} />
            </IonModal>
        </IonContent>
    );
};

export default Album;
