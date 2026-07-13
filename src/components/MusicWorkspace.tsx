import React from "react";
import { useI18n } from "../i18n";
import { usePlaybackSnapshot } from "../utils/playbackSnapshot";
import { AppButton, AppFileInput, AppIconButton, AppSlider } from "./ui";

const LYRIC_LINE_HEIGHT = 72;
const COSMIC_DUST_PARTICLES = Array.from({ length: 24 }, (_, index) => {
  const seed = pseudoRandom(index + 1);
  const secondary = pseudoRandom(index + 101);
  const tertiary = pseudoRandom(index + 301);
  return {
    id: `music-dust-${index}`,
    angle: seed * Math.PI * 2,
    radius: 118 + secondary * 50,
    size: 1.3 + tertiary * 3.2,
    opacity: 0.16 + seed * 0.34,
  };
});

const LEGACY_TRACK_LYRICS = {
  "builtin-reply-pulse": [
    { time: 0, text: "Reply pulse in the midnight glow", subtext: "深夜里，回复的脉冲开始点亮屏幕" },
    { time: 14, text: "City lights drift into the low end", subtext: "城市灯火沉进低频，气氛慢慢下坠" },
    { time: 28, text: "Every signal circles back to you", subtext: "每一道信号，最后都绕回你这里" },
    { time: 43, text: "Static melts into a warmer hue", subtext: "噪声融化，夜色染上一层暖红" },
    { time: 58, text: "Heartbeat syncing with the afterglow", subtext: "心跳跟着余晖同步，节奏贴近耳边" },
    { time: 73, text: "Hold the line while the chorus blooms", subtext: "副歌展开之前，把这条连线握紧" },
    { time: 88, text: "Neon echoes move through empty rooms", subtext: "霓虹回声穿过安静的房间" },
    { time: 104, text: "Stay awake, the waveform knows", subtext: "别睡，声波已经记住此刻的温度" },
  ],
  "builtin-neon-orbit": [
    { time: 0, text: "Orbit lights are carving blue halos", subtext: "轨道霓虹划出一圈一圈冷蓝光环" },
    { time: 16, text: "A silver kick drums through the dark", subtext: "银色鼓点在暗色里敲出清晰轮廓" },
    { time: 31, text: "Gravity bends around the chorus", subtext: "引力在副歌边缘被悄悄拉弯" },
    { time: 47, text: "The skyline shivers into sparks", subtext: "天际线抖落成细碎的火花" },
    { time: 63, text: "Spin slower, then break into the drop", subtext: "先放慢旋转，再俯冲进下一次坠落" },
    { time: 79, text: "Cold air glows inside the reverb", subtext: "残响里也有发光的冷空气" },
    { time: 95, text: "We keep floating past the last stop", subtext: "我们越过终点，继续失重漂浮" },
    { time: 111, text: "Orbit lights are still awake", subtext: "直到最后，轨道上的灯仍然清醒" },
  ],
};
void LEGACY_TRACK_LYRICS;

const PLAY_MODE_META = {
  loop: {
    labelKey: "app.music.mode.loop",
    shortLabel: "LOOP",
  },
  single: {
    labelKey: "app.music.mode.single",
    shortLabel: "ONE",
  },
  shuffle: {
    labelKey: "app.music.mode.shuffle",
    shortLabel: "SHUF",
  },
};

