import React, { useState } from 'react';
import {IonContent, IonPage, IonButton, IonIcon, IonLabel, IonAvatar, IonItem, IonList} from '@ionic/react';
import {musicalNotes, trashBin} from 'ionicons/icons';
import Menu from "./Menu";
import { APlayer } from "aplayer-react";
import "../CSS/menu.css"
import AudioVisualizer from "./AudioVisualizer";

const MusicPlayer = () => {
    const [audioUrl, setAudioUrl] = useState(''); // 新增状态
    const [songName, setSongName] = useState(''); // 新增状态
    const [playlist, setPlaylist] = useState([]);

    const handleSongSelection = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const newAudioUrl = URL.createObjectURL(file);
            setAudioUrl(newAudioUrl); // 更新状态
            const songName = file.name;
            setSongName(songName);
            const newSong = {
                id: Date.now(),
                name: songName,
                url: newAudioUrl,
            };
            setPlaylist([...playlist, newSong]);
        }
    };

    const deleteSong = (songId) => {
        setPlaylist(playlist.filter(song => song.id !== songId));
    };

    return (
        <IonPage>
            <IonContent className="content-background-menu ion-padding">
                <Menu />
                <div className="audioVisual-box">
                    <AudioVisualizer audioSrc= {audioUrl} />
                </div>
                <IonList className="music-menu">
                    <IonButton fill="clear" onClick={() => document.getElementById('fileInput').click()}>
                        <IonIcon icon={musicalNotes} />&nbsp;
                        选择歌曲
                    </IonButton>
                    <input type="file" id="fileInput" accept="audio/*" hidden onChange={handleSongSelection} />
                    {playlist.map(song => (
                        <IonItem key={song.id}>
                            <IonAvatar slot="start">
                                <img src={song.cover} alt="cover" /> {/* Placeholder for song cover */}
                            </IonAvatar>
                            <IonLabel>
                                <h2>{song.name}</h2>
                                <p>{song.artist}</p>
                            </IonLabel>
                            <IonButton fill="clear" slot="end" onClick={() => deleteSong(song.id)}>
                                <IonIcon icon={trashBin} />
                            </IonButton>
                        </IonItem>
                    ))}
                </IonList>
                <div className="music-content">
                <APlayer audio={{
                    url: audioUrl,
                    name: songName
                }}
                />
                </div>
            </IonContent>
        </IonPage>
    );
};

export default MusicPlayer;