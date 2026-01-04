import React, { useEffect, useMemo, useRef, useState } from "react";
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
import "../CSS/menu.css";
import "../CSS/music.css";
import Menu from "./Menu";
import AudioVisualizer from "./AudioVisualizer";
import { useI18n } from "../i18n";

const MusicPlayer = () => {
  const { t } = useI18n();
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const fileInputRef = useRef(null);
  const playerContainerRef = useRef(null);
  const playerAudioRef = useRef(null);
  const [playerAudioEl, setPlayerAudioEl] = useState(null);

  const currentTrack = useMemo(
    () => playlist.find((song) => song.id === currentTrackId),
    [currentTrackId, playlist]
  );

  useEffect(() => {
    if (!currentTrack) {
      setPlayerAudioEl(null);
      playerAudioRef.current = null;
      return undefined;
    }

    const container = playerContainerRef.current;
    if (!container) {
      return undefined;
    }

    const syncAudioElement = () => {
      const audio = container.querySelector("audio");
      if (audio && playerAudioRef.current !== audio) {
        playerAudioRef.current = audio;
        setPlayerAudioEl(audio);
      }
    };

    syncAudioElement();

    const observer = new MutationObserver(syncAudioElement);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [currentTrackId, currentTrack]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    const newSong = {
      id: Date.now(),
      name: file.name,
      artist: t("music.unknownArtist"),
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
      <IonContent className="content-background-menu ion-padding spotify-music-page">
        <div className="page-shell">
          <Menu />

          <section className="music-layout spotify-layout">
            <div className="music-visualizer glass-panel spotify-panel">
              <header className="panel-header">
                <div>
                  <p className="panel-eyebrow">{t("music.panel.visualizer.eyebrow")}</p>
                  <h1>{t("music.panel.visualizer.title")}</h1>
                </div>
                <IonText className="panel-hint">
                  {currentTrack
                    ? currentTrack.name
                    : t("music.panel.visualizer.hint.empty")}
                </IonText>
              </header>
              <div className="spotify-hero">
                <div className="spotify-hero-cover">
                  {currentTrack?.cover ? (
                    <img src={currentTrack.cover} alt={t("music.cover.alt")} />
                  ) : (
                    <div className="spotify-cover-fallback">
                      <IonIcon icon={musicalNotes} />
                    </div>
                  )}
                </div>
                <div className="spotify-hero-meta">
                  <span className="spotify-hero-eyebrow">
                    {t("music.hero.nowPlaying")}
                  </span>
                  <h3>
                    {currentTrack ? currentTrack.name : t("music.hero.none")}
                  </h3>
                  <p>
                    {currentTrack
                      ? currentTrack.artist
                      : t("music.hero.noneDesc")}
                  </p>
                </div>
              </div>
              <div className="music-visualizer-canvas">
                <AudioVisualizer
                  audioSrc={currentTrack?.url ?? ""}
                  audioElement={playerAudioEl}
                />
                {!currentTrack && (
                  <div className="music-visualizer-placeholder">
                    <IonIcon icon={musicalNotes} size="large" />
                    <p>{t("music.panel.visualizer.placeholder")}</p>
                  </div>
                )}
              </div>
            </div>

            <aside className="music-sidebar glass-panel spotify-panel">
              <div className="music-sidebar-header">
                <div>
                  <p className="panel-eyebrow">{t("music.playlist.eyebrow")}</p>
                  <h2>{t("music.playlist.title")}</h2>
                  <IonText className="spotify-playlist-count">
                    {t("music.playlist.count", { count: playlist.length })}
                  </IonText>
                </div>
                <IonButton
                  className="spotify-upload-button"
                  color="light"
                  fill="clear"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t("music.playlist.upload")}
                >
                  <IonIcon icon={cloudUploadOutline} slot="start" />
                  {t("music.playlist.upload")}
                </IonButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={handleFileChange}
                />
              </div>

              <IonList className="music-playlist spotify-playlist">
                {playlist.length === 0 && (
                  <div className="music-playlist-empty" role="status">
                    <p>{t("music.playlist.empty.title")}</p>
                    <span>{t("music.playlist.empty.desc")}</span>
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
                    <IonAvatar slot="start" className="spotify-avatar">
                      {song.cover ? (
                        <img src={song.cover} alt={t("music.cover.alt")} />
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
                      className="spotify-delete-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteSong(song.id);
                      }}
                      aria-label={t("music.playlist.delete")}
                    >
                      <IonIcon icon={trashBin} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            </aside>
          </section>

          <section className="music-player glass-panel spotify-panel spotify-player">
            <header className="panel-header">
              <div>
                <p className="panel-eyebrow">{t("music.player.eyebrow")}</p>
                <h2>{currentTrack ? currentTrack.name : t("music.player.waiting")}</h2>
              </div>
              <IonText className="panel-hint">
                {currentTrack
                  ? currentTrack.artist
                  : t("music.player.hint.empty")}
              </IonText>
            </header>
            {currentTrack ? (
              <div ref={playerContainerRef}>
                <APlayer
                  key={currentTrack.id}
                  audio={{
                    url: currentTrack.url,
                    name: currentTrack.name,
                    artist: currentTrack.artist,
                  }}
                  theme="#1db954"
                  autoplay={false}
                />
              </div>
            ) : (
              <div className="music-player-placeholder">
                <IonIcon icon={musicalNotes} size="large" />
                <p>{t("music.player.empty")}</p>
              </div>
            )}
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MusicPlayer;