const TRACK_LYRICS = {
  "builtin-reply-pulse": [
    { time: 0, text: "Reply pulse in the midnight glow", subtext: "深夜里，回复的脉冲点亮了整块屏幕。" },
    { time: 14, text: "City lights drift into the low end", subtext: "城市灯火沉进低频，空气也跟着慢慢下坠。" },
    { time: 28, text: "Every signal circles back to you", subtext: "每一道讯号兜了一圈，最后还是落回你这里。" },
    { time: 43, text: "Static melts into a warmer hue", subtext: "噪声慢慢化开，夜色也染上了一层暖光。" },
    { time: 58, text: "Heartbeat syncing with the afterglow", subtext: "心跳和余晖重新对拍，节奏贴着耳边推进。" },
    { time: 73, text: "Hold the line while the chorus blooms", subtext: "副歌还没完全打开之前，先把这条连线握紧。" },
    { time: 88, text: "Neon echoes move through empty rooms", subtext: "霓虹回声穿过安静房间，把空白都照亮。" },
    { time: 104, text: "Stay awake, the waveform knows", subtext: "别急着睡，波形已经记住了这一刻的温度。" },
  ],
  "builtin-neon-orbit": [
    { time: 0, text: "Orbit lights are carving blue halos", subtext: "轨道霓虹一圈圈划开，冷蓝光环还在扩散。" },
    { time: 16, text: "A silver kick drums through the dark", subtext: "银色鼓点敲进暗处，把轮廓一层层震醒。" },
    { time: 31, text: "Gravity bends around the chorus", subtext: "引力沿着副歌边缘悄悄弯折，节拍开始失重。" },
    { time: 47, text: "The skyline shivers into sparks", subtext: "天际线轻轻一颤，碎成细小又明亮的火花。" },
    { time: 63, text: "Spin slower, then break into the drop", subtext: "先把转速压低一点，再一头坠进下一次下落。" },
    { time: 79, text: "Cold air glows inside the reverb", subtext: "残响里连冷空气都在发光，像夜色回潮。" },
    { time: 95, text: "We keep floating past the last stop", subtext: "我们越过最后一站，还在失重里继续漂流。" },
    { time: 111, text: "Orbit lights are still awake", subtext: "直到最后，轨道尽头的灯也没有熄掉。" },
  ],
};

