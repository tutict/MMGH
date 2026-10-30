import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import SkipPreviousRoundedIcon from "@mui/icons-material/SkipPreviousRounded";
import { useI18n } from "../i18n";
import { usePlaybackSnapshot } from "../utils/playbackSnapshot";
import { AppIconButton, AppSlider } from "./ui";

type MiniPlayerTrack = {
  cover?: string;
  title?: string;
  artist?: string;
};

type MiniPlayerBarProps = {
  handleOpenMusicWorkspace: () => void;
  handlePlayNextTrack?: () => void;
  handlePlayPreviousTrack?: () => void;
  handleSeek: (event: { target: { value: number | string } }) => void;
  handleTogglePlayback: () => void;
  isPlaying: boolean;
  placement: "phone" | "desk";
  selectedTrack?: MiniPlayerTrack | null;
};

function MiniPlayerBar({
  handleOpenMusicWorkspace,
  handlePlayNextTrack,
  handlePlayPreviousTrack,
  handleSeek,
  handleTogglePlayback,
  isPlaying,
  placement,
  selectedTrack,
}: MiniPlayerBarProps) {
  const { t } = useI18n();
  const { currentTime, duration } = usePlaybackSnapshot();

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    handleSeek({ target: { value: nextValue } });
  };

  if (placement === "phone") {
    return (
      <div className="mobile-transport" aria-label={t("app.music.miniPlayer.label")}>
        <button type="button" className="mobile-transport__meta" onClick={handleOpenMusicWorkspace}>
          {selectedTrack?.cover ? (
            <img className="mobile-transport__cover" src={selectedTrack.cover} alt="" />
          ) : null}
          <span className="mobile-transport__copy">
            <strong>{selectedTrack?.title || t("app.music.noTrack")}</strong>
            <span>{selectedTrack?.artist || t("app.music.noArtist")}</span>
          </span>
        </button>
        <AppIconButton
          className="mobile-transport__play"
          onClick={handleTogglePlayback}
          aria-label={isPlaying ? t("app.music.pause") : t("app.music.play")}
        >
          {isPlaying ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
        </AppIconButton>
      </div>
    );
  }

  return (
    <div className="desk-transport" aria-label={t("app.music.miniPlayer.label")}>
      <button type="button" className="desk-transport__meta" onClick={handleOpenMusicWorkspace}>
        {selectedTrack?.cover ? (
          <img className="desk-transport__cover" src={selectedTrack.cover} alt="" />
        ) : null}
        <span className="desk-transport__copy">
          <strong>{selectedTrack?.title || t("app.music.noTrack")}</strong>
          <span>{selectedTrack?.artist || t("app.music.noArtist")}</span>
        </span>
      </button>
      <div className="desk-transport__controls">
        <AppIconButton
          className="desk-transport__button"
          onClick={handlePlayPreviousTrack}
          aria-label={t("app.music.previous")}
          size="small"
        >
          <SkipPreviousRoundedIcon fontSize="small" />
        </AppIconButton>
        <AppIconButton
          className="desk-transport__button desk-transport__button--primary"
          onClick={handleTogglePlayback}
          aria-label={isPlaying ? t("app.music.pause") : t("app.music.play")}
          size="small"
        >
          {isPlaying ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
        </AppIconButton>
        <AppIconButton
          className="desk-transport__button"
          onClick={handlePlayNextTrack}
          aria-label={t("app.music.next")}
          size="small"
        >
          <SkipNextRoundedIcon fontSize="small" />
        </AppIconButton>
      </div>
      <div className="desk-transport__timeline">
        <span className="desk-transport__time">{formatDuration(currentTime)}</span>
        <AppSlider
          className="desk-transport__slider"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSliderChange}
          aria-label={t("app.music.miniPlayer.progress")}
          size="small"
        />
        <span className="desk-transport__time">{formatDuration(duration)}</span>
      </div>
    </div>
  );
}

function formatDuration(value: number) {
  if (!value || Number.isNaN(value)) {
    return "0:00";
  }

  const whole = Math.floor(value);
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default MiniPlayerBar;
