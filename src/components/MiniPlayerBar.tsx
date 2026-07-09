import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { Box, Slider } from "@mui/material";
import AppIconButton from "./ui/AppIconButton";
import AppButton from "./ui/AppButton";
import { useRef } from "react";
import { useI18n } from "../i18n";
import { usePlaybackSnapshot } from "../utils/playbackSnapshot";

type MiniPlayerTrack = {
  cover?: string;
  title?: string;
  artist?: string;
};

type MiniPlayerBarProps = {
  handleOpenMusicWorkspace: () => void;
  handleRestartTrack: () => void;
  handleSeek: (event: { target: { value: number | string } }) => void;
  handleTogglePlayback: () => void;
  isPlaying: boolean;
  isAppVisible?: boolean;
  placement?: string;
  selectedTrack?: MiniPlayerTrack | null;
};

function MiniPlayerBar({
  handleOpenMusicWorkspace,
  handleRestartTrack,
  handleSeek,
  handleTogglePlayback,
  isPlaying,
  placement = "floating",
  selectedTrack,
}: MiniPlayerBarProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLElement | null>(null);
  const { currentTime, duration } = usePlaybackSnapshot();

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
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

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    handleSeek({ target: { value: nextValue } });
  };

  return (
    <section
      ref={rootRef}
      className={`mini-player-bar mini-player-bar--${placement} panel-surface`}
      aria-label={t("app.music.miniPlayer.label")}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <AppButton
        className="mini-player-bar__meta"
        onClick={handleOpenMusicWorkspace}
        disableRipple
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
      </AppButton>

      <div className="mini-player-bar__controls">
        <AppIconButton
          className="mini-player-bar__button"
          onClick={handleRestartTrack}
          aria-label={t("app.music.restart")}
          size="small"
        >
          <ReplayRoundedIcon fontSize="small" />
        </AppIconButton>
        <AppIconButton
          className="mini-player-bar__button mini-player-bar__button--primary"
          onClick={handleTogglePlayback}
          aria-label={isPlaying ? t("app.music.pause") : t("app.music.play")}
          size="small"
        >
          {isPlaying ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
        </AppIconButton>
      </div>

      <div className="mini-player-bar__timeline">
        <div className="mini-player-bar__time">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
        <Box className="mini-player-bar__rail">
          <Slider
            className="mini-player-bar__slider"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSliderChange}
            aria-label={t("app.music.miniPlayer.progress")}
            size="small"
          />
        </Box>
      </div>
    </section>
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