function MusicWorkspace({
  autoPlayOnReply,
  handleCyclePlayMode,
  handlePlayNextTrack,
  handlePlayPreviousTrack,
  handleRestartTrack,
  handleSeek,
  handleSelectTrack,
  handleTogglePlayback,
  isPlaying,
  lyricsError,
  lyricsLines,
  lyricsSource,
  lyricsStatus,
  lyricsUploadInputRef,
  localizedTracks,
  onRefreshLyrics,
  onUploadLyricsFile,
  playMode,
  selectedTrack,
  selectedTrackId,
  setAutoPlayOnReply,
  setVolume,
  uploadInputRef,
  volume,
}: Record<string, any>) {
  const { t } = useI18n();
  const { currentTime, duration } = usePlaybackSnapshot();
  const consoleRef = React.useRef<HTMLElement | null>(null);
  const compactLayoutRef = React.useRef(true);
  const [isLibraryOpen, setIsLibraryOpen] = React.useState(false);
  const [isCompactLayout, setIsCompactLayout] = React.useState(true);
  const [particleCount, setParticleCount] = React.useState(() =>
    typeof window === "undefined" ? 18 : resolveParticleBudget(window)
  );
  const pulseLevel = isPlaying ? 0.34 : 0.18;

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setParticleCount(resolveParticleBudget(window));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const node = consoleRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const compact = entry.contentRect.width < 1180;
      const wasCompact = compactLayoutRef.current;
      compactLayoutRef.current = compact;
      setIsCompactLayout(compact);
      setIsLibraryOpen((previous) => {
        if (localizedTracks.length === 0) {
          return false;
        }
        if (!compact) {
          return true;
        }
        return wasCompact ? previous : false;
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [localizedTracks.length]);

  const coverSrc = selectedTrack?.cover || localizedTracks[0]?.cover || "/reply-pulse-cover.jpg";
  const currentTrackLabel = selectedTrack?.title || t("app.music.noTrack");
  const currentArtistLabel = selectedTrack?.artist || t("app.music.noArtist");
  const progressValue = Math.min(currentTime, duration || 0);
  const handleProgressChange = (_event: Event, value: number | number[]) => {
    const nextValue = Array.isArray(value) ? value[0] : value;
    handleSeek({ target: { value: nextValue } });
  };
  const handleVolumeChange = (_event: Event, value: number | number[]) => {
    setVolume(Array.isArray(value) ? value[0] : value);
  };
  const syncStateLabel = autoPlayOnReply
    ? t("app.music.replySyncOn")
    : t("app.music.manualMode");
  const sourceLabel =
    typeof selectedTrackId === "string" && selectedTrackId.startsWith("upload-")
      ? t("app.music.sourceUpload")
      : t("app.music.sourceBuiltIn");
  const playModeMeta = PLAY_MODE_META[playMode] || PLAY_MODE_META.loop;
  const waveformBars = React.useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => {
        const trackSeed = typeof selectedTrackId === "string" ? selectedTrackId.length : 8;
        const seed = pseudoRandom(trackSeed * 13 + index * 17);
        return {
          id: `waveform-${index}`,
          delay: index * 42,
          height: 22 + Math.round(seed * 68),
        };
      }),
    [selectedTrackId]
  );
  const activeLyricIndex = React.useMemo(() => {
    let index = 0;
    lyricsLines.forEach((line, lineIndex) => {
      if (currentTime >= line.time) {
        index = lineIndex;
      }
    });
    return index;
  }, [currentTime, lyricsLines]);
  const lyricsTransform = `translateY(-${
    activeLyricIndex * LYRIC_LINE_HEIGHT + LYRIC_LINE_HEIGHT / 2
  }px)`;
  const lyricsStatusLabel = resolveLyricsStatusLabel({ lyricsError, lyricsSource, lyricsStatus, t });

  function handleTrackPick(trackId) {
    handleSelectTrack(trackId);
    if (isCompactLayout) {
      setIsLibraryOpen(false);
    }
  }

  return (
    <section
      ref={consoleRef}
      className={`audio-console audio-theme-${selectedTrack?.theme || "ember"} ${
        isPlaying ? "audio-is-playing" : "audio-is-paused"
      }`}
    >
      <div
        className="audio-console__backdrop"
        style={{ backgroundImage: `url(${coverSrc})` }}
        aria-hidden="true"
      />
      <div className="audio-console__scrim" aria-hidden="true" />

      <div className={`audio-console__surface ${isLibraryOpen ? "audio-library-open" : "audio-library-collapsed"}`}>
        <AppButton
          className={`audio-console__library-toggle ${isLibraryOpen ? "audio-is-open" : ""}`}
          onClick={() => setIsLibraryOpen((prev) => !prev)}
          aria-label={t("app.music.libraryToggle")}
          aria-expanded={isLibraryOpen}
          aria-controls="audio-console-library"
        >
          <LibraryIcon />
          <span>{t("app.music.libraryToggle")}</span>
        </AppButton>

        <div className="audio-console__main">
          <header className="audio-console__header">
            <div className="audio-console__header-shell">
              <div className="audio-console__headline">
                <span className="audio-eyebrow">{t("app.music.eyebrow")}</span>
                <h2>{t("app.music.panelTitle")}</h2>
                <p>{t("app.music.panelDescription")}</p>
              </div>

              <div className="audio-console__status-strip">
                <div className="audio-console__status-item">
                  <span>{t("app.music.statsLibrary")}</span>
                  <strong>{t("app.music.trackCount", { count: localizedTracks.length })}</strong>
                </div>
                <div className="audio-console__status-item">
                  <span>{t("app.music.statsSource")}</span>
                  <strong>{sourceLabel}</strong>
                </div>
                <div className="audio-console__status-item">
                  <span>{t("app.music.playMode")}</span>
                  <strong>{t(playModeMeta.labelKey)}</strong>
                </div>
                <div className="audio-console__status-item">
                  <span>{t("app.sound.autoPlay")}</span>
                  <strong>{syncStateLabel}</strong>
                </div>
              </div>
            </div>

            <div className="audio-console__meta">
              <span className="audio-console__chip">{sourceLabel}</span>
              <span className={`audio-console__chip ${isPlaying ? "audio-is-live" : ""}`}>
                {isPlaying ? t("app.music.playing") : t("app.music.paused")}
              </span>
              <span className="audio-console__chip">{t(playModeMeta.labelKey)}</span>
              <label className="audio-console__sync">
                <span>{t("app.sound.autoPlay")}</span>
                <AppButton
                  className={`audio-switch ${autoPlayOnReply ? "audio-is-on" : ""}`}
                  aria-pressed={autoPlayOnReply}
                  disableRipple
                  onClick={() => setAutoPlayOnReply((prev) => !prev)}
                >
                  <span />
                </AppButton>
              </label>
              <AppButton
                className="audio-console__utility"
                onClick={() => uploadInputRef.current?.click()}
              >
                <UploadIcon />
                <span>{t("app.music.upload")}</span>
              </AppButton>
            </div>
          </header>

          <div className="audio-console__stage">
            <div className="audio-console__turntable" style={{ "--audio-pulse-level": pulseLevel } as React.CSSProperties}>
              <div className="audio-console__plinth" aria-hidden="true">
                <span className="audio-console__plinth-mark audio-console__plinth-mark--left" />
                <span className="audio-console__plinth-mark audio-console__plinth-mark--right" />
              </div>
              <span className="audio-console__arm-base" aria-hidden="true" />
              <span className={`audio-console__needle ${isPlaying ? "audio-is-playing" : ""}`} aria-hidden="true" />
              <div className="audio-console__disc-stage">
                <svg
                  className="audio-console__particle-ring"
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="audio-console-dust-gradient" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                      <stop offset="45%" stopColor="rgba(255,255,255,0.72)" />
                      <stop offset="72%" stopColor="rgba(255,255,255,0.28)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                  </defs>
                  <CosmicDustRing
                    isPlaying={isPlaying}
                    particleCount={particleCount}
                    pulseLevel={pulseLevel}
                  />
                </svg>

                <div className={`audio-console__vinyl ${isPlaying ? "audio-is-spinning" : ""}`}>
                  <span className="audio-console__vinyl-ring" aria-hidden="true" />
                  <span className="audio-console__vinyl-ring audio-is-inner" aria-hidden="true" />
                  <img src={coverSrc} alt={currentTrackLabel || t("app.music.trackCover")} />
                  <span className="audio-console__vinyl-shine" aria-hidden="true" />
                  <span className="audio-console__vinyl-core" aria-hidden="true" />
                </div>
              </div>

              <div className="audio-console__turntable-copy">
                <strong>{currentTrackLabel}</strong>
                <p>{currentArtistLabel}</p>
              </div>
            </div>

            <div className="audio-console__content">
              <div className="audio-console__trackline">
                <div className="audio-console__track-copy">
                  <span className="audio-eyebrow">{t("app.music.nowPlaying")}</span>
                  <h3>{currentTrackLabel}</h3>
                  <p>{currentArtistLabel}</p>
                </div>

                <div className="audio-console__facts">
                  <span>{t("app.music.currentLabel")} {formatDuration(currentTime)}</span>
                  <span>{t("app.music.durationLabel")} {formatDuration(duration)}</span>
                  <span>{t("app.music.volume")} {volume}%</span>
                </div>

                <div
                  className={`audio-console__waveform ${isPlaying ? "audio-is-playing" : ""}`}
                  aria-hidden="true"
                >
                  {waveformBars.map((bar) => (
                    <span
                      key={bar.id}
                      style={{
                        "--bar-height": `${bar.height}%`,
                        "--bar-delay": `${bar.delay}ms`,
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>

              <div className="audio-console__lyrics">
                <div className="audio-console__lyrics-header">
                  <div className="audio-console__lyrics-title">
                    <span>{t("app.music.lyricsTitle")}</span>
                    <strong>{currentTrackLabel}</strong>
                    <p>
                      {lyricsStatus === "manual"
                        ? t("app.music.uploadHint")
                        : t("app.music.lyricsHint")}
                    </p>
                  </div>
                  <div className="audio-console__lyrics-tools">
                    <span className={`audio-console__lyrics-source audio-status-${lyricsStatus}`}>{lyricsStatusLabel}</span>
                    <AppButton
                      className="audio-console__lyrics-action"
                      disabled={lyricsStatus === "loading"}
                      onClick={onRefreshLyrics}
                    >
                      <SearchIcon />
                      <span>{t("app.music.lyrics.search")}</span>
                    </AppButton>
                    <AppButton
                      className="audio-console__lyrics-action"
                      onClick={() => lyricsUploadInputRef.current?.click()}
                    >
                      <UploadIcon />
                      <span>{t("app.music.lyrics.upload")}</span>
                    </AppButton>
                    <AppFileInput ref={lyricsUploadInputRef}
                      accept=".lrc,.txt,text/plain"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void onUploadLyricsFile(file);
                        }
                        event.target.value = "";
                      }}
                    />
                  </div>
                </div>

                <div
                  className={`audio-console__lyrics-viewport ${
                    lyricsLines.length === 0 ? "audio-is-empty" : ""
                  }`}
                >
                  {lyricsLines.length === 0 ? (
                    <div className="audio-console__lyrics-empty" role="status">
                      <strong>{t("app.music.lyrics.fallback.line1")}</strong>
                      <span>{t("app.music.lyrics.fallback.line2")}</span>
                    </div>
                  ) : (
                    <div className="audio-console__lyrics-track" style={{ transform: lyricsTransform }}>
                      {lyricsLines.map((line, index) => (
                        <article
                          key={`${selectedTrackId || "track"}-lyric-${line.time}-${index}`}
                          className={`audio-console__lyric-line ${
                            index === activeLyricIndex ? "audio-is-active" : ""
                          } ${index < activeLyricIndex ? "audio-is-past" : ""}`}
                        >
                          <strong>{line.text}</strong>
                          {line.subtext ? <span>{line.subtext}</span> : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <footer className="audio-console__footer">
            <div className="audio-console__progress">
              <span>{formatDuration(currentTime)}</span>
              <AppSlider
                className="audio-console__range"
                min={0}
                max={Math.max(duration, 1)}
                step={0.1}
                value={progressValue}
                onChange={handleProgressChange}
                aria-label={t("app.music.miniPlayer.progress")}
                size="small"
              />
              <span>{formatDuration(duration)}</span>
            </div>

            <div className="audio-console__controls">
              <div className="audio-console__player-actions">
                <AppIconButton
                  className="audio-console__icon-button"
                  aria-label={t("app.music.previous")}
                  onClick={handlePlayPreviousTrack}
                  size="small"
                >
                  <PreviousIcon />
                </AppIconButton>
                <AppIconButton
                  className="audio-console__icon-button audio-is-primary"
                  aria-label={isPlaying ? t("app.music.pause") : t("app.music.play")}
                  onClick={handleTogglePlayback}
                  size="small"
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </AppIconButton>
                <AppIconButton
                  className="audio-console__icon-button"
                  aria-label={t("app.music.next")}
                  onClick={handlePlayNextTrack}
                  size="small"
                >
                  <NextIcon />
                </AppIconButton>
              </div>

              <div className="audio-console__secondary-actions">
                <AppIconButton
                  className="audio-console__mode-button"
                  aria-label={`${t("app.music.playMode")} ${t(playModeMeta.labelKey)}`}
                  onClick={handleCyclePlayMode}
                  size="small"
                >
                  <ModeIcon mode={playMode} />
                  <span>{playModeMeta.shortLabel}</span>
                </AppIconButton>
                <AppIconButton
                  className="audio-console__icon-button"
                  aria-label={t("app.music.restart")}
                  onClick={handleRestartTrack}
                  size="small"
                >
                  <ReplayIcon />
                </AppIconButton>
              </div>

              <label className="audio-console__volume">
                <VolumeIcon />
                <AppSlider
                  className="audio-console__range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={handleVolumeChange}
                  aria-label={t("app.music.volume")}
                  size="small"
                />
                <span>{volume}%</span>
              </label>
            </div>
          </footer>
        </div>

        <aside
          id="audio-console-library"
          className={`audio-console__library ${isLibraryOpen ? "audio-is-open" : "audio-is-collapsed"}`}
        >
          <div className="audio-console__library-head">
            <div>
              <span className="audio-eyebrow">{t("app.music.queueEyebrow")}</span>
              <h3>{t("app.music.queueTitle")}</h3>
            </div>
            <AppIconButton
              className="audio-console__library-close"
              onClick={() => setIsLibraryOpen(false)}
              aria-label={t("app.music.queueCollapse")}
              size="small"
            >
              <ChevronRightIcon />
            </AppIconButton>
          </div>

          <div className="audio-console__library-hint">
            <span>{t("app.music.trackCount", { count: localizedTracks.length })}</span>
            <p>{t("app.music.queueHint")}</p>
          </div>

          <div className="audio-console__library-list">
            {localizedTracks.length === 0 ? (
              <div className="audio-console__library-empty">{t("app.music.queueEmpty")}</div>
            ) : (
              localizedTracks.map((track, index) => (
                <AppButton
                  key={track.id}
                  className={`audio-console__track ${track.id === selectedTrackId ? "audio-is-active" : ""}`}
                  onClick={() => handleTrackPick(track.id)}
                >
                  <span className="audio-console__track-index">{String(index + 1).padStart(2, "0")}</span>
                  <img src={track.cover || coverSrc} alt={track.title} />
                  <div className="audio-console__track-copy">
                    <span className="audio-console__track-title">{track.title}</span>
                    <strong>{track.title}</strong>
                    <p>{track.artist}</p>
                  </div>
                  <div className="audio-console__track-meta">
                    <span
                      className={`audio-console__track-pulse ${
                        track.id === selectedTrackId && isPlaying ? "audio-is-playing" : ""
                      }`}
                    />
                    <span>{getTrackDurationLabel(track, index, selectedTrackId, duration)}</span>
                  </div>
                </AppButton>
              ))
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function getTrackDurationLabel(track, index, selectedTrackId, currentDuration) {
  if (track.id === selectedTrackId && currentDuration) {
    return formatDuration(currentDuration);
  }

  const lyricSet = TRACK_LYRICS[track.id];
  if (lyricSet?.length) {
    return formatDuration(lyricSet[lyricSet.length - 1].time + 16);
  }

  return formatDuration(188 + index * 13);
}

function buildCosmicDust({ particles, pulseLevel, isPlaying }: Record<string, any>) {
  const center = 200;
  const pulseRadiusBoost = isPlaying ? 5 * pulseLevel : 1;

  return particles.map((particle, index) => {
    const theta = particle.angle + index * 0.08;
    const orbitRadius = particle.radius + pulseRadiusBoost;
    const point = polarToCartesian(
      center,
      center,
      orbitRadius,
      theta
    );

    return {
      id: particle.id,
      x: point.x,
      y: point.y,
      r: particle.size * (0.84 + pulseLevel * 0.66),
      opacity: Math.min(particle.opacity + pulseLevel * 0.18, 0.72),
    };
  });
}

function polarToCartesian(cx, cy, radius, angle) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function pseudoRandom(seed) {
  const value = Math.sin(seed * 91.345 + 0.618) * 43758.5453123;
  return value - Math.floor(value);
}

function resolveParticleBudget(win) {
  const nav = win.navigator;
  const reducedMotion = win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const memory = Number(nav?.deviceMemory || 0);
  const cores = Number(nav?.hardwareConcurrency || 0);
  const width = Number(win.innerWidth || 0);

  if (reducedMotion) {
    return 32;
  }

  if ((memory && memory <= 4) || (cores && cores <= 4) || width <= 900) {
    return 56;
  }

  if ((memory && memory <= 8) || (cores && cores <= 8) || width <= 1280) {
    return 80;
  }

  return 110;
}

const CosmicDustRing = React.memo(function CosmicDustRing({
  isPlaying,
  particleCount,
  pulseLevel,
}: Record<string, any>) {
  const cosmicDust = React.useMemo(
    () =>
      buildCosmicDust({
        particles: COSMIC_DUST_PARTICLES.slice(0, particleCount),
        pulseLevel,
        isPlaying,

      }),
    [isPlaying, particleCount, pulseLevel]
  );

  return cosmicDust.map((particle) => (
    <circle
      key={particle.id}
      className="audio-console__particle-dot"
      cx={particle.x}
      cy={particle.y}
      r={particle.r}
      style={{
        opacity: particle.opacity,
      }}
    />
  ));
});

function resolveLyricsStatusLabel({ lyricsError, lyricsSource, lyricsStatus, t }) {
  if (lyricsStatus === "loading") {
    return t("app.music.lyrics.status.loading");
  }

  if (lyricsStatus === "cleared") {
    return t("app.music.lyrics.status.cleared");
  }

  if (lyricsError) {
    return lyricsError;
  }

  if (lyricsSource === "manual") {
    return t("app.music.lyrics.status.manual");
  }

  if (lyricsSource === "online") {
    return t("app.music.lyrics.status.cached");
  }

  return t("app.music.lyrics.status.fallback");
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6h3v12H8V6Zm5 0h3v12h-3V6Z" fill="currentColor" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6h2v12H6V6Zm11.5 1.2L9 12l8.5 4.8V7.2Z" fill="currentColor" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 6h2v12h-2V6ZM6.5 7.2 15 12l-8.5 4.8V7.2Z" fill="currentColor" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.4 9.6a6.7 6.7 0 1 0 .7 5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.1 5.5v4.2h-4.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 10h4l5-4v12l-5-4H4v-4Zm12.5-2.7a5 5 0 0 1 0 9.4v-1.9a3.2 3.2 0 0 0 0-5.6V7.3Zm2.5-3a8 8 0 0 1 0 15.4v-1.9a6.2 6.2 0 0 0 0-11.6V4.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m16.4 15 3.8 3.8-1.4 1.4-3.8-3.8a7 7 0 1 1 1.4-1.4ZM10 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4 7.5 8.6l1.4 1.4 2.1-2.1V15h2V7.9l2.1 2.1 1.4-1.4L12 4Zm-6 13h12v2H6v-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 5h2v14H5V5Zm4 0h2v14H9V5Zm4 2h2v12h-2V7Zm4-2h2v14h-2V5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9 6 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6L9 6Z" fill="currentColor" />
    </svg>
  );
}

function ModeIcon({ mode }) {
  if (mode === "single") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7.2 8.2h8.1c2.1 0 3.8 1.7 3.8 3.8s-1.7 3.8-3.8 3.8H6.1"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m8.2 12.9-3.1 2.9 3.1 2.9"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.9 7.1 15.2 6v6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (mode === "shuffle") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M16 6h5v5l-1.8-1.8-3.6 3.6-1.4-1.4 3.6-3.6L16 6Zm-8 0h3.5l7 7H21v2h-3.5l-7-7H8V6Zm6.2 6.8 1.4 1.4-4.1 4.1H8v-2h2.7l3.5-3.5ZM19.2 14.8 21 16.6v5h-5l1.8-1.8-2.1-2.1 1.4-1.4 2.1 2.1Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.1 7.2h8.2c2.1 0 3.8 1.7 3.8 3.8v.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m15.8 4.1 3.3 3.1-3.3 3.1"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.9 16.8H8.7c-2.1 0-3.8-1.7-3.8-3.8v-.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m8.2 19.9-3.3-3.1 3.3-3.1"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MusicWorkspace;






