import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IonContent, IonPage, IonButton, IonImg, IonButtons } from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const Lunbotu = () => {
    const [images, setImages] = useState([]);
    const swiperRef = useRef(null);

    useEffect(() => {
        if (swiperRef.current && images.length) {
            swiperRef.current.update(); // Updating Swiper instance
            swiperRef.current.autoplay.start(); // Starting autoplay
        }
    }, [images]);

    const selectImage = async () => {
        try {
            const photo = await Camera.getPhoto({
                resultType: CameraResultType.Uri,
                source: CameraSource.Photos,
                quality: 100
            });

            const newImageUrl = photo.webPath;
            setImages(oldImages => [...oldImages, newImageUrl]);
        } catch (error) {
            console.error('Error accessing photos', error);
        }
    };

    return (
        <IonPage>
            <IonContent fullscreen>
                <Swiper
                    ref={swiperRef}
                    modules={[Autoplay, Pagination, Navigation]}
                    spaceBetween={50}
                    slidesPerView={1}
                    autoplay={{ delay: 2000, disableOnInteraction: false }}
                    loop
                    pagination={{ clickable: true }}
                    className="mySwiper"
                >
                    {images.map((image, index) => (
                        <SwiperSlide key={index}>
                            <IonImg src={image} />
                        </SwiperSlide>
                    ))}
                </Swiper>
                <IonButtons>
                    <IonButton className="bottom-button" fill="outline" onClick={selectImage}>
                        Select Image
                    </IonButton>
                </IonButtons>
            </IonContent>
        </IonPage>
    );
};

export default Lunbotu;
