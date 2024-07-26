import React, {useEffect, useRef, useState} from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { IonContent, IonPage, IonButton, IonImg} from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Scrollbar, Autoplay, Pagination, Navigation } from 'swiper/modules';
import Menu from "./Menu";

import 'swiper/css';
import '../CSS/lunbotu.css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import 'swiper/css/scrollbar';
import fristPhoto from '../assets/20230908134324.jpg';

const Lunbotu = () => {
    const defaultImages = [
       fristPhoto,
    ];
    const [images, setImages] = useState(defaultImages);
    const swiperRef = useRef(null);
    const [currentBackground, setCurrentBackground] = useState(defaultImages);


    useEffect(() => {
        // 检查是否有两张或更多图片
        if (swiperRef.current && images.length >= 1) {
            swiperRef.current.update(); // 更新 Swiper 实例
            swiperRef.current.autoplay.start(); // 启动自动播放
        }

        const updateBackground = () => {
            if(swiperRef.current && images.length > 0) {
                const currentIndex = swiperRef.current.activeIndex;
                const currentImageUrl = images[currentIndex % images.length];
                setCurrentBackground(currentImageUrl);
            }
        };

        if (swiperRef.current && images.length >= 1) {
            swiperRef.current.on('slideChange', updateBackground);
        }

        return () => {
            if (swiperRef.current && images.length >= 1) {
                swiperRef.current.off('slideChange', updateBackground);
            }
        };

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
            <IonContent fullscreen className="background-glass">
                <div className="blur-background" style={{ backgroundImage: `url(${currentBackground})` }} />
                <Menu/>
                <Swiper
                    onSwiper={(swiper) => {
                        swiperRef.current = swiper;
                    }}
                    modules={[ A11y, Navigation, Scrollbar, Autoplay, Pagination, Navigation]}
                    spaceBetween={50}
                    slidesPerView={1}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    speed={200}
                    className="mySwiper swiper-container"
                    style={{ '--swiper-aspect-ratio': '16:9' }}
                >
                    {images.map((image, index) => (
                        <SwiperSlide className="swiper-slide-forme" key={index}>
                            <IonImg src={image} className="swiper-slide-image"/>
                        </SwiperSlide>
                    ))}
                </Swiper>
                    <IonButton className="bottom-button" fill="outline" onClick={selectImage}>
                        Select Image
                    </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default Lunbotu;
