import React from "react";
import { useI18n } from "../i18n";

const LYRIC_LINE_HEIGHT = 72;
const MOBILE_LIBRARY_BREAKPOINT = 1120;
const COSMIC_DUST_PARTICLES = Array.from({ length: 110 }, (_, index) => {
  const seed = pseudoRandom(index + 1);
  const secondary = pseudoRandom(index + 101);
  const tertiary = pseudoRandom(index + 301);
  return {
    id: `music-dust-${index}`,
    angle: seed * Math.PI * 2,
    radius: 126 + secondary * 44,
    size: 1.4 + tertiary * 3.8,
    speed: 0.18 + secondary * 0.72,
    drift: 6 + tertiary * 14,
    opacity: 0.24 + seed * 0.48,
  };
});

const TRACK_LYRICS = {
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

function MusicWorkspace({
  autoPlayOnReply,
  currentTime,
  duration,
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
  playerAudioElement,
  selectedTrack,
  selectedTrackId,
  setAutoPlayOnReply,
  setVolume,
  uploadInputRef,
  volume,
}) {
  const { t } = useI18n();
  const analysisRef = React.useRef({
    context: null,
    analyser: null,
    dataArray: null,
    source: null,
    hasBoundSource: false,
  });
  const animationFrameRef = React.useRef(0);
  const pulseLevelRef = React.useRef(0.2);
  const lastPulseCommitRef = React.useRef(0);
  const [isLibraryOpen, setIsLibraryOpen] = React.useState(false);
  const [particleCount, setParticleCount] = React.useState(() =>
    typeof window === "undefined" ? 80 : resolveParticleBudget(window)
  );
  const [pulseLevel, setPulseLevel] = React.useState(0.2);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth > MOBILE_LIBRARY_BREAKPOINT && localizedTracks.length > 0) {
        setIsLibraryOpen(true);
      }
      setParticleCount(resolveParticleBudget(window));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [localizedTracks.length]);

  const coverSrc = selectedTrack?.cover || localizedTracks[0]?.cover || "/reply-pulse-cover.jpg";
  const currentTrackLabel = selectedTrack?.title || t("app.music.noTrack");
  const currentArtistLabel = selectedTrack?.artist || t("app.music.noArtist");
  const progressValue = Math.min(currentTime, duration || 0);
  const sourceLabel =
    typeof selectedTrackId === "string" && selectedTrackId.startsWith("upload-")
      ? t("app.music.sourceUpload")
      : t("app.music.sourceBuiltIn");
  const playModeMeta = PLAY_MODE_META[playMode] || PLAY_MODE_META.loop;
  const activeLyricIndex = React.useMemo(() => {
    let index = 0;
    lyricsLines.forEach((line, lineIndex) => {
      if (currentTime >= line.time) {
        index = lineIndex;
      }
    });
    return index;
  }, [currentTime, lyricsLines]);
  const lyricsTransform = `translateY(calc(50% - ${
    activeLyricIndex * LYRIC_LINE_HEIGHT + LYRIC_LINE_HEIGHT / 2
  }px))`;
  const lyricsStatusLabel = resolveLyricsStatusLabel({ lyricsError, lyricsSource, lyricsStatus, t });

  React.useEffect(() => {
    if (!isPlaying) {
      pulseLevelRef.current = 0.18;
      setPulseLevel(0.18);
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      return undefined;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor || !playerAudioElement) {
      return undefined;
    }

    const analysis = analysisRef.current;

    try {
      if (!analysis.context) {
        analysis.context = new AudioContextCtor();
      }

      if (!analysis.analyser) {
        analysis.analyser = analysis.context.createAnalyser();
        analysis.analyser.fftSize = 128;
        analysis.analyser.smoothingTimeConstant = 0.84;
      }

      if (!analysis.hasBoundSource) {
        analysis.source = analysis.context.createMediaElementSource(playerAudioElement);
        analysis.source.connect(analysis.analyser);
        analysis.analyser.connect(analysis.context.destination);
        analysis.hasBoundSource = true;
      }

      if (!analysis.dataArray) {
        analysis.dataArray = new Uint8Array(analysis.analyser.frequencyBinCount);
      }

      if (analysis.context.state === "suspended") {
        void analysis.context.resume().catch(() => {});
      }
    } catch (error) {
      return undefined;
    }

    const tick = () => {
      const { analyser, dataArray } = analysisRef.current;
      if (!analyser || !dataArray) {
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      const bassWindow = dataArray.slice(0, 12);
      const average =
        bassWindow.reduce((sum, value) => sum + value, 0) / Math.max(bassWindow.length, 1);
      const normalized = Math.min(Math.max(average / 160, 0.14), 1);
      const nextPulse = pulseLevelRef.current * 0.58 + normalized * 0.42;

      pulseLevelRef.current = nextPulse;

      if (
        typeof performance !== "undefined" &&
        performance.now() - lastPulseCommitRef.current >= 40
      ) {
        lastPulseCommitRef.current = performance.now();
        setPulseLevel(nextPulse);
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [isPlaying, playerAudioElement]);

  React.useEffect(() => {
    if (analysisRef.current.hasBoundSource || !isPlaying) {
      return;
    }

    const nextPulse = 0.24 + ((Math.sin(currentTime * 6.2) + 1) / 2) * 0.22;
    pulseLevelRef.current = nextPulse;
    setPulseLevel(nextPulse);
  }, [currentTime, isPlaying]);

  function handleTrackPick(trackId) {
    handleSelectTrack(trackId);
    if (typeof window !== "undefined" && window.innerWidth <= MOBILE_LIBRARY_BREAKPOINT) {
      setIsLibraryOpen(false);
    }
  }

  return (
    <section className={`music-room theme-${selectedTrack?.theme || "ember"}`}>
      <div
        className="music-room__backdrop"
        style={{ backgroundImage: `url(${coverSrc})` }}
        aria-hidden="true"
      />
      <div className="music-room__scrim" aria-hidden="true" />

      <div className={`music-room__surface ${isLibraryOpen ? "is-library-open" : "is-library-collapsed"}`}>
        <button
          type="button"
          className={`music-room__library-toggle ${isLibraryOpen ? "is-open" : ""}`}
          onClick={() => setIsLibraryOpen((prev) => !prev)}
          aria-label={t("app.music.libraryToggle")}
        >
          <LibraryIcon />
          <span>{t("app.music.libraryToggle")}</span>
        </button>

        <div className="music-room__main">
          <header className="music-room__header">
            <div className="music-room__headline">
              <span className="eyebrow">{t("app.music.eyebrow")}</span>
              <h2>{t("app.music.panelTitle")}</h2>
              <p>{t("app.music.panelDescription")}</p>
            </div>

            <div className="music-room__meta">
              <span className="music-room__chip">{sourceLabel}</span>
              <span className={`music-room__chip ${isPlaying ? "is-live" : ""}`}>
                {isPlaying ? t("app.music.playing") : t("app.music.paused")}
              </span>
              <span className="music-room__chip">{t(playModeMeta.labelKey)}</span>
              <label className="music-room__sync">
                <span>{t("app.sound.autoPlay")}</span>
                <button
                  type="button"
                  className={`toggle-pill ${autoPlayOnReply ? "is-on" : ""}`}
                  onClick={() => setAutoPlayOnReply((prev) => !prev)}
                >
                  <span />
                </button>
              </label>
              <button
                type="button"
                className="music-room__utility"
                onClick={() => uploadInputRef.current?.click()}
              >
                <UploadIcon />
                <span>{t("app.music.upload")}</span>
              </button>
            </div>
          </header>

          <div className="music-room__stage">
            <div className="music-room__turntable" style={{ "--music-pulse-level": pulseLevel }}>
              <div className="music-room__plinth" aria-hidden="true">
                <span className="music-room__plinth-mark music-room__plinth-mark--left" />
                <span className="music-room__plinth-mark music-room__plinth-mark--right" />
              </div>
              <span className="music-room__arm-base" aria-hidden="true" />
              <span className={`music-room__needle ${isPlaying ? "is-playing" : ""}`} aria-hidden="true" />
              <div className="music-room__disc-stage">
                <svg
                  className="music-room__particle-ring"
                  viewBox="0 0 400 400"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="music-room-dust-gradient" cx="50%" cy="50%" r="50%">
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

                <div className={`music-room__vinyl ${isPlaying ? "is-spinning" : ""}`}>
                  <span className="music-room__vinyl-ring" aria-hidden="true" />
                  <span className="music-room__vinyl-ring is-inner" aria-hidden="true" />
                  <img src={coverSrc} alt={currentTrackLabel || t("app.music.trackCover")} />
                  <span className="music-room__vinyl-shine" aria-hidden="true" />
                  <span className="music-room__vinyl-core" aria-hidden="true" />
                </div>
              </div>

              <div className="music-room__turntable-copy">
                <strong>{currentTrackLabel}</strong>
                <p>{currentArtistLabel}</p>
              </div>
            </div>

            <div className="music-room__content">
              <div className="music-room__trackline">
                <div className="music-room__track-copy">
                  <span className="eyebrow">{t("app.music.nowPlaying")}</span>
                  <h3>{currentTrackLabel}</h3>
                  <p>{currentArtistLabel}</p>
                </div>

                <div className="music-room__facts">
                  <span>{t("app.music.currentLabel")} {formatDuration(currentTime)}</span>
                  <span>{t("app.music.durationLabel")} {formatDuration(duration)}</span>
                  <span>{t("app.music.volume")} {volume}%</span>
                </div>
              </div>

                <div className="music-room__lyrics">
                <div className="music-room__lyrics-header">
                  <div className="music-room__lyrics-title">
                    <span>{t("app.music.lyricsTitle")}</span>
                    <strong>{currentTrackLabel}</strong>
                  </div>
                  <div className="music-room__lyrics-tools">
                    <span className={`music-room__lyrics-source is-${lyricsStatus}`}>{lyricsStatusLabel}</span>
                    <button
                      type="button"
                      className="music-room__lyrics-action"
                      disabled={lyricsStatus === "loading"}
                      onClick={onRefreshLyrics}
                    >
                      <SearchIcon />
                      <span>{t("app.music.lyrics.search")}</span>
                    </button>
                    <button
                      type="button"
                      className="music-room__lyrics-action"
                      onClick={() => lyricsUploadInputRef.current?.click()}
                    >
                      <UploadIcon />
                      <span>{t("app.music.lyrics.upload")}</span>
                    </button>
                    <input
                      ref={lyricsUploadInputRef}
                      className="upload-input"
                      type="file"
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

                <div className="music-room__lyrics-viewport">
                  <div className="music-room__lyrics-track" style={{ transform: lyricsTransform }}>
                    {lyricsLines.map((line, index) => (
                      <article
                        key={`${selectedTrackId || "track"}-lyric-${line.time}-${index}`}
                        className={`music-room__lyric-line ${
                          index === activeLyricIndex ? "is-active" : ""
                        } ${index < activeLyricIndex ? "is-past" : ""}`}
                      >
                        <strong>{line.text}</strong>
                        {line.subtext ? <span>{line.subtext}</span> : null}
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="music-room__footer">
            <div className="music-room__progress">
              <span>{formatDuration(currentTime)}</span>
              <input
                className="music-room__range"
                type="range"
                min="0"
                max={Math.max(duration, 1)}
                step="0.1"
                value={progressValue}
                onChange={handleSeek}
              />
              <span>{formatDuration(duration)}</span>
            </div>

            <div className="music-room__controls">
              <div className="music-room__player-actions">
                <button
                  type="button"
                  className="music-room__icon-button"
                  aria-label={t("app.music.previous")}
                  onClick={handlePlayPreviousTrack}
                >
                  <PreviousIcon />
                </button>
                <button
                  type="button"
                  className="music-room__icon-button is-primary"
                  aria-label={isPlaying ? t("app.music.pause") : t("app.music.play")}
                  onClick={handleTogglePlayback}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button
                  type="button"
                  className="music-room__icon-button"
                  aria-label={t("app.music.next")}
                  onClick={handlePlayNextTrack}
                >
                  <NextIcon />
                </button>
              </div>

              <div className="music-room__secondary-actions">
                <button
                  type="button"
                  className="music-room__mode-button"
                  aria-label={`${t("app.music.playMode")} ${t(playModeMeta.labelKey)}`}
                  onClick={handleCyclePlayMode}
                >
                  <ModeIcon mode={playMode} />
                  <span>{playModeMeta.shortLabel}</span>
                </button>
                <button
                  type="button"
                  className="music-room__icon-button"
                  aria-label={t("app.music.restart")}
                  onClick={handleRestartTrack}
                >
                  <ReplayIcon />
                </button>
              </div>

              <label className="music-room__volume">
                <VolumeIcon />
                <input
                  className="music-room__range"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                />
                <span>{volume}%</span>
              </label>
            </div>
          </footer>
        </div>

        <aside className={`music-room__library ${isLibraryOpen ? "is-open" : "is-collapsed"}`}>
          <div className="music-room__library-head">
            <div>
              <span className="eyebrow">{t("app.music.queueEyebrow")}</span>
              <h3>{t("app.music.queueTitle")}</h3>
            </div>
            <button
              type="button"
              className="music-room__library-close"
              onClick={() => setIsLibraryOpen(false)}
              aria-label={t("app.music.queueCollapse")}
            >
              <ChevronRightIcon />
            </button>
          </div>

          <div className="music-room__library-hint">
            <span>{t("app.music.trackCount", { count: localizedTracks.length })}</span>
            <p>{t("app.music.queueHint")}</p>
          </div>

          <div className="music-room__library-list">
            {localizedTracks.length === 0 ? (
              <div className="music-room__library-empty">{t("app.music.queueEmpty")}</div>
            ) : (
              localizedTracks.map((track, index) => (
                <button
                  key={track.id}
                  type="button"
                  className={`music-room__track ${track.id === selectedTrackId ? "is-active" : ""}`}
                  onClick={() => handleTrackPick(track.id)}
                >
                  <span className="music-room__track-index">{String(index + 1).padStart(2, "0")}</span>
                  <img src={track.cover || coverSrc} alt={track.title} />
                  <div className="music-room__track-copy">
                    <span className="music-room__track-title">{track.title}</span>
                    <strong>{track.title}</strong>
                    <p>{track.artist}</p>
                  </div>
                  <div className="music-room__track-meta">
                    <span
                      className={`music-room__track-pulse ${
                        track.id === selectedTrackId && isPlaying ? "is-playing" : ""
                      }`}
                    />
                    <span>{getTrackDurationLabel(track, index, selectedTrackId, duration)}</span>
                  </div>
                </button>
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

function buildCosmicDust({ particles, pulseLevel, isPlaying, currentTime }) {
  const center = 200;
  const pulseRadiusBoost = isPlaying ? 10 * pulseLevel : 2;

  return particles.map((particle, index) => {
    const theta = particle.angle + currentTime * particle.speed;
    const breathe = Math.sin(currentTime * 4.8 + index * 0.73);
    const orbitRadius = particle.radius + breathe * particle.drift * (0.4 + pulseLevel * 0.5) + pulseRadiusBoost;
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
      opacity: Math.min(particle.opacity + pulseLevel * 0.22 + (breathe + 1) * 0.06, 0.92),
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

const CosmicDustRing = React.memo(function CosmicDustRing({ isPlaying, particleCount, pulseLevel }) {
  const frameRef = React.useRef(0);
  const startTimeRef = React.useRef(0);
  const [animationTime, setAnimationTime] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (!isPlaying) {
      startTimeRef.current = 0;
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      return undefined;
    }

    const step = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      setAnimationTime((timestamp - startTimeRef.current) / 1000);
      frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);

    return () => {
      startTimeRef.current = 0;
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [isPlaying]);

  const cosmicDust = React.useMemo(
    () =>
      buildCosmicDust({
        particles: COSMIC_DUST_PARTICLES.slice(0, particleCount),
        pulseLevel,
        isPlaying,
        currentTime: animationTime,
      }),
    [animationTime, isPlaying, particleCount, pulseLevel]
  );

  return cosmicDust.map((particle) => (
    <circle
      key={particle.id}
      className="music-room__particle-dot"
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
        d="M12 6a6 6 0 0 1 5.2 3H14v2h7V4h-2v3.1A8 8 0 1 0 20 12h-2a6 6 0 1 1-6-6Z"
        fill="currentColor"
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
          d="M17 17H7l2.4 2.4L8 20.8 3.2 16 8 11.2l1.4 1.4L7 15h10V7h2v10c0 1.1-.9 2-2 2Z"
          fill="currentColor"
        />
        <path d="M15 6h1.2v5H15V7.7l-1 .5-.5-1 1.5-.7Z" fill="currentColor" />
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
        d="M17 17H7l2.4 2.4L8 20.8 3.2 16 8 11.2l1.4 1.4L7 15h10V7h2v10ZM7 7h10l-2.4-2.4L16 3.2 20.8 8 16 12.8l-1.4-1.4L17 9H7v8H5V7c0-1.1.9-2 2-2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default MusicWorkspace;
