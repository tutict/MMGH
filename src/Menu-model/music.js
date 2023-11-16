import React, { useState, useRef } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonInput } from '@ionic/react';
import { play as playIcon, pause as pauseIcon, musicalNotes } from 'ionicons/icons';
import { useFilesystem, base64FromPath } from '@capacitor-community/react-hooks/filesystem';

const MusicPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [songPath, setSongPath] = useState('');
    const audioRef = useRef(new Audio());
    const { readFile } = useFilesystem();

    const handleSongSelection = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const base64 = await readFile({ path: file.path });
            const audioUrl = `data:audio/mp3;base64,${base64.data}`;
            audioRef.current.src = audioUrl;
            setSongPath(audioUrl);
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
            <IonHeader>
                <IonToolbar>
                    <IonTitle>音乐播放器</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
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
