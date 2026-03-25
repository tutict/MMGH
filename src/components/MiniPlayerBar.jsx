import React, { useRef } from "react";
import { useI18n } from "../i18n";

function MiniPlayerBar({
  currentTime,
  duration,
  handleOpenMusicWorkspace,
  handleRestartTrack,
  handleSeek,
  handleTogglePlayback,
  isPlaying,
  selectedTrack,
}) {
  const { t } = useI18n();
  const rootRef = useRef(null);

  const handlePointerMove = (event) => {
    const element = rootRef.current;
    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    element.style.setProperty("--mini-glow-x", `${Math.max(0, Math.min(100, x))}%`);
    element.style.setProperty("--mini-glow-y", `${Math.max(0, Math.min(100, y))}%`);
  };

  const handlePointerLeave = () => {
    const element = rootRef.current;
    if (!element) {
      return;
    }

    element.style.setProperty("--mini-glow-x", "50%");
    element.style.setProperty("--mini-glow-y", "50%");
  };

  return (
    <section
      ref={rootRef}
      className="mini-player-bar panel-surface"
      aria-label={t("app.music.miniPlayer.label")}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <button
        type="button"
        className="mini-player-bar__meta"
        onClick={handleOpenMusicWorkspace}
      >
        <img
          className="mini-player-bar__cover"
          src={selectedTrack?.cover}
          alt={selectedTrack?.title || t("app.music.trackCover")}
        />
        <div className="mini-player-bar__copy">
          <div className="mini-player-bar__status-row">
            <span className="mini-player-bar__eyebrow">{t("app.music.miniPlayer.eyebrow")}</span>
            <span
              className={`mini-player-bar__visualizer ${isPlaying ? "is-playing" : ""}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
              <span />
            </span>
          </div>
          <strong>{selectedTrack?.title || t("app.music.noTrack")}</strong>
          <p>{selectedTrack?.artist || t("app.music.noArtist")}</p>
        </div>
      </button>

      <div className="mini-player-bar__controls">
        <button
          type="button"
          className="mini-player-bar__button"
          onClick={handleRestartTrack}
          aria-label={t("app.music.restart")}
        >
          <span className="mini-player-bar__button-icon mini-player-bar__button-icon--restart" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="mini-player-bar__button mini-player-bar__button--primary"
          onClick={handleTogglePlayback}
          aria-label={isPlaying ? t("app.music.pause") : t("app.music.play")}
        >
          <span
            className={`mini-player-bar__button-icon ${
              isPlaying
                ? "mini-player-bar__button-icon--pause"
                : "mini-player-bar__button-icon--play"
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="mini-player-bar__timeline">
        <div className="mini-player-bar__time">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
        <div className="mini-player-bar__rail">
          <input
            className="mini-player-bar__slider"
            type="range"
            min="0"
            max={Math.max(duration, 1)}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSeek}
            aria-label={t("app.music.miniPlayer.progress")}
          />
        </div>
      </div>
    </section>
  );
}

function formatDuration(value) {
  if (!value || Number.isNaN(value)) {
    return "0:00";
  }

  const whole = Math.floor(value);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default MiniPlayerBar;
