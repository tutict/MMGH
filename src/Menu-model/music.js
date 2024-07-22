import React, { useState } from 'react';
import { IonContent, IonPage, IonButton, IonIcon, IonLabel, IonAvatar, IonItem, IonList } from '@ionic/react';
import { musicalNotes, trashBin } from 'ionicons/icons';
import Menu from "./Menu";
import { APlayer } from "aplayer-react";
import "aplayer/dist/APlayer.min.css";
import "../CSS/music.css"
import AudioVisualizer from "./AudioVisualizer";

const MusicPlayer = () => {
    const [audioUrl, setAudioUrl] = useState(''); // 音频URL状态
    const [songName, setSongName] = useState(''); // 歌曲名称状态
    const [artistName, setArtistName] = useState(''); // 新增艺术家名称状态
    const [playlist, setPlaylist] = useState([]);

    const handleSongSelection = async (event) => {
        const file = event.target.files[0];
        if (file) {
            const newAudioUrl = URL.createObjectURL(file);
            setAudioUrl(newAudioUrl); // 更新音频URL状态
            setSongName(file.name); // 更新歌曲名称状态
            setArtistName('Unknown Artist'); // 更新艺术家名称状态，这里可以设置为实际的艺术家名称
            const newSong = {
                id: Date.now(),
                name: file.name,
                artist: 'Unknown Artist', // 假设所有歌曲的艺术家名称都是未知
                url: newAudioUrl,
                cover: '' // 假设没有封面图片
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
                    <div className="audioVisualizer-container">
                        <AudioVisualizer audioSrc={audioUrl}/>
                    </div>
                </div>
                <IonList className="music-menu">
                    <IonButton fill="clear" onClick={() => document.getElementById('fileInput').click()}>
                        <IonIcon icon={musicalNotes}/>&nbsp;
                        选择歌曲
                    </IonButton>
                    <input type="file" id="fileInput" accept="audio/*" onChange={handleSongSelection} />
                    {playlist.map(song => (
                        <IonItem key={song.id}>
                            <IonAvatar slot="start">
                                <img src={song.cover} alt="cover" /> {/* 这里需要一个实际的图片源 */}
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
                    <APlayer
                        audio={{
                            url: audioUrl,
                            name: songName,
                            artist: artistName, // 传递艺术家名称
                        }}
                    />
                </div>
            </IonContent>
        </IonPage>
    );
};

export default MusicPlayer;