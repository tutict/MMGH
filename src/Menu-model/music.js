import React, { useState, useRef } from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon
} from '@ionic/react';
import { playCircle, pauseCircle } from 'ionicons/icons';

const MusicPlayer: React.FC = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const tracks = [
        'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3',
        'https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_1MG.mp3',
        // ... add more tracks
    ];

    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

    const playPauseHandler = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const nextTrackHandler = () => {
        setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % tracks.length);
    };

    const prevTrackHandler = () => {
        setCurrentTrackIndex(
            (prevIndex) => (prevIndex - 1 + tracks.length) % tracks.length
        );
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Music Player</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <audio ref={audioRef} src={tracks[currentTrackIndex]} />
                <IonButton onClick={prevTrackHandler}>Previous</IonButton>
                <IonButton onClick={playPauseHandler}>
                    <IonIcon icon={isPlaying ? pauseCircle : playCircle} />
                </IonButton>
                <IonButton onClick={nextTrackHandler}>Next</IonButton>
            </IonContent>
        </IonPage>
    );
};

export default MusicPlayer;
