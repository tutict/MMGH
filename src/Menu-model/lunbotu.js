import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IonContent, IonPage, IonButton, IonImg } from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import '../CSS/menu.css';

const  Lunbotu = () => {
    const [images, setImages] = useState([]);

    const selectImage = async () => {
        try {
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.Uri,
                source: CameraSource.Photos,
                quality: 100
            });

            const newImageUrl = photo.webPath; // 从设备相册中选择的图片的路径

            // 更新 images 状态，添加新的图片 URL
            setImages(oldImages => [...oldImages, newImageUrl]);
        } catch (error) {
            console.error('Error accessing photos', error);
        }
    };

    return (
        <IonPage>
            <IonContent fullscreen>
                <Swiper
                    spaceBetween={50}
                    slidesPerView={1}
                >
                    {images.map((image, index) => (
                        <SwiperSlide key={index}>
                            <IonImg src={image} />
                        </SwiperSlide>
                    ))}
                </Swiper>
                <IonButton onClick={selectImage}>Select Image</IonButton>
            </IonContent>
        </IonPage>
    );
};

export default Lunbotu;
