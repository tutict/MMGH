import React, { useState } from 'react';
import Menu from "./Menu";
import '../CSS/menu.css';
import {
    IonButton, IonContent, IonGrid,
    IonModal,  IonText,
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from "@capacitor/core";
import { defineCustomElements } from '@ionic/pwa-elements/loader';

defineCustomElements(window);

const TakePhoto: React.FC = () => {
    const [photo, setPhoto] = useState('');
    const [photoBase64, setPhotoBase64] = useState(''); // 新状态变量
    const [showModal, setShowModal] = useState(false);

    // Convert the image blob to a base64 data url
    const convertBlobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Problem reading input file.'));
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const base64String = reader.result.split(',')[1];
                if (base64String) {
                    resolve(base64String);
                } else {
                    reject(new Error('Could not extract base64 string.'));
                }
            } else {
                reject(new Error('Reader result is not a string.'));
            }
        };
        reader.readAsDataURL(blob);
    });

    const savePhoto = async (photoBlob) => {
        try {
            // 将照片Blob对象转换为base64格式的字符串
            const base64Data = await convertBlobToBase64(photoBlob);
            setPhotoBase64(base64Data); // 设置 Base64 编码的图片数据

            // 生成文件名，使用时间戳确保唯一性
            const fileName = new Date().getTime() + '.jpeg';

            // 将base64的照片数据写入到文件系统
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Data,
            });

            // 获取保存后的文件URI
            const fileUri = savedFile.uri;

            // 使用Capacitor的API转换本地文件URI为WebView可以访问的URL
            const webviewPath = Capacitor.convertFileSrc(fileUri);

            // 设置照片的状态为Webview路径
            setPhoto(webviewPath);

            return {
                filepath: fileName, // 原始文件路径
                webviewPath: webviewPath, // WebView可访问的URL
            };
        } catch (error) {
            console.error('保存照片时出错', error);
            throw error; // 重新抛出错误，以便在调用函数中进行处理
        }
    };


    const takePhoto = async () => {
        try {
            const cameraPhoto = await Camera.getPhoto({
                quality: 100,
                source: CameraSource.Camera,
                allowEditing: false,
                resultType: CameraResultType.Uri
            });

            if (cameraPhoto.webPath) {
                // 从webPath获取Blob
                const response = await fetch(cameraPhoto.webPath);
                const blob = await response.blob();
                // 保存照片并设置状态
                const savedImageFile = await savePhoto(blob);
                setPhoto(savedImageFile.webviewPath);
                setShowModal(true);
            }
        } catch (error) {
            console.error("Error taking photo", error);
        }
    };

    return (
        <IonContent class="content-background-menu">
            <Menu />
            <IonGrid class="glass-effect-menu middle">
                    <IonButton expand="full" onClick={takePhoto}>Take Photo</IonButton>
                    <IonText>拍个照吧🐶</IonText>
                <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
                    {/* 使用状态变量来渲染图片 */}
                    <img src={`data:image/jpeg;base64,${photoBase64}`} alt="Captured photo" />
                    <IonButton onClick={() => setShowModal(false)}>Close</IonButton>
                </IonModal>
            </IonGrid>
        </IonContent>
    );
};

export default TakePhoto;
