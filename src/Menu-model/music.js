import React, { useState, useRef } from 'react';
import { IonContent, IonPage, IonButton, IonIcon } from '@ionic/react';
import { play as playIcon, pause as pauseIcon, musicalNotes } from 'ionicons/icons';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import Menu from "./Menu";

const ffmpeg = new FFmpeg({ log: true });

const MusicPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [songPath, setSongPath] = useState('');
    const audioRef = useRef(new Audio());

    const handleSongSelection = async (event) => {
        const file = event.target.files[0];
        if (file) {
            // 检查 ffmpeg 是否已加载
            if (!ffmpeg.loaded) {
                await ffmpeg.load();
            }

            // 获取文件的格式
            const fileType = file.type.split('/')[1];

            // 如果文件是 MP3 格式，则跳过转换步骤
            if (fileType === 'mp3') {
                setSongPath(file.url);
            } else {
                // 将文件写入 ffmpeg 文件系统
                ffmpeg.FS('writeFile', file.name, await file.arrayBuffer());

                // 运行 ffmpeg 命令转换音频
                // 例如：转换为 128kbps 的 MP3
                await ffmpeg.run('-i', file.name, '-b:a', '128k', 'output.mp3');

                // 从 ffmpeg 文件系统中读取输出文件
                const data = ffmpeg.FS('readFile', 'output.mp3');

                // 创建 Blob URL
                const audioUrl = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/mp3' }));
                setSongPath(audioUrl);
            }
        }
    };

    const togglePlayPause = () => {
        if (!songPath) return;
        const prevValue = isPlaying;
        setIsPlaying(!prevValue);
        if (!prevValue) {
            audioRef.current.play();
        } else {
            audioRef.current.pause();
        }
    };

    return (
        <IonPage>
            <IonContent className="content-background-menu ion-padding">
                <Menu />
                <IonButton fill="clear" onClick={() => document.getElementById('fileInput').click()}>
                    <IonIcon icon={musicalNotes} />&nbsp;
                    选择歌曲
                </IonButton>
                <input type="file" id="fileInput" accept="audio/*" hidden onChange={handleSongSelection} />
                <IonButton onClick={togglePlayPause}>
                    <IonIcon icon={isPlaying ? pauseIcon : playIcon} />
                    {isPlaying ? '暂停' : '播放'}
                </IonButton>
            </IonContent>
        </IonPage>
    );
};

export default MusicPlayer;
