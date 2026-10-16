import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useI18n } from "../i18n";
import { usePlaybackSnapshot } from "../utils/playbackSnapshot";
import { AppButton, AppIconButton, AppSlider } from "./ui";

type MiniPlayerTrack = {
  cover?: string;
  title?: string;
  artist?: string;
};

type MiniPlayerBarProps = {
  handleOpenMusicWorkspace: () => void;
  handlePlayNextTrack?: () => void;
  handlePlayPreviousTrack?: () => void;
  handleRestartTrack: () => void;
  handleSeek: (event: { target: { value: number | string } }) => void;
  handleTogglePlayback: () => void;
  isPlaying: boolean;
  placement?: string;
  selectedTrack?: MiniPlayerTrack | null;
};

function MiniPlayerBar({
  handleOpenMusicWorkspace,
  handlePlayNextTrack,
  handlePlayPreviousTrack,
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
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const collapseEnabled = placement !== "rail";
  const [collapsed, setCollapsed] = useState(() => {
    if (!collapseEnabled || typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("mmgh.mini-player.collapsed") === "1";
  });
  const isCollapsed = collapseEnabled && collapsed;

  useEffect(() => {
    if (!collapseEnabled || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("mmgh.mini-player.collapsed", collapsed ? "1" : "0");
  }, [collapseEnabled, collapsed]);

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

  if (placement === "phone") {
    return (
      <div className="mobile-transport">
        <button type="button" onClick={handleOpenMusicWorkspace}>{selectedTrack?.title}</button>
        <AppButton onClick={handleTogglePlayback}>{isPlaying ? t("app.music.pause") : t("app.music.play")}</AppButton>
      </div>
    );
  }

  if (placement === "desk") {
    return (
      <div className="desk-transport" aria-label={t("app.music.miniPlayer.label")}>
        <button type="button" onClick={handleOpenMusicWorkspace}>{selectedTrack?.title}</button>
        <AppButton onClick={handlePlayPreviousTrack}>{t("app.music.previous")}</AppButton>
        <AppButton onClick={handleTogglePlayback}>{isPlaying ? t("app.music.pause") : t("app.music.play")}</AppButton>
        <AppButton onClick={handlePlayNextTrack}>{t("app.music.next")}</AppButton>
        <input
          aria-label={t("app.music.miniPlayer.progress")}
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(event) => handleSeek({ target: { value: event.target.value } })}
        />
      </div>
    );
  }

  return (
    <section
      ref={rootRef}
      className={`mini-player-bar mini-player-bar--${placement} panel-surface${isCollapsed ? " is-collapsed" : ""}`}
      aria-label={t("app.music.miniPlayer.label")}
      style={{ "--mini-progress": `${progress}%` } as CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <AppButton
        className="mini-player-bar__meta"
        onClick={isCollapsed ? () => setCollapsed(false) : handleOpenMusicWorkspace}
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
        {collapseEnabled ? (
          <AppIconButton
            className="mini-player-bar__button mini-player-bar__collapse"
            onClick={() => setCollapsed(true)}
            aria-label={t("app.music.miniPlayer.collapse")}
            size="small"
          >
            <CollapseIcon />
          </AppIconButton>
        ) : null}
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
        <div className="mini-player-bar__rail">
          <AppSlider
            className="mini-player-bar__slider"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={handleSliderChange}
            aria-label={t("app.music.miniPlayer.progress")}
            size="small"
          />
        </div>
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

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 14h3v3h2v-5H7v2Zm7-7h-2v5h5V10h-3V7Z"
      />
    </svg>
  );
}
