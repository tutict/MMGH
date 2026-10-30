import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import QueueMusicRoundedIcon from "@mui/icons-material/QueueMusicRounded";
import RepeatOneRoundedIcon from "@mui/icons-material/RepeatOneRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import { useState } from "react";
import { usePlaybackSnapshot } from "../../utils/playbackSnapshot";
import { AppIconButton, AppSlider, MobileButton, MobilePage, MobileRowButton } from "../ui";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

const PLAY_MODE_ICONS = {
  loop: RepeatRoundedIcon,
  single: RepeatOneRoundedIcon,
  shuffle: ShuffleRoundedIcon,
};

function formatDuration(value) {
  if (!value || Number.isNaN(value)) {
    return "0:00";
  }

  const whole = Math.floor(value);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function MobileMusicView({
  handleCyclePlayMode,
  handlePlayNextTrack,
  handlePlayPreviousTrack,
  handleSeek,
  handleSelectTrack,
  handleTogglePlayback,
  isPlaying,
  lang,
  localizedTracks = [],
  lyricsLines = [],
  playMode = "loop",
  selectedTrack,
  setVolume,
  t,
  volume = 72,
}: Record<string, any>) {
  const [sheet, setSheet] = useState("");
  const { currentTime, duration } = usePlaybackSnapshot();
  const PlayModeIcon = PLAY_MODE_ICONS[playMode] || RepeatRoundedIcon;
  const playModeLabel = t?.(`app.music.mode.${playMode}`) || playMode;

  const handleProgressChange = (_event, value) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    handleSeek?.({ target: { value: nextValue } });
  };

  const handleVolumeChange = (_event, value) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    setVolume?.(Number(nextValue));
  };

  return (
    <MobilePage view="music">
      <section className="mobile-player">
        <div className="mobile-player__art">
          {selectedTrack?.cover ? (
            <img src={selectedTrack.cover} alt={selectedTrack.title || t?.("app.music.trackCover") || ""} />
          ) : null}
        </div>
        <div className="mobile-player__meta">
          <strong>{selectedTrack?.title || t?.("app.music.noTrack")}</strong>
          <span>{selectedTrack?.artist || t?.("app.music.noArtist")}</span>
        </div>

        <AppSlider
          className="mobile-player__progress"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleProgressChange}
          aria-label={t?.("app.music.progressLabel") || "Playback progress"}
          size="small"
        />
        <div className="mobile-player__time">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>

        <div className="mobile-player__controls">
          <AppIconButton onClick={handleCyclePlayMode} aria-label={playModeLabel} title={playModeLabel}>
            <PlayModeIcon fontSize="small" />
          </AppIconButton>
          <AppIconButton
            onClick={handlePlayPreviousTrack}
            aria-label={t?.("app.music.previous") || "Previous track"}
          >
            <SkipPreviousRoundedIcon />
          </AppIconButton>
          <AppIconButton
            className="mobile-player__play"
            onClick={handleTogglePlayback}
            aria-label={isPlaying ? t?.("app.music.pause") : t?.("app.music.play")}
          >
            {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          </AppIconButton>
          <AppIconButton
            onClick={handlePlayNextTrack}
            aria-label={t?.("app.music.next") || "Next track"}
          >
            <SkipNextRoundedIcon />
          </AppIconButton>
          <AppIconButton
            onClick={() => setSheet("queue")}
            aria-label={t?.("app.music.queueTitle") || "Track queue"}
          >
            <QueueMusicRoundedIcon fontSize="small" />
          </AppIconButton>
        </div>

        <div className="mobile-player__volume">
          <VolumeUpRoundedIcon fontSize="small" aria-hidden="true" />
          <AppSlider
            min={0}
            max={100}
            value={volume}
            onChange={handleVolumeChange}
            aria-label={t?.("app.music.volume") || "Volume"}
            size="small"
          />
        </div>

        <MobileButton
          className="mobile-player__lyrics"
          variant="text"
          onClick={() => setSheet("lyrics")}
          disabled={lyricsLines.length === 0}
        >
          {t?.("app.music.lyricsTitle") || "Lyrics"}
        </MobileButton>
      </section>

      <MobileSheet
        id="mobile-music-queue"
        open={sheet === "queue"}
        onClose={() => setSheet("")}
        closeLabel={mobileText(lang, "close")}
        title={t?.("app.music.queueTitle") || "Track queue"}
      >
        <div className="mobile-list">
          {localizedTracks.map((track) => (
            <MobileRowButton
              key={track.id}
              className="mobile-queue-row"
              active={track.id === selectedTrack?.id}
              onClick={() => {
                handleSelectTrack?.(track.id);
                setSheet("");
              }}
            >
              {track.cover ? <img src={track.cover} alt="" loading="lazy" /> : null}
              <span className="mobile-row__body">
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </span>
              {track.id === selectedTrack?.id ? <small>{t?.("app.music.nowPlaying") || "Now playing"}</small> : null}
            </MobileRowButton>
          ))}
        </div>
      </MobileSheet>

      <MobileSheet
        id="mobile-music-lyrics"
        open={sheet === "lyrics"}
        onClose={() => setSheet("")}
        closeLabel={mobileText(lang, "close")}
        title={t?.("app.music.lyricsTitle") || "Lyrics"}
      >
        <div className="mobile-lyrics">
          {lyricsLines.map((line, index) => (
            <p key={`${line.time}-${index}`}>{line.text}</p>
          ))}
        </div>
      </MobileSheet>
    </MobilePage>
  );
}
