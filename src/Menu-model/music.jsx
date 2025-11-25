import React, { useMemo, useRef, useState } from "react";
import {
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonText,
} from "@ionic/react";
import { cloudUploadOutline, musicalNotes, trashBin } from "ionicons/icons";
import { APlayer } from "aplayer-react";
import "aplayer/dist/APlayer.min.css";
import "../CSS/music.css";
import Menu from "./Menu";
import AudioVisualizer from "./AudioVisualizer";

const MusicPlayer = () => {
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const fileInputRef = useRef(null);

  const currentTrack = useMemo(
    () => playlist.find((song) => song.id === currentTrackId),
    [currentTrackId, playlist]
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    const newSong = {
      id: Date.now(),
      name: file.name,
      artist: "Unknown Artist",
      url,
      cover: "",
    };

    setPlaylist((prev) => [...prev, newSong]);
    setCurrentTrackId(newSong.id);
  };

  const deleteSong = (songId) => {
    setPlaylist((prev) => prev.filter((song) => song.id !== songId));
    if (songId === currentTrackId) {
      setCurrentTrackId(null);
    }
  };

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <Menu />

        <section className="music-layout">
          <div className="music-visualizer glass-panel">
            <header className="panel-header">
              <div>
                <p className="panel-eyebrow">声波舞台</p>
                <h1>实时音频可视化</h1>
              </div>
              <IonText className="panel-hint">
                {currentTrack ? currentTrack.name : "请选择音频文件"}
              </IonText>
            </header>
            <div className="music-visualizer-canvas">
              <AudioVisualizer audioSrc={currentTrack?.url ?? ""} />
              {!currentTrack && (
                <div className="music-visualizer-placeholder">
                  <IonIcon icon={musicalNotes} size="large" />
                  <p>加载一首歌，看看声波的舞动</p>
                </div>
              )}
            </div>
          </div>

          <aside className="music-sidebar glass-panel">
            <div className="music-sidebar-header">
              <div>
                <p className="panel-eyebrow">播放列表</p>
                <h2>本地曲库</h2>
              </div>
              <IonButton
                color="light"
                fill="clear"
                onClick={() => fileInputRef.current?.click()}
              >
                <IonIcon icon={cloudUploadOutline} slot="start" />
                导入
              </IonButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={handleFileChange}
              />
            </div>

            <IonList className="music-playlist">
              {playlist.length === 0 && (
                <div className="music-playlist-empty" role="status">
                  <p>播放列表为空</p>
                  <span>点击右上角按钮导入本地音频文件。</span>
                </div>
              )}
              {playlist.map((song) => (
                <IonItem
                  key={song.id}
                  button
                  detail={false}
                  className={`music-playlist-item ${
                    song.id === currentTrackId ? "music-playlist-item--active" : ""
                  }`}
                  onClick={() => setCurrentTrackId(song.id)}
                >
                  <IonAvatar slot="start">
                    {song.cover ? (
                      <img src={song.cover} alt="封面" />
                    ) : (
                      <div className="music-cover-fallback">
                        <IonIcon icon={musicalNotes} />
                      </div>
                    )}
                  </IonAvatar>
                  <IonLabel>
                    <h3>{song.name}</h3>
                    <p>{song.artist}</p>
                  </IonLabel>
                  <IonButton
                    fill="clear"
                    slot="end"
                    color="medium"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteSong(song.id);
                    }}
                  >
                    <IonIcon icon={trashBin} />
                  </IonButton>
                </IonItem>
              ))}
            </IonList>
          </aside>
        </section>

        <section className="music-player glass-panel">
          <header className="panel-header">
            <div>
              <p className="panel-eyebrow">播放器</p>
              <h2>{currentTrack ? currentTrack.name : "等待播放"}</h2>
            </div>
            <IonText className="panel-hint">
              {currentTrack ? currentTrack.artist : "导入曲目即可开始播放"}
            </IonText>
          </header>
          {currentTrack ? (
            <APlayer
              key={currentTrack.id}
              audio={{
                url: currentTrack.url,
                name: currentTrack.name,
                artist: currentTrack.artist,
              }}
              theme="#f9fbff"
              autoplay={false}
            />
          ) : (
            <div className="music-player-placeholder">
              <IonIcon icon={musicalNotes} size="large" />
              <p>暂无播放内容</p>
            </div>
          )}
        </section>
      </IonContent>
    </IonPage>
  );
};

export default MusicPlayer;
