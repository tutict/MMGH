import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BUILT_IN_TRACKS, localizeTracks, type MusicTrack } from "../music/tracks";
import { normalizeError } from "../utils/appUtils";
import {
  fetchLyricsFromLrclib,
  getLyricsCacheEntryKey,
  mergeLyricsLookupStateFromCache,
  normalizeLyricsError,
  readLyricsCache,
  readLyricsCacheClearMarker,
  resolveLyricsLines,
  updateStoredLyricsCache,
  writeLyricsCacheClearMarker,
} from "../utils/lyrics";
import { patchPlaybackSnapshot, resetPlaybackSnapshot } from "../utils/playbackSnapshot";

export function useMusicController({ activeSession, currentView, isAppVisible, setError, t }) {
  const [tracks, setTracks] = useState<MusicTrack[]>(BUILT_IN_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState(BUILT_IN_TRACKS[0].id);
  const [autoPlayOnReply, setAutoPlayOnReply] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(72);
  const [playMode, setPlayMode] = useState("loop");
  const [playerAudioElement, setPlayerAudioElement] = useState(null);
  const [lyricsCache, setLyricsCache] = useState(() => readLyricsCache());
  const [lyricsCacheClearMarker, setLyricsCacheClearMarker] = useState(() => readLyricsCacheClearMarker());
  const [lyricsLookupState, setLyricsLookupState] = useState({});
  const localizedTracks = useMemo(() => localizeTracks(tracks, t), [t, tracks]);
  const audioRef = useRef(null);
  const uploadInputRef = useRef(null);
  const lyricsUploadInputRef = useRef(null);
  const lastAutoPlayedReplyRef = useRef(null);
  const uploadedTrackUrlsRef = useRef(new Set());
  const lyricsRequestVersionRef = useRef({});
  const resolveAdjacentTrackId = useCallback((direction = 1, mode = playMode) => {
    if (tracks.length === 0) {
      return "";
    }

    const currentIndex = tracks.findIndex((track) => track.id === selectedTrackId);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    if (mode === "shuffle") {
      if (tracks.length === 1) {
        return tracks[0].id;
      }

      const candidates = tracks.filter((track) => track.id !== tracks[safeIndex].id);
      return candidates[Math.floor(Math.random() * candidates.length)]?.id || tracks[safeIndex].id;
    }

    const nextIndex = (safeIndex + direction + tracks.length) % tracks.length;
    return tracks[nextIndex]?.id || tracks[0].id;
  }, [playMode, selectedTrackId, tracks]);
  const updateLyricsCache = useCallback((updater) => {
    try {
      const nextLyricsCache = updateStoredLyricsCache(updater);
      setLyricsCache(nextLyricsCache);
      return { ok: true, value: nextLyricsCache };
    } catch (err) {
      setError(t("app.settings.cache.writeFailed", { detail: normalizeError(err) }));
      return { ok: false, value: null };
    }
  }, [setError, t]);
  const syncLyricsClearMarkerFromStorage = useCallback(() => {
    setLyricsCacheClearMarker(readLyricsCacheClearMarker());
  }, []);
  const syncLyricsCacheFromStorage = useCallback(() => {
    const nextLyricsCache = readLyricsCache();
    setLyricsCache(nextLyricsCache);
    setLyricsLookupState((prev) =>
      mergeLyricsLookupStateFromCache({
        cache: nextLyricsCache,
        previousState: prev,
        trackList: localizedTracks,
      })
    );
  }, [localizedTracks]);
  useEffect(() => {
    if (audioRef.current) {
      setPlayerAudioElement(audioRef.current);
    }
  }, [selectedTrackId]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const nextUrls = new Set<string>(
      tracks
        .map((track) => track?.src)
        .filter((src) => typeof src === "string" && src.startsWith("blob:"))
    );

    uploadedTrackUrlsRef.current.forEach((url: string) => {
      if (!nextUrls.has(url)) {
        window.URL.revokeObjectURL(url);
      }
    });

    uploadedTrackUrlsRef.current = nextUrls;

    return undefined;
  }, [tracks]);
  useEffect(
    () => () => {
      if (typeof window === "undefined") {
        return;
      }
      uploadedTrackUrlsRef.current.forEach((url: string) => {
        window.URL.revokeObjectURL(url);
      });
      uploadedTrackUrlsRef.current.clear();
    },
    []
  );
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    const syncDuration = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration((previousDuration) =>
        previousDuration === nextDuration ? previousDuration : nextDuration
      );
      patchPlaybackSnapshot({ duration: nextDuration });
    };
    const handleTimeUpdate = () => {
      if (!isAppVisible) {
        return;
      }

      patchPlaybackSnapshot({ currentTime: audio.currentTime || 0 });
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      const nextTrackId =
        playMode === "single" ? selectedTrackId : resolveAdjacentTrackId(1, playMode);

      if (!nextTrackId) {
        setIsPlaying(false);
        patchPlaybackSnapshot({ currentTime: 0 });
        return;
      }

      if (nextTrackId === selectedTrackId) {
        audio.currentTime = 0;
        patchPlaybackSnapshot({ currentTime: 0 });
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
        return;
      }

      setIsPlaying(true);
      setSelectedTrackId(nextTrackId);
    };

    syncDuration();
    if (isAppVisible) {
      patchPlaybackSnapshot({ currentTime: audio.currentTime || 0 });
    }
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("seeking", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("seeking", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isAppVisible, playMode, resolveAdjacentTrackId, selectedTrackId, tracks]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = volume / 100;
  }, [volume]);
  const selectedTrackSource = tracks.find((track) => track.id === selectedTrackId) || tracks[0] || null;
  const selectedTrack =
    localizedTracks.find((track) => track.id === selectedTrackId) || localizedTracks[0] || null;
  const selectedTrackLyricsEntry = selectedTrack
    ? lyricsCache[getLyricsCacheEntryKey(selectedTrack, duration)]
    : null;
  const selectedTrackLyrics = useMemo(
    () =>
      resolveLyricsLines({
        duration,
        entry: selectedTrackLyricsEntry,
        fallbackArtist: selectedTrack?.artist || t("app.music.noArtist"),
        fallbackTitle: selectedTrack?.title || t("app.music.noTrack"),
        t,
      }),
    [duration, selectedTrackLyricsEntry, selectedTrack?.artist, selectedTrack?.title, t]
  );
  const selectedTrackLyricsStatus = selectedTrackId
    ? lyricsLookupState[selectedTrackId]?.status || "idle"
    : "idle";
  const selectedTrackLyricsError = selectedTrackId
    ? lyricsLookupState[selectedTrackId]?.error || ""
    : "";
  const selectedTrackLyricsSource = selectedTrackLyricsEntry?.source || "";
  const showMiniPlayer = currentView !== "music" && Boolean(selectedTrackSource);
  function handleSelectTrack(trackId) {
    const audio = audioRef.current;
    if (!trackId) {
      return;
    }

    if (trackId === selectedTrackId) {
      if (audio?.paused) {
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
      }
      return;
    }

    setIsPlaying(true);
    setSelectedTrackId(trackId);
  }
  function handlePlayPreviousTrack() {
    if ((audioRef.current?.currentTime || 0) > 3 && playMode !== "shuffle") {
      handleRestartTrack();
      return;
    }

    handleSelectTrack(resolveAdjacentTrackId(-1));
  }
  function handlePlayNextTrack() {
    handleSelectTrack(resolveAdjacentTrackId(1));
  }
  function handleCyclePlayMode() {
    setPlayMode((prev) => {
      if (prev === "loop") {
        return "single";
      }
      if (prev === "single") {
        return "shuffle";
      }
      return "loop";
    });
  }
  const bumpLyricsRequestVersion = useCallback((trackId) => {
    if (!trackId) {
      return 0;
    }

    const nextVersion = (lyricsRequestVersionRef.current[trackId] || 0) + 1;
    lyricsRequestVersionRef.current[trackId] = nextVersion;
    return nextVersion;
  }, []);
  const invalidateAllLyricsRequestVersions = useCallback(() => {
    const nextVersions = {};
    Object.entries(lyricsRequestVersionRef.current).forEach(([trackId, version]) => {
      nextVersions[trackId] = Number(version || 0) + 1;
    });
    if (selectedTrackId) {
      nextVersions[selectedTrackId] = Number(nextVersions[selectedTrackId] || 0) + 1;
    }
    lyricsRequestVersionRef.current = nextVersions;
  }, [selectedTrackId]);
  const handleRefreshLyrics = useCallback(async (options: { force?: boolean; initiatedBy?: string }  = {}) => {
    const track = selectedTrack;
    if (!track) {
      return;
    }

    const initiatedBy = options.initiatedBy || "manual";
    if (initiatedBy === "auto" && lyricsCacheClearMarker) {
      return;
    }

    const requestVersion = bumpLyricsRequestVersion(track.id);
    const cacheKey = getLyricsCacheEntryKey(track, duration);
    const cacheEntry = lyricsCache[cacheKey];
    if (!options.force && cacheEntry?.source && cacheEntry?.fingerprint === cacheKey) {
      return;
    }

    setLyricsLookupState((prev) => ({
      ...prev,
      [track.id]: { status: "loading", error: "" },
    }));

    try {
      const response = await fetchLyricsFromLrclib({
        artist: track.artist,
        duration,
        title: track.title,
      });

      const cacheUpdate = updateLyricsCache((prev) => {
        if (
          lyricsRequestVersionRef.current[track.id] !== requestVersion ||
          prev[cacheKey]?.source === "manual"
        ) {
          return prev;
        }

        return {
          ...prev,
          [cacheKey]: {
            artist: track.artist,
            fetchedAt: Date.now(),
            fingerprint: cacheKey,
            plainLyrics: response.plainLyrics || "",
            source: "online",
            syncedLyrics: response.syncedLyrics || "",
            title: track.title,
          },
        };
      });
      if (!cacheUpdate.ok) {
        setLyricsLookupState((prev) => {
          if (lyricsRequestVersionRef.current[track.id] !== requestVersion) {
            return prev;
          }

          return {
            ...prev,
            [track.id]: {
              status: "error",
              error: t("app.settings.cache.writeFailed", {
                detail: "Lyrics cache update failed",
              }),
            },
          };
        });
        return;
      }
      if (lyricsCacheClearMarker) {
        setLyricsCacheClearMarker("");
        try {
          writeLyricsCacheClearMarker("");
        } catch (error) {
          setError(t("app.settings.cache.writeFailed", { detail: normalizeError(error) }));
        }
      }
      setLyricsLookupState((prev) => {
        if (lyricsRequestVersionRef.current[track.id] !== requestVersion) {
          return prev;
        }

        return {
          ...prev,
          [track.id]: { status: "ready", error: "" },
        };
      });
    } catch (error) {
      setLyricsLookupState((prev) => {
        if (lyricsRequestVersionRef.current[track.id] !== requestVersion) {
          return prev;
        }

        return {
          ...prev,
          [track.id]: {
            status: "error",
            error: normalizeLyricsError(error, t),
          },
        };
      });
    }
  }, [
    bumpLyricsRequestVersion,
    duration,
    lyricsCache,
    lyricsCacheClearMarker,
    selectedTrack,
    setError,
    t,
    updateLyricsCache,
  ]);
  async function handleUploadLyricsFile(file) {
    if (!selectedTrack || !file) {
      return;
    }

    try {
      bumpLyricsRequestVersion(selectedTrack.id);
      const text = await file.text();
      const cacheKey = getLyricsCacheEntryKey(selectedTrack, duration);
      const cacheUpdate = updateLyricsCache((prev) => ({
        ...prev,
        [cacheKey]: {
          artist: selectedTrack.artist,
          fetchedAt: Date.now(),
          fingerprint: cacheKey,
          plainLyrics: text,
          source: "manual",
          syncedLyrics: text,
          title: selectedTrack.title,
        },
      }));
      if (!cacheUpdate.ok) {
        setLyricsLookupState((prev) => ({
          ...prev,
          [selectedTrack.id]: {
            status: "error",
            error: t("app.settings.cache.writeFailed", {
              detail: "Lyrics cache update failed",
            }),
          },
        }));
        return;
      }
      if (lyricsCacheClearMarker) {
        setLyricsCacheClearMarker("");
        try {
          writeLyricsCacheClearMarker("");
        } catch (error) {
          setError(t("app.settings.cache.writeFailed", { detail: normalizeError(error) }));
        }
      }
      setLyricsLookupState((prev) => ({
        ...prev,
        [selectedTrack.id]: { status: "manual", error: "" },
      }));
    } catch (error) {
      setLyricsLookupState((prev) => ({
        ...prev,
        [selectedTrack.id]: {
          status: "error",
          error: normalizeLyricsError(error, t),
        },
      }));
    }
  }
  const lastAssistantMessageId = useMemo(() => {
    const lastMessage = activeSession?.messages?.[activeSession.messages.length - 1];
    return lastMessage?.role === "assistant" ? lastMessage.id : null;
  }, [activeSession]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedTrackSource) {
      return;
    }

    const shouldResume = isPlaying;
    audio.load();
    setDuration(0);
    resetPlaybackSnapshot();

    if (shouldResume) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [isPlaying, selectedTrackId, selectedTrackSource]);
  useEffect(() => {
    if (currentView !== "music") {
      return;
    }

    if (!selectedTrack) {
      return;
    }

    const cacheKey = getLyricsCacheEntryKey(selectedTrack, duration);
    const cacheEntry = lyricsCache[cacheKey];
    if (cacheEntry?.source && cacheEntry?.fingerprint === cacheKey) {
      return;
    }

    if (
      lyricsLookupState[selectedTrack.id]?.status === "loading" ||
      lyricsLookupState[selectedTrack.id]?.status === "cleared" ||
      lyricsLookupState[selectedTrack.id]?.status === "error"
    ) {
      return;
    }

    void handleRefreshLyrics({ force: true, initiatedBy: "auto" });
  }, [currentView, duration, handleRefreshLyrics, lyricsCache, lyricsLookupState, selectedTrack, selectedTrackId]);
  useEffect(() => {
    if (!autoPlayOnReply || !lastAssistantMessageId) {
      return;
    }
    if (lastAutoPlayedReplyRef.current === lastAssistantMessageId) {
      return;
    }

    lastAutoPlayedReplyRef.current = lastAssistantMessageId;
    const audio = audioRef.current;
    if (!audio || !selectedTrack) {
      return;
    }

    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, [autoPlayOnReply, lastAssistantMessageId, selectedTrack, selectedTrackId]);
  function handleTogglePlayback() {
    const audio = audioRef.current;
    if (!audio || !selectedTrack) {
      return;
    }

    if (audio.paused) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
      return;
    }

    audio.pause();
  }
  function handleRestartTrack() {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = 0;
    patchPlaybackSnapshot({ currentTime: 0 });
    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  }
  function handleSeek(event) {
    const nextValue = Number(event.target.value);
    patchPlaybackSnapshot({ currentTime: nextValue });
    if (audioRef.current) {
      audioRef.current.currentTime = nextValue;
    }
  }
  function handleUploadTracks(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) {
      return;
    }

    const uploadedTracks = files.map((file) => ({
      id: `upload-${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: t("app.music.uploadedArtist"),
      src: URL.createObjectURL(file),
      cover: selectedTrack?.cover || BUILT_IN_TRACKS[0].cover,
      theme: "custom",
    }));

    setTracks((prev) => [...uploadedTracks, ...prev]);
    setSelectedTrackId(uploadedTracks[0].id);
    event.target.value = "";
  }

  const audioSlot = (
    <audio ref={audioRef} preload="metadata">
      {selectedTrackSource ? <source src={selectedTrackSource.src} type="audio/mpeg" /> : null}
    </audio>
  );
  return {
    audioSlot, autoPlayOnReply, duration, handleCyclePlayMode, handlePlayNextTrack, handlePlayPreviousTrack,
    handleRefreshLyrics, handleRestartTrack, handleSeek, handleSelectTrack, handleTogglePlayback,
    handleUploadLyricsFile, handleUploadTracks, invalidateAllLyricsRequestVersions, isPlaying, localizedTracks,
    lyricsCache, lyricsCacheClearMarker, lyricsLookupState, lyricsUploadInputRef, playMode, playerAudioElement,
    selectedTrack, selectedTrackId, selectedTrackLyrics, selectedTrackLyricsError, selectedTrackLyricsSource,
    selectedTrackLyricsStatus, selectedTrackSource, setAutoPlayOnReply, setLyricsCache, setLyricsCacheClearMarker,
    setLyricsLookupState, setVolume, showMiniPlayer, syncLyricsCacheFromStorage, syncLyricsClearMarkerFromStorage,
    tracks, uploadInputRef, volume,
  };
}
