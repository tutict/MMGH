import React, { useEffect, useMemo, useRef, useState } from "react";
import "./CSS/App.css";
import {
  bootstrap,
  createReminder,
  createSkill,
  createKnowledgeNote,
  createSession,
  deleteReminder,
  deleteSkill,
  deleteKnowledgeNote,
  deleteSession,
  openKnowledgeNote,
  openSkill,
  openSession,
  runAgent,
  forgeSkill,
  saveSessionSkills,
  saveReminder,
  saveSkill,
  saveKnowledgeNote,
  saveSettings,
} from "./storage/agent";
import GalleryWorkspace from "./components/GalleryWorkspace";
import MiniPlayerBar from "./components/MiniPlayerBar";
import MusicWorkspace from "./components/MusicWorkspace";
import ReminderWorkspace from "./components/ReminderWorkspace";
import SettingsWorkspace from "./components/SettingsWorkspace";
import SkillWorkspace from "./components/SkillWorkspace";
import WeatherWorkspace, {
  WEATHER_LOCATIONS,
  createInitialWeatherCities,
  fetchWeatherSnapshots,
} from "./components/WeatherWorkspace";
import { useI18n } from "./i18n";

const BUILT_IN_TRACKS = [
  {
    id: "builtin-reply-pulse",
    titleKey: "app.music.builtin.replyPulse.title",
    artistKey: "app.music.builtin.artist",
    src: "/reply-pulse.mp3",
    cover: "/reply-pulse-cover.jpg",
    theme: "ember",
  },
  {
    id: "builtin-neon-orbit",
    titleKey: "app.music.builtin.neonOrbit.title",
    artistKey: "app.music.builtin.artist",
    src: "/reply-pulse.mp3",
    cover: "/neon-orbit-cover.jpg",
    theme: "ice",
  },
];

const GALLERY_STORAGE_KEY = "mmgh-gallery-v1";
const LEGACY_ALBUM_STORAGE_KEY = "mmgh.album.photos.v1";
const WEATHER_LOCATIONS_STORAGE_KEY = "mmgh-weather-locations-v1";
const WEATHER_RECENT_SEARCHES_STORAGE_KEY = "mmgh-weather-recent-searches-v1";
const WEATHER_USAGE_STORAGE_KEY = "mmgh-weather-usage-v1";
const SKILL_HISTORY_STORAGE_KEY = "mmgh-skill-history-v1";
const LYRICS_CACHE_STORAGE_KEY = "mmgh-lyrics-cache-v1";
const MAX_SKILL_HISTORY_ENTRIES = 24;

const EMPTY_REMINDER_DRAFT = {
  id: 0,
  title: "",
  detail: "",
  dueAt: "",
  severity: "medium",
  status: "scheduled",
  linkedNoteId: "",
};

const EMPTY_SKILL_DRAFT = {
  id: 0,
  name: "",
  description: "",
  instructions: "",
  triggerHint: "",
  enabled: true,
};

function App() {
  const { lang, setLang, t } = useI18n();
  const [workspace, setWorkspace] = useState(null);
  const [currentView, setCurrentView] = useState("agent");
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const savedTheme = window.localStorage.getItem("mmgh-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [settingsForm, setSettingsForm] = useState({
    providerName: "OpenAI Compatible",
    baseUrl: "",
    apiKey: "",
    model: "",
    systemPrompt: "",
  });
  const [noteDraft, setNoteDraft] = useState({
    id: 0,
    icon: "*",
    title: "",
    body: "",
    tagsText: "",
  });
  const [noteSearch, setNoteSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [reminderDraft, setReminderDraft] = useState({ ...EMPTY_REMINDER_DRAFT });
  const [reminderSearch, setReminderSearch] = useState("");
  const [selectedReminderId, setSelectedReminderId] = useState(0);
  const [skillDraft, setSkillDraft] = useState({ ...EMPTY_SKILL_DRAFT });
  const [skillSearch, setSkillSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [isSessionLibraryCollapsed, setIsSessionLibraryCollapsed] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState("runtime");
  const [collapsedSessionGroups, setCollapsedSessionGroups] = useState({});
  const [collapsedSessionPreviews, setCollapsedSessionPreviews] = useState({});
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [galleryItems, setGalleryItems] = useState(() => readGalleryItems());
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [galleryViewerId, setGalleryViewerId] = useState("");
  const [weatherLocations, setWeatherLocations] = useState(() => readWeatherLocations());
  const [selectedWeatherCityId, setSelectedWeatherCityId] = useState(() => readWeatherLocations()[0]?.id || WEATHER_LOCATIONS[0].id);
  const [weatherCities, setWeatherCities] = useState(() => createInitialWeatherCities(readWeatherLocations()));
  const [weatherStatus, setWeatherStatus] = useState("loading");
  const [weatherError, setWeatherError] = useState("");
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState(0);
  const [tracks, setTracks] = useState(BUILT_IN_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState(BUILT_IN_TRACKS[0].id);
  const [autoPlayOnReply, setAutoPlayOnReply] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(72);
  const [playMode, setPlayMode] = useState("loop");
  const [playerAudioElement, setPlayerAudioElement] = useState(null);
  const [skillHistoryMap, setSkillHistoryMap] = useState(() => readSkillHistory());
  const [lyricsCache, setLyricsCache] = useState(() => readLyricsCache());
  const [lyricsLookupState, setLyricsLookupState] = useState({});

  const localizedTracks = useMemo(
    () =>
      tracks.map((track) => ({
        ...track,
        title: track.titleKey ? t(track.titleKey) : track.title,
        artist: track.artistKey ? t(track.artistKey) : track.artist,
      })),
    [t, tracks]
  );

  const audioRef = useRef(null);
  const uploadInputRef = useRef(null);
  const galleryUploadInputRef = useRef(null);
  const skillImportInputRef = useRef(null);
  const lyricsUploadInputRef = useRef(null);
  const lastAutoPlayedReplyRef = useRef(null);
  const triggeredRemindersRef = useRef(new Set());

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      setPlayerAudioElement(audioRef.current);
    }
  }, [selectedTrackId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadWeatherSnapshots(weatherLocations, controller.signal);
    return () => controller.abort();
  }, [weatherLocations]);

  useEffect(() => {
    if (workspace?.settings) {
      setSettingsForm(workspace.settings);
    }
    if (workspace?.activeNote) {
      setNoteDraft({
        id: workspace.activeNote.id,
        icon: workspace.activeNote.icon || "*",
        title: workspace.activeNote.title || "",
        body: workspace.activeNote.body || "",
        tagsText: (workspace.activeNote.tags || []).join(", "),
      });
    }
    if (workspace?.activeSkill) {
      setSkillDraft({
        id: workspace.activeSkill.id,
        name: workspace.activeSkill.name || "",
        description: workspace.activeSkill.description || "",
        instructions: workspace.activeSkill.instructions || "",
        triggerHint: workspace.activeSkill.triggerHint || "",
        enabled: Boolean(workspace.activeSkill.enabled),
      });
    } else {
      setSkillDraft({ ...EMPTY_SKILL_DRAFT });
    }
  }, [workspace]);

  useEffect(() => {
    writeGalleryItems(galleryItems);
  }, [galleryItems]);

  useEffect(() => {
    writeWeatherLocations(weatherLocations);
  }, [weatherLocations]);

  useEffect(() => {
    writeSkillHistory(skillHistoryMap);
  }, [skillHistoryMap]);

  useEffect(() => {
    writeLyricsCache(lyricsCache);
  }, [lyricsCache]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mmgh-theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(
    () => {
      if (!isInspectorOpen && !isMobileNavOpen) {
        return undefined;
      }

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          setIsInspectorOpen(false);
          setIsMobileNavOpen(false);
        }
      };

      const previousOverflow =
        typeof document !== "undefined" ? document.body.style.overflow : "";

      if (typeof document !== "undefined") {
        document.body.style.overflow = "hidden";
      }
      if (typeof window !== "undefined") {
        window.addEventListener("keydown", handleKeyDown);
      }

      return () => {
        if (typeof document !== "undefined") {
          document.body.style.overflow = previousOverflow;
        }
        if (typeof window !== "undefined") {
          window.removeEventListener("keydown", handleKeyDown);
        }
      };
    },
    [isInspectorOpen, isMobileNavOpen]
  );

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentView]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    const syncState = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      const nextTrackId =
        playMode === "single" ? selectedTrackId : resolveAdjacentTrackId(1, playMode);

      if (!nextTrackId) {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }

      if (nextTrackId === selectedTrackId) {
        audio.currentTime = 0;
        void audio.play().catch(() => {
          setIsPlaying(false);
        });
        return;
      }

      setIsPlaying(true);
      setSelectedTrackId(nextTrackId);
    };

    syncState();
    audio.addEventListener("loadedmetadata", syncState);
    audio.addEventListener("timeupdate", syncState);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", syncState);
      audio.removeEventListener("timeupdate", syncState);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [playMode, selectedTrackId, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = volume / 100;
  }, [volume]);

  const activeSession = workspace?.activeSession;
  const activeSessionId = workspace?.activeSessionId;
  const sessionList = workspace?.sessions || [];
  const capabilities = workspace?.capabilities || [];
  const noteList = workspace?.notes || [];
  const reminders = workspace?.reminders || [];
  const skillList = workspace?.skills || [];
  const activeNote = workspace?.activeNote;
  const activeNoteId = workspace?.activeNoteId;
  const activeSkill = workspace?.activeSkill;
  const activeSkillId = workspace?.activeSkillId;
  const activeSessionSkillIds = activeSession?.mountedSkillIds || [];
  const activeSessionSkills = activeSession?.mountedSkills || [];
  const activeSessionRecommendedSkills = activeSession?.recommendedSkills || [];
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
  function resolveAdjacentTrackId(direction = 1, mode = playMode) {
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
  }

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
    if (currentTime > 3 && playMode !== "shuffle") {
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

  async function handleRefreshLyrics(options = {}) {
    const track = selectedTrack;
    if (!track) {
      return;
    }

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

      setLyricsCache((prev) => ({
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
      }));
      setLyricsLookupState((prev) => ({
        ...prev,
        [track.id]: { status: "ready", error: "" },
      }));
    } catch (error) {
      setLyricsLookupState((prev) => ({
        ...prev,
        [track.id]: {
          status: "error",
          error: normalizeLyricsError(error, t),
        },
      }));
    }
  }

  async function handleUploadLyricsFile(file) {
    if (!selectedTrack || !file) {
      return;
    }

    try {
      const text = await file.text();
      const cacheKey = getLyricsCacheEntryKey(selectedTrack, duration);
      setLyricsCache((prev) => ({
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

  const selectedReminder =
    reminders.find((reminder) => reminder.id === selectedReminderId) || reminders[0] || null;
  const lastAssistantMessageId = useMemo(() => {
    const lastMessage = activeSession?.messages?.[activeSession.messages.length - 1];
    return lastMessage?.role === "assistant" ? lastMessage.id : null;
  }, [activeSession]);

  const providerConfigured = useMemo(() => {
    const settings = workspace?.settings;
    return Boolean(
      settings?.baseUrl?.trim() && settings?.apiKey?.trim() && settings?.model?.trim()
    );
  }, [workspace]);

  const filteredNotes = useMemo(() => {
    if (!noteSearch.trim()) {
      return noteList;
    }
    const needle = noteSearch.trim().toLowerCase();
    return noteList.filter((note) =>
      [note.title, note.summary, ...(note.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [noteList, noteSearch]);

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) {
      return sessionList;
    }
    const needle = sessionSearch.trim().toLowerCase();
    return sessionList.filter((session) =>
      [session.title, session.lastMessagePreview, t(`app.status.${session.status}`)]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [sessionList, sessionSearch, t]);

  const groupedSessions = useMemo(() => {
    const groups = {
      today: [],
      week: [],
      earlier: [],
    };
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = todayStart.getTime() - 6 * 24 * 60 * 60 * 1000;

    filteredSessions.forEach((session) => {
      if (session.updatedAt >= todayStart.getTime()) {
        groups.today.push(session);
      } else if (session.updatedAt >= weekStart && session.updatedAt < todayStart.getTime()) {
        groups.week.push(session);
      } else {
        groups.earlier.push(session);
      }
    });

    return [
      { id: "today", label: t("app.session.group.today"), items: groups.today },
      { id: "week", label: t("app.session.group.week"), items: groups.week },
      { id: "earlier", label: t("app.session.group.earlier"), items: groups.earlier },
    ].filter((group) => group.items.length > 0 || filteredSessions.length === 0);
  }, [filteredSessions, t]);

  const hasUnsavedSettings = useMemo(() => {
    if (!workspace?.settings) {
      return false;
    }
    return JSON.stringify(settingsForm) !== JSON.stringify(workspace.settings);
  }, [settingsForm, workspace]);

  const hasUnsavedNote = useMemo(() => {
    if (!activeNote) {
      return false;
    }
    return JSON.stringify({
      icon: noteDraft.icon,
      title: noteDraft.title,
      body: noteDraft.body,
      tagsText: noteDraft.tagsText,
    }) !==
      JSON.stringify({
        icon: activeNote.icon || "*",
        title: activeNote.title || "",
        body: activeNote.body || "",
        tagsText: (activeNote.tags || []).join(", "),
      });
  }, [activeNote, noteDraft]);

  const hasUnsavedReminder = useMemo(() => {
    if (!selectedReminder) {
      return false;
    }
    return JSON.stringify({
      title: reminderDraft.title,
      detail: reminderDraft.detail,
      dueAt: reminderDraft.dueAt,
      severity: reminderDraft.severity,
      status: reminderDraft.status,
      linkedNoteId: String(reminderDraft.linkedNoteId || ""),
    }) !==
      JSON.stringify({
        title: selectedReminder.title || "",
        detail: selectedReminder.detail || "",
        dueAt: selectedReminder.dueAt ? toDateTimeLocalValue(selectedReminder.dueAt) : "",
        severity: selectedReminder.severity || "medium",
        status: selectedReminder.status || "scheduled",
        linkedNoteId: String(selectedReminder.linkedNoteId || ""),
      });
  }, [reminderDraft, selectedReminder]);

  const hasUnsavedSkill = useMemo(() => {
    if (!activeSkill) {
      return false;
    }
    return JSON.stringify({
      name: skillDraft.name,
      description: skillDraft.description,
      instructions: skillDraft.instructions,
      triggerHint: skillDraft.triggerHint,
      enabled: Boolean(skillDraft.enabled),
    }) !==
      JSON.stringify({
        name: activeSkill.name || "",
        description: activeSkill.description || "",
        instructions: activeSkill.instructions || "",
        triggerHint: activeSkill.triggerHint || "",
        enabled: Boolean(activeSkill.enabled),
      });
  }, [activeSkill, skillDraft]);

  const activeSkillVersions = useMemo(
    () => getSkillHistoryEntries(skillHistoryMap, activeSkillId),
    [activeSkillId, skillHistoryMap]
  );

  const galleryFavoriteCount = useMemo(
    () => galleryItems.filter((item) => item.favorite).length,
    [galleryItems]
  );
  const skillHistoryEntryCount = useMemo(
    () =>
      Object.values(skillHistoryMap).reduce(
        (total, versions) => total + (Array.isArray(versions) ? versions.length : 0),
        0
      ),
    [skillHistoryMap]
  );
  const activeWeatherCity =
    weatherCities.find((city) => city.id === selectedWeatherCityId) || weatherCities[0] || WEATHER_LOCATIONS[0];
  const mountedSkillCount = activeSession?.session?.mountedSkillCount || activeSessionSkills.length;

  const openReminderCount = useMemo(
    () => reminders.filter((item) => item.status !== "done").length,
    [reminders]
  );

  const dueReminderCount = useMemo(
    () =>
      reminders.filter(
        (item) => item.status !== "done" && item.dueAt && item.dueAt <= clockNow
      ).length,
    [clockNow, reminders]
  );
  const mediaCacheCount = useMemo(
    () => galleryItems.length + getStoredArrayLength(LEGACY_ALBUM_STORAGE_KEY),
    [galleryItems.length]
  );
  const auxiliaryCacheGroupCount = 4;
  const cacheCards = useMemo(
    () => [
      {
        id: "media",
        title: t("app.settings.cache.media.title"),
        summary: t("app.settings.cache.entryCount", { count: mediaCacheCount }),
        countLabel: t("app.settings.cache.countLabel", { count: mediaCacheCount }),
        description: t("app.settings.cache.media.description"),
        buttonLabel: t("app.settings.cache.clear"),
        onClear: handleClearMediaCache,
      },
      {
        id: "weather",
        title: t("app.settings.cache.weather.title"),
        summary: t("app.settings.cache.entryCount", { count: weatherLocations.length }),
        countLabel: t("app.settings.cache.countLabel", { count: weatherLocations.length }),
        description: t("app.settings.cache.weather.description"),
        buttonLabel: t("app.settings.cache.clear"),
        onClear: handleClearWeatherCache,
      },
      {
        id: "skill-history",
        title: t("app.settings.cache.skillHistory.title"),
        summary: t("app.settings.cache.entryCount", { count: skillHistoryEntryCount }),
        countLabel: t("app.settings.cache.countLabel", { count: skillHistoryEntryCount }),
        description: t("app.settings.cache.skillHistory.description"),
        buttonLabel: t("app.settings.cache.clear"),
        onClear: handleClearSkillHistoryCache,
      },
      {
        id: "all",
        title: t("app.settings.cache.all.title"),
        summary: t("app.settings.cache.groupCount", { count: auxiliaryCacheGroupCount }),
        countLabel: t("app.settings.cache.all.countLabel"),
        description: t("app.settings.cache.all.description"),
        buttonLabel: t("app.settings.cache.clearAll"),
        onClear: handleClearAllCaches,
        danger: true,
      },
    ],
    [
      mediaCacheCount,
      skillHistoryEntryCount,
      t,
      weatherLocations.length,
    ]
  );
  const navigationGroups = useMemo(
    () => [
      {
        id: "workspace",
        label: t("app.nav.group.workspace"),
        items: [
          {
            id: "agent",
            label: t("app.mode.agent"),
            meta: t("app.view.agent.eyebrow"),
            badge: `${sessionList.length}`,
          },
          {
            id: "knowledge",
            label: t("app.mode.knowledge"),
            meta: t("app.view.knowledge.eyebrow"),
            badge: `${noteList.length}`,
          },
          {
            id: "gallery",
            label: t("app.mode.gallery"),
            meta: t("app.view.gallery.eyebrow"),
            badge: `${galleryItems.length}`,
          },
          {
            id: "music",
            label: t("app.mode.music"),
            meta: t("app.view.music.eyebrow"),
            badge: `${localizedTracks.length}`,
          },
        ],
      },
      {
        id: "operations",
        label: t("app.nav.group.operations"),
        items: [
          {
            id: "weather",
            label: t("app.mode.weather"),
            meta: t("app.view.weather.eyebrow"),
            badge: `${weatherLocations.length}`,
          },
          {
            id: "reminders",
            label: t("app.mode.reminders"),
            meta: t("app.view.reminders.eyebrow"),
            badge: `${openReminderCount}`,
          },
          {
            id: "skills",
            label: t("app.mode.skills"),
            meta: t("app.view.skills.eyebrow"),
            badge: `${skillList.length}`,
          },
        ],
      },
      {
        id: "control",
        label: t("app.nav.group.control"),
        items: [
          {
            id: "settings",
            label: t("app.mode.settings"),
            meta: t("app.view.settings.eyebrow"),
            badge: t(`app.common.${hasUnsavedSettings ? "dirty" : "saved"}`),
          },
        ],
      },
    ],
    [
      galleryItems.length,
      hasUnsavedSettings,
      localizedTracks.length,
      noteList.length,
      openReminderCount,
      sessionList.length,
      skillList.length,
      t,
      weatherLocations.length,
    ]
  );
  const allNavigationItems = useMemo(
    () => navigationGroups.flatMap((group) => group.items),
    [navigationGroups]
  );
  const mobileDockItems = useMemo(
    () =>
      ["agent", "knowledge", "music", "weather"]
        .map((id) => allNavigationItems.find((item) => item.id === id))
        .filter(Boolean),
    [allNavigationItems]
  );
  const activeNavItem =
    allNavigationItems.find((item) => item.id === currentView) || allNavigationItems[0] || null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedTrack) {
      return;
    }

    const shouldResume = isPlaying;
    audio.load();
    setCurrentTime(0);
    setDuration(0);

    if (shouldResume) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [selectedTrackId]);

  useEffect(() => {
    if (!selectedTrack) {
      return;
    }

    const cacheKey = getLyricsCacheEntryKey(selectedTrack, duration);
    const cacheEntry = lyricsCache[cacheKey];
    if (cacheEntry?.source && cacheEntry?.fingerprint === cacheKey) {
      return;
    }

    if (lyricsLookupState[selectedTrack.id]?.status === "loading") {
      return;
    }

    void handleRefreshLyrics({ force: true });
  }, [duration, lyricsCache, lyricsLookupState, selectedTrack, selectedTrackId]);

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
  }, [autoPlayOnReply, lastAssistantMessageId, selectedTrackId]);

  useEffect(() => {
    if (reminders.length === 0) {
      setSelectedReminderId(0);
      setReminderDraft({ ...EMPTY_REMINDER_DRAFT });
      return;
    }

    if (!reminders.some((reminder) => reminder.id === selectedReminderId)) {
      setSelectedReminderId(reminders[0].id);
    }
  }, [reminders, selectedReminderId]);

  useEffect(() => {
    if (!selectedReminder) {
      setReminderDraft({ ...EMPTY_REMINDER_DRAFT });
      return;
    }

    setReminderDraft({
      id: selectedReminder.id,
      title: selectedReminder.title || "",
      detail: selectedReminder.detail || "",
      dueAt: selectedReminder.dueAt ? toDateTimeLocalValue(selectedReminder.dueAt) : "",
      severity: selectedReminder.severity || "medium",
      status: selectedReminder.status || "scheduled",
      linkedNoteId: selectedReminder.linkedNoteId ? String(selectedReminder.linkedNoteId) : "",
    });
  }, [selectedReminder]);

  useEffect(() => {
    const dueReminder = reminders.find((item) => {
      if (item.status === "done" || !item.dueAt || item.dueAt > clockNow) {
        return false;
      }
      const alertKey = `${item.id}:${item.updatedAt}:${item.status}`;
      return !triggeredRemindersRef.current.has(alertKey);
    });

    if (!dueReminder) {
      return;
    }

    const alertKey = `${dueReminder.id}:${dueReminder.updatedAt}:${dueReminder.status}`;
    triggeredRemindersRef.current.add(alertKey);
    setSelectedReminderId(dueReminder.id);
    setCurrentView("reminders");

    if (typeof window !== "undefined") {
      const audio = new Audio("/reply-pulse.mp3");
      void audio.play().catch(() => {});
      window.setTimeout(() => {
        window.alert(t("app.reminders.alertDue", { title: dueReminder.title }));
      }, 120);
    }
  }, [clockNow, reminders]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const snapshot = await bootstrap();
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadWeatherSnapshots(locations, signal) {
    const sourceLocations =
      Array.isArray(locations) && locations.length > 0 ? locations : weatherLocations;

    setWeatherStatus("loading");
    setWeatherError("");
    setWeatherCities(createInitialWeatherCities(sourceLocations));
    try {
      const nextCities = await fetchWeatherSnapshots(sourceLocations, { signal });
      setWeatherCities(nextCities);
      setWeatherUpdatedAt(Date.now());
      setWeatherStatus(nextCities.some((city) => city.fetchFailed) ? "partial" : "ready");
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      setWeatherStatus("error");
      setWeatherError(normalizeError(err));
    }
  }

  function handleAddWeatherCity(location) {
    if (!location) {
      return;
    }

    setWeatherLocations((prev) => {
      if (prev.some((item) => isSameWeatherLocation(item, location))) {
        return prev;
      }
      return [...prev, sanitizeWeatherLocation(location)];
    });
    setSelectedWeatherCityId(location.id);
    setCurrentView("weather");
  }

  function handleRemoveWeatherCity(cityId) {
    if (!cityId) {
      return;
    }

    setWeatherLocations((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const nextLocations = prev.filter((city) => city.id !== cityId);
      if (nextLocations.length === 0) {
        return prev;
      }

      if (selectedWeatherCityId === cityId) {
        setSelectedWeatherCityId(nextLocations[0].id);
      }

      return nextLocations;
    });
  }

  async function handleOpenSession(sessionId) {
    if (!sessionId || sessionId === activeSessionId) {
      setIsMobileNavOpen(false);
      return;
    }
    setBusy("open");
    setError("");
    try {
      const snapshot = await openSession(sessionId);
      setWorkspace(snapshot);
      setIsMobileNavOpen(false);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleCreateSession() {
    setBusy("create");
    setError("");
    try {
      const snapshot = await createSession(newSessionTitle || t("app.session.defaultTitle"));
      setWorkspace(snapshot);
      setNewSessionTitle("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleDeleteSession(sessionId) {
    if (!sessionId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(t("app.session.deleteConfirm"))) {
      return;
    }
    setBusy("delete");
    setError("");
    try {
      const snapshot = await deleteSession(sessionId);
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  function handleToggleSessionLibrary() {
    setIsSessionLibraryCollapsed((prev) => !prev);
  }

  function handleToggleSessionGroup(groupId) {
    if (!groupId) {
      return;
    }

    setCollapsedSessionGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }

  function handleToggleSessionPreview(sessionId) {
    if (!sessionId) {
      return;
    }

    setCollapsedSessionPreviews((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId] === undefined ? false : !prev[sessionId],
    }));
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    setBusy("save-settings");
    setError("");
    try {
      const snapshot = await saveSettings({
        settings: settingsForm,
        activeSessionId,
      });
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleOpenNote(noteId) {
    if (!noteId || noteId === activeNoteId) {
      return;
    }
    setBusy("open-note");
    setError("");
    try {
      const snapshot = await openKnowledgeNote({
        noteId,
        activeSessionId,
      });
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleCreateNote() {
    setBusy("create-note");
    setError("");
    try {
      const snapshot = await createKnowledgeNote({
        title: t("app.knowledge.defaultTitle"),
        activeSessionId,
      });
      setWorkspace(snapshot);
      setCurrentView("knowledge");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleSaveNote() {
    if (!noteDraft.id) {
      return;
    }
    setBusy("save-note");
    setError("");
    try {
      const snapshot = await saveKnowledgeNote({
        activeSessionId,
        note: {
          id: noteDraft.id,
          icon: noteDraft.icon,
          title: noteDraft.title,
          body: noteDraft.body,
          tags: parseTags(noteDraft.tagsText),
        },
      });
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleDeleteNote() {
    if (!activeNoteId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(t("app.knowledge.deleteConfirm"))) {
      return;
    }
    setBusy("delete-note");
    setError("");
    try {
      const snapshot = await deleteKnowledgeNote({
        noteId: activeNoteId,
        activeSessionId,
      });
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleOpenSkill(skillId) {
    if (!skillId || skillId === activeSkillId) {
      return;
    }
    setBusy("open-skill");
    setError("");
    try {
      const snapshot = await openSkill({
        skillId,
        activeSessionId,
      });
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleCreateSkill() {
    setBusy("create-skill");
    setError("");
    try {
      const snapshot = await createSkill({
        name: t("app.skills.defaultTitle"),
        activeSessionId,
      });
      setWorkspace(snapshot);
      setCurrentView("skills");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleSaveSkill() {
    if (!skillDraft.id) {
      return;
    }

    const nextSkill = {
      id: skillDraft.id,
      name: skillDraft.name,
      description: skillDraft.description,
      instructions: skillDraft.instructions,
      triggerHint: skillDraft.triggerHint,
      enabled: Boolean(skillDraft.enabled),
    };

    setBusy("save-skill");
    setError("");
    try {
      const snapshot = await saveSkill({
        activeSessionId,
        skill: nextSkill,
      });
      if (shouldTrackSkillVersion(activeSkill, nextSkill)) {
        setSkillHistoryMap((prev) => appendSkillHistoryEntry(prev, activeSkill, "manual-save"));
      }
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleInstallSkillTemplate(template) {
    if (!template || !activeSessionId) {
      return;
    }

    setBusy("install-skill-template");
    setError("");
    try {
      const createdSnapshot = await createSkill({
        name: template.name,
        activeSessionId,
      });
      const createdSkillId = createdSnapshot?.activeSkill?.id || createdSnapshot?.activeSkillId;
      if (!createdSkillId) {
        throw new Error("Failed to create skill template");
      }

      const savedSnapshot = await saveSkill({
        activeSessionId,
        skill: {
          id: createdSkillId,
          name: template.name,
          description: template.description,
          instructions: template.instructions,
          triggerHint: template.triggerHint,
          enabled: true,
        },
      });
      setWorkspace(savedSnapshot);
      setCurrentView("skills");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleImportSkills(event) {
    const file = event?.target?.files?.[0];
    if (!file || !activeSessionId) {
      return;
    }

    setBusy("import-skills");
    setError("");
    try {
      const raw = await file.text();
      const importedSkills = parseImportedSkills(raw, t);
      let latestSnapshot = null;

      for (const importedSkill of importedSkills) {
        const createdSnapshot = await createSkill({
          name: importedSkill.name,
          activeSessionId,
        });
        const createdSkillId = createdSnapshot?.activeSkill?.id || createdSnapshot?.activeSkillId;
        if (!createdSkillId) {
          throw new Error(t("app.skills.import.createFailed"));
        }

        latestSnapshot = await saveSkill({
          activeSessionId,
          skill: {
            id: createdSkillId,
            name: importedSkill.name,
            description: importedSkill.description,
            instructions: importedSkill.instructions,
            triggerHint: importedSkill.triggerHint,
            enabled: Boolean(importedSkill.enabled),
          },
        });
      }

      if (latestSnapshot) {
        setWorkspace(latestSnapshot);
        setCurrentView("skills");
      }
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      if (event?.target) {
        event.target.value = "";
      }
      setBusy("");
    }
  }

  function handleExportSkill(skill) {
    if (!skill) {
      return;
    }

    const payload = {
      type: "mmgh-skill",
      version: 1,
      exportedAt: Date.now(),
      skill: {
        name: skill.name || t("app.skills.defaultTitle"),
        description: skill.description || "",
        instructions: skill.instructions || "",
        triggerHint: skill.triggerHint || "",
        enabled: Boolean(skill.enabled),
      },
    };

    downloadJsonFile(payload, `${slugifyFileName(skill.name || "skill")}.skill.json`);
  }

  function handleExportAllSkills() {
    if (!skillList.length) {
      return;
    }

    const payload = {
      type: "mmgh-skill-bundle",
      version: 1,
      exportedAt: Date.now(),
      skills: skillList.map((skill) => ({
        name: skill.name || t("app.skills.defaultTitle"),
        description: skill.description || "",
        instructions: skill.instructions || "",
        triggerHint: skill.triggerHint || "",
        enabled: Boolean(skill.enabled),
      })),
    };

    downloadJsonFile(payload, "mmgh-skills.bundle.json");
  }

  async function handleForgeSkill({ prompt, mode }) {
    if (!activeSessionId || !String(prompt || "").trim()) {
      return;
    }

    setBusy("forge-skill");
    setError("");
    try {
      const generatedSkill = await generateSkillDraft({
        existingSkill: mode === "rewrite" ? activeSkill : null,
        lang,
        prompt,
        settings: settingsForm,
        t,
      });

      if (mode === "rewrite" && activeSkillId) {
        const nextSkill = {
          id: activeSkillId,
          name: generatedSkill.name,
          description: generatedSkill.description,
          instructions: generatedSkill.instructions,
          triggerHint: generatedSkill.triggerHint,
          enabled: Boolean(skillDraft.enabled),
        };
        const savedSnapshot = await saveSkill({
          activeSessionId,
          skill: nextSkill,
        });
        if (shouldTrackSkillVersion(activeSkill, nextSkill)) {
          setSkillHistoryMap((prev) => appendSkillHistoryEntry(prev, activeSkill, "ai-rewrite"));
        }
        setWorkspace(savedSnapshot);
        return;
      }

      const createdSnapshot = await createSkill({
        name: generatedSkill.name || t("app.skills.defaultTitle"),
        activeSessionId,
      });
      const createdSkillId = createdSnapshot?.activeSkill?.id || createdSnapshot?.activeSkillId;
      if (!createdSkillId) {
        throw new Error(t("app.skills.forge.createFailed"));
      }

      const savedSnapshot = await saveSkill({
        activeSessionId,
        skill: {
          id: createdSkillId,
          name: generatedSkill.name,
          description: generatedSkill.description,
          instructions: generatedSkill.instructions,
          triggerHint: generatedSkill.triggerHint,
          enabled: true,
        },
      });
      setWorkspace(savedSnapshot);
      setCurrentView("skills");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleDeleteSkill() {
    if (!activeSkillId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(t("app.skills.deleteConfirm"))) {
      return;
    }
    setBusy("delete-skill");
    setError("");
    try {
      const snapshot = await deleteSkill({
        skillId: activeSkillId,
        activeSessionId,
      });
      setSkillHistoryMap((prev) => removeSkillHistoryEntries(prev, activeSkillId));
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleToggleSkillMounted(skillId) {
    if (!activeSessionId || !skillId) {
      return;
    }

    const nextSkillIds = activeSessionSkillIds.includes(skillId)
      ? activeSessionSkillIds.filter((id) => id !== skillId)
      : [...activeSessionSkillIds, skillId];

    setBusy("save-session-skills");
    setError("");
    try {
      const snapshot = await saveSessionSkills({
        sessionId: activeSessionId,
        skillIds: nextSkillIds,
        activeSessionId,
      });
      setWorkspace(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  function handleLoadSkillVersion(version) {
    if (!version || !activeSkillId) {
      return;
    }

    setSkillDraft(buildSkillDraftFromVersion(version, activeSkillId));
  }

  async function handleRestoreSkillVersion(version) {
    if (!version || !activeSkillId || !activeSessionId || !activeSkill) {
      return;
    }

    const nextSkill = buildSkillDraftFromVersion(version, activeSkillId);
    if (!shouldTrackSkillVersion(activeSkill, nextSkill)) {
      setSkillDraft(nextSkill);
      return;
    }

    setBusy("restore-skill-version");
    setError("");
    try {
      const snapshot = await saveSkill({
        activeSessionId,
        skill: nextSkill,
      });
      setSkillHistoryMap((prev) => appendSkillHistoryEntry(prev, activeSkill, "restore"));
      setWorkspace(snapshot);
      setCurrentView("skills");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleCreateReminder() {
    setBusy("create-reminder");
    setError("");
    try {
      const snapshot = await createReminder({
        title: t("app.reminders.defaultTitle"),
        activeSessionId,
      });
      setWorkspace(snapshot);
      setSelectedReminderId(snapshot.reminders?.[0]?.id || 0);
      setCurrentView("reminders");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleSaveReminder() {
    if (!reminderDraft.id) {
      return;
    }

    setBusy("save-reminder");
    setError("");
    try {
      const snapshot = await saveReminder({
        activeSessionId,
        reminder: {
          id: reminderDraft.id,
          title: reminderDraft.title,
          detail: reminderDraft.detail,
          dueAt: normalizeReminderDueAt(reminderDraft.dueAt),
          severity: reminderDraft.severity,
          status: reminderDraft.status,
          linkedNoteId: reminderDraft.linkedNoteId ? Number(reminderDraft.linkedNoteId) : null,
        },
      });
      setWorkspace(snapshot);
      setSelectedReminderId(reminderDraft.id);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleDeleteReminder() {
    if (!selectedReminderId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(t("app.reminders.deleteConfirm"))) {
      return;
    }

    setBusy("delete-reminder");
    setError("");
    try {
      const snapshot = await deleteReminder({
        reminderId: selectedReminderId,
        activeSessionId,
      });
      setWorkspace(snapshot);
      setSelectedReminderId(snapshot.reminders?.[0]?.id || 0);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleOpenReminderNote(noteId) {
    if (!noteId) {
      return;
    }
    await handleOpenNote(noteId);
    setCurrentView("knowledge");
  }

  async function handleRunAgent(event) {
    event.preventDefault();
    if (!activeSessionId || !draft.trim()) {
      return;
    }

    setBusy("run");
    setError("");
    try {
      const snapshot = await runAgent({
        sessionId: activeSessionId,
        prompt: draft,
      });
      setWorkspace(snapshot);
      setDraft("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

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
    void audio.play().catch(() => {
      setIsPlaying(false);
    });
  }

  function handleSeek(event) {
    const nextValue = Number(event.target.value);
    setCurrentTime(nextValue);
    if (audioRef.current) {
      audioRef.current.currentTime = nextValue;
    }
  }

  function handleUploadTracks(event) {
    const files = Array.from(event.target.files || []);
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

  async function handleGalleryUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const items = await Promise.all(
      files.map(async (file) => ({
        id: `gallery-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        caption: "",
        favorite: false,
        createdAt: Date.now(),
        src: await fileToDataUrl(file),
      }))
    );

    setGalleryItems((prev) => [...items, ...prev]);
    setGalleryViewerId(items[0]?.id || "");
    event.target.value = "";
  }

  function handleToggleFavoriteGalleryItem(itemId) {
    setGalleryItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, favorite: !item.favorite } : item
      )
    );
  }

  function handleDeleteGalleryItem(itemId) {
    if (typeof window !== "undefined" && !window.confirm(t("app.gallery.deleteConfirm"))) {
      return;
    }

    setGalleryItems((prev) => prev.filter((item) => item.id !== itemId));
    setGalleryViewerId((prev) => (prev === itemId ? "" : prev));
  }

  function handleClearMediaCache() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.media"))
    ) {
      return;
    }

    removeLocalStorageKeys([GALLERY_STORAGE_KEY, LEGACY_ALBUM_STORAGE_KEY]);
    setGalleryItems([]);
    setGallerySearch("");
    setGalleryFilter("all");
    setGalleryViewerId("");
  }

  function handleClearWeatherCache() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.weather"))
    ) {
      return;
    }

    const fallbackLocations = WEATHER_LOCATIONS.map((location) => sanitizeWeatherLocation(location)).filter(Boolean);
    removeLocalStorageKeys([
      WEATHER_LOCATIONS_STORAGE_KEY,
      WEATHER_RECENT_SEARCHES_STORAGE_KEY,
      WEATHER_USAGE_STORAGE_KEY,
    ]);
    setWeatherLocations(fallbackLocations);
    setSelectedWeatherCityId(fallbackLocations[0]?.id || WEATHER_LOCATIONS[0].id);
    setWeatherCities(createInitialWeatherCities(fallbackLocations));
    setWeatherStatus("loading");
    setWeatherError("");
    setWeatherUpdatedAt(0);
  }

  function handleClearSkillHistoryCache() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.skillHistory"))
    ) {
      return;
    }

    removeLocalStorageKeys([SKILL_HISTORY_STORAGE_KEY]);
    setSkillHistoryMap({});
  }

  function handleClearAllCaches() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.all"))
    ) {
      return;
    }

    const fallbackLocations = WEATHER_LOCATIONS.map((location) => sanitizeWeatherLocation(location)).filter(Boolean);
    removeLocalStorageKeys([
      GALLERY_STORAGE_KEY,
      LEGACY_ALBUM_STORAGE_KEY,
      WEATHER_LOCATIONS_STORAGE_KEY,
      WEATHER_RECENT_SEARCHES_STORAGE_KEY,
      WEATHER_USAGE_STORAGE_KEY,
      SKILL_HISTORY_STORAGE_KEY,
    ]);
    setGalleryItems([]);
    setGallerySearch("");
    setGalleryFilter("all");
    setGalleryViewerId("");
    setWeatherLocations(fallbackLocations);
    setSelectedWeatherCityId(fallbackLocations[0]?.id || WEATHER_LOCATIONS[0].id);
    setWeatherCities(createInitialWeatherCities(fallbackLocations));
    setWeatherStatus("loading");
    setWeatherError("");
    setWeatherUpdatedAt(0);
    setSkillHistoryMap({});
  }

  const viewMeta = {
    agent: {
      eyebrow: t("app.view.agent.eyebrow"),
      title: activeSession?.session?.title || t("app.common.loading"),
      description: t("app.view.agent.description"),
      badges: [
        {
          label: t("app.view.agent.badge.session"),
          value: t(`app.status.${activeSession?.session?.status || "idle"}`),
        },
        { label: t("app.view.agent.badge.mounted"), value: `${mountedSkillCount}` },
        {
          label: t("app.view.agent.badge.gateway"),
          value: t(`app.provider.${providerConfigured ? "configured" : "pending"}`),
        },
      ],
    },
    knowledge: {
      eyebrow: t("app.view.knowledge.eyebrow"),
      title: activeNote?.title || t("app.view.knowledge.title"),
      description: t("app.view.knowledge.description"),
      badges: [
        { label: t("app.view.knowledge.badge.pages"), value: `${noteList.length}` },
        {
          label: t("app.view.knowledge.badge.draft"),
          value: t(`app.common.${hasUnsavedNote ? "dirty" : "saved"}`),
        },
        {
          label: t("app.view.knowledge.badge.active"),
          value: t(`app.common.${activeNote ? "selected" : "empty"}`),
        },
      ],
    },
    gallery: {
      eyebrow: t("app.view.gallery.eyebrow"),
      title: t("app.view.gallery.title"),
      description: t("app.view.gallery.description"),
      badges: [
        { label: t("app.view.gallery.badge.images"), value: `${galleryItems.length}` },
        { label: t("app.view.gallery.badge.favorites"), value: `${galleryFavoriteCount}` },
        {
          label: t("app.view.gallery.badge.filter"),
          value: t(`app.gallery.filter.${galleryFilter}`),
        },
      ],
    },
    music: {
      eyebrow: t("app.view.music.eyebrow"),
      title: selectedTrack?.title || t("app.view.music.title"),
      description: t("app.view.music.description"),
      badges: [
        { label: t("app.view.music.badge.tracks"), value: `${localizedTracks.length}` },
        {
          label: t("app.view.music.badge.state"),
          value: isPlaying ? t("app.music.playing") : t("app.music.paused"),
        },
        {
          label: t("app.view.music.badge.mode"),
          value: autoPlayOnReply ? t("app.music.replySyncOn") : t("app.music.manualMode"),
        },
      ],
    },
    weather: {
      eyebrow: t("app.view.weather.eyebrow"),
      title: activeWeatherCity.nameKey ? t(activeWeatherCity.nameKey) : activeWeatherCity.name || t("app.view.weather.title"),
      description: t("app.view.weather.description"),
      badges: [
        { label: t("app.view.weather.badge.city"), value: `${weatherLocations.length}` },
        {
          label: t("app.view.weather.badge.condition"),
          value: weatherStatus === "error" ? t("app.weather.status.error") : t(activeWeatherCity.conditionKey),
        },
        {
          label: t("app.view.weather.badge.temperature"),
          value:
            activeWeatherCity.temperature == null
              ? "--"
              : `${activeWeatherCity.temperature}${t("app.weather.unit.degree")}`,
        },
      ],
    },
    reminders: {
      eyebrow: t("app.view.reminders.eyebrow"),
      title: selectedReminder?.title || t("app.view.reminders.title"),
      description: t("app.view.reminders.description"),
      badges: [
        { label: t("app.view.reminders.badge.open"), value: `${openReminderCount}` },
        { label: t("app.view.reminders.badge.due"), value: `${dueReminderCount}` },
        { label: t("app.view.reminders.badge.clock"), value: formatShortClock(clockNow, lang) },
      ],
    },
    skills: {
      eyebrow: t("app.view.skills.eyebrow"),
      title: activeSkill?.name || t("app.view.skills.title"),
      description: t("app.view.skills.description"),
      badges: [
        { label: t("app.view.skills.badge.skills"), value: `${skillList.length}` },
        { label: t("app.view.skills.badge.mounted"), value: `${mountedSkillCount}` },
        { label: t("app.view.skills.badge.permission"), value: t("app.permission.low") },
      ],
    },
    settings: {
      eyebrow: t("app.view.settings.eyebrow"),
      title: t("app.view.settings.title"),
      description: t("app.view.settings.description"),
      badges: [
        {
          label: t("app.view.settings.badge.gateway"),
          value: t(`app.provider.${providerConfigured ? "configured" : "pending"}`),
        },
        {
          label: t("app.view.settings.badge.state"),
          value: t(`app.common.${hasUnsavedSettings ? "dirty" : "saved"}`),
        },
        {
          label: t("app.view.settings.badge.cache"),
          value: t("app.settings.cache.groupCount", { count: auxiliaryCacheGroupCount }),
        },
      ],
    },
  };

  const inspectorTabs = [
    {
      id: "runtime",
      label: t("app.inspector.group.runtime.title"),
      eyebrow: t("app.inspector.group.runtime.eyebrow"),
      icon: "runtime",
    },
    {
      id: "media",
      label: t("app.inspector.group.media.title"),
      eyebrow: t("app.inspector.group.media.eyebrow"),
      icon: "music",
    },
    {
      id: "activity",
      label: t("app.inspector.group.activity.title"),
      eyebrow: t("app.inspector.group.activity.eyebrow"),
      icon: "trace",
    },
    {
      id: "quick",
      label: t("app.inspector.group.quick.title"),
      eyebrow: t("app.inspector.group.quick.eyebrow"),
      icon: "system",
    },
  ];
  const activeInspectorMeta =
    inspectorTabs.find((tab) => tab.id === activeInspectorTab) || inspectorTabs[0];

  function openInspector(tab = "runtime") {
    setActiveInspectorTab(tab);
    setIsInspectorOpen(true);
  }

  function handleSelectView(viewId) {
    if (!viewId) {
      return;
    }
    setCurrentView(viewId);
    setIsMobileNavOpen(false);
  }

  function handleToggleInspector(tab = "runtime") {
    if (isInspectorOpen) {
      setIsInspectorOpen(false);
      return;
    }

    openInspector(tab);
  }

  const railContent = (
    <div className="session-rail__body">
      <div className="rail-brand rail-brand--compact">
        <div className="rail-brand__head">
          <div>
            <span className="rail-brand__tag">{t("app.brand.tag")}</span>
            <h1>MMGH Agent</h1>
            <p>{t("app.brand.description")}</p>
          </div>
          <span className="rail-brand__view-tag">{viewMeta[currentView].eyebrow}</span>
        </div>

        <div className="rail-summary-strip">
          <article className="rail-summary-pill">
            <span>{t("app.stats.sessions")}</span>
            <strong>{String(sessionList.length).padStart(2, "0")}</strong>
          </article>
          <article className="rail-summary-pill">
            <span>{t("app.stats.notes")}</span>
            <strong>{String(noteList.length).padStart(2, "0")}</strong>
          </article>
          <article className="rail-summary-pill">
            <span>{t("app.stats.skills")}</span>
            <strong>{String(skillList.length).padStart(2, "0")}</strong>
          </article>
        </div>
      </div>

      <section className="rail-section rail-section--navigation">
        <div className="rail-section__head">
          <span className="eyebrow">{t("app.nav.eyebrow")}</span>
          <strong>{t("app.nav.title")}</strong>
        </div>
        <div className="rail-nav rail-nav--compact">
          {navigationGroups.map((group) => (
            <section
              key={group.id}
              className={`rail-nav-group ${
                group.items.some((item) => item.id === currentView) ? "is-active" : ""
              }`}
            >
              <div className="rail-nav-group__label">
                <span className="rail-nav-group__icon" aria-hidden="true">
                  <PanelIcon type={getNavGroupIconType(group.id)} />
                </span>
                <span>{group.label}</span>
              </div>
              <div className="rail-nav-list">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`rail-nav-item ${currentView === item.id ? "is-active" : ""}`}
                    onClick={() => handleSelectView(item.id)}
                  >
                    <div className="rail-nav-item__head">
                      <div className="rail-nav-item__title">
                        <span className="rail-nav-item__icon" aria-hidden="true">
                          <PanelIcon type={getNavIconType(item.id)} />
                        </span>
                        <strong>{item.label}</strong>
                      </div>
                      <span className="rail-nav-item__badge">{item.badge}</span>
                    </div>
                    <span className="rail-nav-item__meta">{item.meta}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="rail-section rail-section--sessions">
        <div className="rail-section__head rail-section__head--split">
          <div>
            <span className="eyebrow">{t("app.nav.sessions.eyebrow")}</span>
            <strong>{t("app.nav.sessions.title")}</strong>
          </div>
          <button
            type="button"
            className="rail-section__toggle"
            onClick={handleToggleSessionLibrary}
            aria-expanded={!isSessionLibraryCollapsed}
            aria-label={
              isSessionLibraryCollapsed
                ? t("app.nav.sessions.expand")
                : t("app.nav.sessions.collapse")
            }
          >
            <span
              className={`rail-section__chevron ${isSessionLibraryCollapsed ? "is-collapsed" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>

        {isSessionLibraryCollapsed ? (
          <div className="session-library-summary">
            <strong>{activeSession?.session?.title || t("app.session.defaultTitle")}</strong>
            <span>{t("app.nav.sessions.summary", { count: sessionList.length })}</span>
          </div>
        ) : (
          <div className="session-stack">
            <div className="session-toolbar">
              <input
                value={newSessionTitle}
                onChange={(event) => setNewSessionTitle(event.target.value)}
                placeholder={t("app.session.newPlaceholder")}
                className="field-input"
              />
              <button
                type="button"
                className="solid-button"
                onClick={handleCreateSession}
                disabled={busy !== "" || loading}
              >
                {t("app.session.create")}
              </button>
            </div>

            <input
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder={t("app.session.searchPlaceholder")}
              className="field-input session-search-input"
              aria-label={t("app.session.searchLabel")}
            />

            <div className="session-list-shell">
              <div className="session-list">
                {filteredSessions.length === 0 ? (
                  <div className="session-list__empty">
                    <strong>{t("app.session.searchEmptyTitle")}</strong>
                    <p>{t("app.session.searchEmptyDescription")}</p>
                  </div>
                ) : (
                  groupedSessions.map((group) => {
                    const isGroupCollapsed = Boolean(collapsedSessionGroups[group.id]);
                    return (
                      <div key={group.id} className="session-group">
                        <button
                          type="button"
                          className="session-group__head session-group__toggle"
                          onClick={() => handleToggleSessionGroup(group.id)}
                          aria-expanded={!isGroupCollapsed}
                        >
                          <span>
                            <span
                              className={`session-group__chevron ${isGroupCollapsed ? "is-collapsed" : ""}`}
                              aria-hidden="true"
                            />
                            {group.label}
                          </span>
                          <strong>{group.items.length}</strong>
                        </button>
                        {!isGroupCollapsed ? (
                          <div className="session-group__list">
                            {group.items.map((session) => {
                              const isPreviewCollapsed = collapsedSessionPreviews[session.id] !== false;

                              return (
                                <div
                                  key={session.id}
                                  className={`session-card ${
                                    session.id === activeSessionId ? "is-active" : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="session-card__main"
                                    onClick={() => handleOpenSession(session.id)}
                                  >
                                    <div className="session-card__head">
                                      <div className="session-card__title">
                                        <span className="session-card__icon" aria-hidden="true">
                                          <PanelIcon type={getSessionCardIconType(session.status)} />
                                        </span>
                                        <strong>{session.title}</strong>
                                      </div>
                                      <span className={`rail-nav-item__badge session-card__badge status-${session.status}`}>
                                        {t(`app.status.${session.status}`)}
                                      </span>
                                    </div>
                                    {!isPreviewCollapsed ? (
                                      <p className="session-card__preview">
                                        {session.lastMessagePreview || t("app.session.emptyMessages")}
                                      </p>
                                    ) : null}
                                    <div className="session-card__meta">
                                      <span>{t("app.session.messageCount", { count: session.messageCount })}</span>
                                      <span>{formatTime(session.updatedAt, lang)}</span>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    className="session-card__toggle"
                                    onClick={() => handleToggleSessionPreview(session.id)}
                                    aria-expanded={!isPreviewCollapsed}
                                    aria-label={
                                      isPreviewCollapsed
                                        ? t("app.session.preview.expand")
                                        : t("app.session.preview.collapse")
                                    }
                                  >
                                    <span
                                      className={`session-group__chevron ${isPreviewCollapsed ? "is-collapsed" : ""}`}
                                      aria-hidden="true"
                                    />
                                    <span>
                                      {isPreviewCollapsed
                                        ? t("app.session.preview.expand")
                                        : t("app.session.preview.collapse")}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              className="ghost-button danger-button session-stack__danger"
              onClick={() => handleDeleteSession(activeSessionId)}
              disabled={!activeSessionId || busy !== "" || loading}
            >
              {t("app.session.delete")}
            </button>
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div
      className={`agent-app theme-${theme} view-${currentView} ${
        showMiniPlayer ? "agent-app--with-mini-player" : ""
      }`}
    >
      <div className="agent-app__glow agent-app__glow--one" />
      <div className="agent-app__glow agent-app__glow--two" />
      <div className="agent-app__mesh" aria-hidden="true" />

      <aside className="session-rail session-rail--desktop panel-surface">{railContent}</aside>

      <div className={`mobile-shell-drawer ${isMobileNavOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="mobile-shell-drawer__backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          aria-label={t("app.common.close")}
          tabIndex={isMobileNavOpen ? 0 : -1}
        />
        <aside
          id="mobile-shell-drawer-panel"
          className="mobile-shell-drawer__panel session-rail session-rail--drawer panel-surface"
          role="dialog"
          aria-modal="true"
          aria-label={t("app.nav.title")}
        >
          {railContent}
        </aside>
      </div>

      <main className="workspace-column">
        <section className="workspace-hero panel-surface">
          <div className="workspace-hero__masthead">
            <div className="workspace-hero__brandline">
              <span className="workspace-hero__brand-mark">MMGH</span>
              <div className="workspace-hero__brand-copy">
                <span className="eyebrow">{t("app.brand.tag")}</span>
                <strong>MMGH Agent</strong>
              </div>
            </div>
            <div className="workspace-hero__meta-bar">
              <span className="workspace-hero__meta-pill">{formatShortClock(clockNow, lang)}</span>
              <span className="workspace-hero__meta-pill">
                {activeNavItem?.meta || viewMeta[currentView].eyebrow}
              </span>
              <button
                type="button"
                className="shell-menu-button"
                onClick={() => setIsMobileNavOpen(true)}
                aria-expanded={isMobileNavOpen}
                aria-controls="mobile-shell-drawer-panel"
                aria-label={t("app.nav.title")}
              >
                <span className="shell-menu-button__icon" aria-hidden="true">
                  <PanelIcon type="desktop" />
                </span>
              </button>
            </div>
          </div>
          <div className="workspace-hero__headline">
            <span className="eyebrow">{viewMeta[currentView].eyebrow}</span>
            <h2>{viewMeta[currentView].title}</h2>
            <p>{viewMeta[currentView].description}</p>
          </div>
          <div className="workspace-hero__status">
            <div className="hero-badges">
              {viewMeta[currentView].badges.map((badge) => (
                <Badge key={`${currentView}-${badge.label}`} label={badge.label} value={badge.value} />
              ))}
            </div>
          </div>
          <div className="workspace-hero__actions">
            <div className="workspace-hero__toolbar-shell">
              <div className="workspace-hero__toolbar">
                <div className="hero-control-card hero-control-card--theme hero-control-card--compact">
                  <span className="hero-control-card__label">{t("app.hero.appearance")}</span>
                  <button
                    type="button"
                    className="ghost-button hero-theme-button"
                    onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                  >
                    {theme === "dark" ? t("app.theme.light") : t("app.theme.dark")}
                  </button>
                </div>
                <div className="hero-control-card hero-control-card--locale hero-control-card--compact">
                  <span className="hero-control-card__label">{t("app.language.label")}</span>
                  <div className="mode-switch mode-switch--inline" aria-label={t("app.language.label")}>
                    <button
                      type="button"
                      className={`mode-switch__button ${lang === "zh-CN" ? "is-active" : ""}`}
                      onClick={() => setLang("zh-CN")}
                    >
                      中文
                    </button>
                    <button
                      type="button"
                      className={`mode-switch__button ${lang === "en-US" ? "is-active" : ""}`}
                      onClick={() => setLang("en-US")}
                    >
                      EN
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className={`hero-inspector-toggle ${isInspectorOpen ? "is-active" : ""}`}
                  onClick={() => handleToggleInspector("runtime")}
                  aria-expanded={isInspectorOpen}
                  aria-controls="inspector-drawer-panel"
                  aria-label={t("app.inspector.group.runtime.title")}
                  title={t("app.inspector.group.runtime.title")}
                >
                  <span className="hero-inspector-toggle__icon" aria-hidden="true">
                    <PanelIcon type="runtime" />
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div className="workspace-hero__switcher" aria-label={t("app.nav.title")}>
            {allNavigationItems.map((item) => (
              <button
                key={`hero-${item.id}`}
                type="button"
                className={`workspace-switcher-button ${currentView === item.id ? "is-active" : ""}`}
                onClick={() => handleSelectView(item.id)}
              >
                <span className="workspace-switcher-button__icon" aria-hidden="true">
                  <PanelIcon type={getNavIconType(item.id)} />
                </span>
                <span className="workspace-switcher-button__copy">
                  <strong>{item.label}</strong>
                  <span>{item.badge}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {error ? <div className="error-banner">{error}</div> : null}

        {currentView === "agent" ? (
          <RuntimeWorkspace
            activeSession={activeSession}
            activeSessionId={activeSessionId}
            activeSessionRecommendedSkills={activeSessionRecommendedSkills}
            activeSessionSkills={activeSessionSkills}
            busy={busy}
            draft={draft}
            handleOpenSession={handleOpenSession}
            handleOpenSkill={handleOpenSkill}
            handleRunAgent={handleRunAgent}
            isInspectorOpen={isInspectorOpen}
            lang={lang}
            loading={loading}
            openInspector={openInspector}
            providerConfigured={providerConfigured}
            sessionList={sessionList}
            setCurrentView={setCurrentView}
            setDraft={setDraft}
          />
        ) : currentView === "knowledge" ? (
          <KnowledgeVault
            activeNote={activeNote}
            activeNoteId={activeNoteId}
            busy={busy}
            filteredNotes={filteredNotes}
            handleCreateNote={handleCreateNote}
            handleDeleteNote={handleDeleteNote}
            handleOpenNote={handleOpenNote}
            handleSaveNote={handleSaveNote}
            loading={loading}
            noteDraft={noteDraft}
            noteSearch={noteSearch}
            setNoteDraft={setNoteDraft}
            setNoteSearch={setNoteSearch}
            hasUnsavedNote={hasUnsavedNote}
          />
        ) : currentView === "gallery" ? (
          <GalleryWorkspace
            galleryFilter={galleryFilter}
            galleryItems={galleryItems}
            gallerySearch={gallerySearch}
            galleryUploadInputRef={galleryUploadInputRef}
            galleryViewerId={galleryViewerId}
            handleDeleteGalleryItem={handleDeleteGalleryItem}
            handleGalleryUpload={handleGalleryUpload}
            handleToggleFavoriteGalleryItem={handleToggleFavoriteGalleryItem}
            openGalleryViewer={setGalleryViewerId}
            setGalleryFilter={setGalleryFilter}
            setGallerySearch={setGallerySearch}
            setGalleryViewerId={setGalleryViewerId}
          />
        ) : currentView === "music" ? (
          <MusicWorkspace
            autoPlayOnReply={autoPlayOnReply}
            currentTime={currentTime}
            duration={duration}
            handleCyclePlayMode={handleCyclePlayMode}
            handlePlayNextTrack={handlePlayNextTrack}
            handlePlayPreviousTrack={handlePlayPreviousTrack}
            handleRestartTrack={handleRestartTrack}
            handleSeek={handleSeek}
            handleSelectTrack={handleSelectTrack}
            handleTogglePlayback={handleTogglePlayback}
            isPlaying={isPlaying}
            lyricsError={selectedTrackLyricsError}
            lyricsLines={selectedTrackLyrics}
            lyricsSource={selectedTrackLyricsSource}
            lyricsStatus={selectedTrackLyricsStatus}
            onRefreshLyrics={() => void handleRefreshLyrics({ force: true })}
            onUploadLyricsFile={handleUploadLyricsFile}
            localizedTracks={localizedTracks}
            playMode={playMode}
            playerAudioElement={playerAudioElement}
            selectedTrack={selectedTrack}
            selectedTrackId={selectedTrackId}
            selectedTrackSource={selectedTrackSource}
            setAutoPlayOnReply={setAutoPlayOnReply}
            setVolume={setVolume}
            lyricsUploadInputRef={lyricsUploadInputRef}
            uploadInputRef={uploadInputRef}
            volume={volume}
          />
        ) : currentView === "weather" ? (
          <WeatherWorkspace
            clockNow={clockNow}
            selectedCityId={selectedWeatherCityId}
            setSelectedCityId={setSelectedWeatherCityId}
            weatherCities={weatherCities}
            weatherError={weatherError}
            weatherStatus={weatherStatus}
            weatherUpdatedAt={weatherUpdatedAt}
            onAddCity={handleAddWeatherCity}
            onRefresh={() => void loadWeatherSnapshots(weatherLocations)}
            onRemoveCity={handleRemoveWeatherCity}
          />
        ) : currentView === "skills" ? (
          <SkillWorkspace
            activeSkill={activeSkill}
            activeSkillId={activeSkillId}
            activeSkillVersions={activeSkillVersions}
            activeSessionRecommendedSkills={activeSessionRecommendedSkills}
            activeSessionTitle={activeSession?.session?.title || t("app.skills.currentSession")}
            busy={busy}
            providerConfigured={providerConfigured}
            skillList={skillList}
            skillImportInputRef={skillImportInputRef}
            handleCreateSkill={handleCreateSkill}
            handleDeleteSkill={handleDeleteSkill}
            handleExportAllSkills={handleExportAllSkills}
            handleExportSkill={handleExportSkill}
            handleForgeSkill={handleForgeSkill}
            handleImportSkills={handleImportSkills}
            handleLoadSkillVersion={handleLoadSkillVersion}
            handleOpenSkill={handleOpenSkill}
            handleRestoreSkillVersion={handleRestoreSkillVersion}
            handleSaveSkill={handleSaveSkill}
            handleInstallSkillTemplate={handleInstallSkillTemplate}
            handleToggleSkillMounted={handleToggleSkillMounted}
            hasUnsavedSkill={hasUnsavedSkill}
            loading={loading}
            mountedSkillIds={activeSessionSkillIds}
            setSkillDraft={setSkillDraft}
            setSkillSearch={setSkillSearch}
            skillDraft={skillDraft}
            skillSearch={skillSearch}
          />
        ) : currentView === "settings" ? (
          <SettingsWorkspace
            busy={busy}
            cacheCards={cacheCards}
            handleSaveSettings={handleSaveSettings}
            hasUnsavedSettings={hasUnsavedSettings}
            providerConfigured={providerConfigured}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
          />
        ) : (
          <ReminderWorkspace
            busy={busy}
            clockNow={clockNow}
            handleCreateReminder={handleCreateReminder}
            handleDeleteReminder={handleDeleteReminder}
            handleOpenLinkedNote={handleOpenReminderNote}
            handleSaveReminder={handleSaveReminder}
            hasUnsavedReminder={hasUnsavedReminder}
            loading={loading}
            noteList={noteList}
            reminderDraft={reminderDraft}
            reminderSearch={reminderSearch}
            reminders={reminders}
            selectedReminderId={selectedReminderId}
            setReminderDraft={setReminderDraft}
            setReminderSearch={setReminderSearch}
            setSelectedReminderId={setSelectedReminderId}
          />
        )}
      </main>

      <div className={`inspector-drawer ${isInspectorOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="inspector-drawer__backdrop"
          onClick={() => setIsInspectorOpen(false)}
          aria-label={t("app.common.close")}
          tabIndex={isInspectorOpen ? 0 : -1}
        />
        <aside
          id="inspector-drawer-panel"
          className="inspector-drawer__panel panel-surface"
          role="dialog"
          aria-modal="true"
          aria-label={t("app.inspector.group.runtime.title")}
        >
          <div className="inspector-drawer__head">
            <div className="inspector-drawer__headline">
              <span className="eyebrow">{activeInspectorMeta.eyebrow}</span>
              <h3>{activeInspectorMeta.label}</h3>
              <p>{viewMeta[currentView].title}</p>
            </div>
            <button
              type="button"
              className="ghost-button inspector-drawer__close"
              onClick={() => setIsInspectorOpen(false)}
            >
              {t("app.common.close")}
            </button>
          </div>
          <div className="inspector-tab-strip" role="tablist" aria-label={t("app.inspector.group.runtime.title")}>
            {inspectorTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeInspectorTab === tab.id}
                className={`inspector-tab ${activeInspectorTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveInspectorTab(tab.id)}
              >
                <span className="inspector-tab__icon" aria-hidden="true">
                  <PanelIcon type={tab.icon} />
                </span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="inspector-column inspector-column--tabs">
            {activeInspectorTab === "runtime" ? (
              <section className="panel-surface runtime-panel inspector-tab-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">{t("app.runtime.eyebrow")}</span>
                    <h3>{t("app.runtime.title")}</h3>
                  </div>
                </div>
                <div className="capability-grid">
                  {capabilities.map((item) => (
                    <article key={item.id} className="capability-card">
                      <div className="capability-card__head">
                        <span className={`capability-card__icon capability-card__icon--${item.id}`}>
                          <PanelIcon type={item.id} />
                        </span>
                        <div>
                          <span className="capability-card__status">{t(`app.status.${item.status}`)}</span>
                          <strong>{t(`app.capability.${item.id}.title`)}</strong>
                        </div>
                      </div>
                      <p>{t(`app.capability.${item.id}.description`)}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {activeInspectorTab === "media" ? (
              <section className="panel-surface sound-panel inspector-tab-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">{t("app.sound.eyebrow")}</span>
                    <h3>{t("app.sound.title")}</h3>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    {t("app.sound.addTracks")}
                  </button>
                </div>

                <label className="toggle-row">
                  <span>{t("app.sound.autoPlay")}</span>
                  <button
                    type="button"
                    className={`toggle-pill ${autoPlayOnReply ? "is-on" : ""}`}
                    onClick={() => setAutoPlayOnReply((prev) => !prev)}
                  >
                    <span />
                  </button>
                </label>

                <div className="sound-track-list">
                  {localizedTracks.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      className={`sound-track-card ${
                        track.id === selectedTrackId ? "is-active" : ""
                      }`}
                      onClick={() => setSelectedTrackId(track.id)}
                    >
                      <img src={track.cover} alt={track.title} />
                      <div>
                        <strong>{track.title}</strong>
                        <p>{track.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <input
                  ref={uploadInputRef}
                  className="upload-input"
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleUploadTracks}
                />
              </section>
            ) : null}

            {activeInspectorTab === "activity" ? (
              <section className="panel-surface activity-panel inspector-tab-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">{t("app.activity.eyebrow")}</span>
                    <h3>{t("app.activity.title")}</h3>
                  </div>
                </div>
                <div className="activity-list">
                  {activeSession?.activity?.length ? (
                    activeSession.activity.map((item) => {
                      const normalizedKind = normalizeActivityKind(item.kind);

                      return (
                        <article key={item.id} className="activity-card">
                          <div className="activity-card__head">
                            <div className="activity-card__title">
                              <span className={`activity-card__icon activity-card__icon--${normalizedKind}`}>
                                <PanelIcon type={normalizedKind} />
                              </span>
                              <div>
                                <strong>{item.title}</strong>
                                <span className="activity-card__kind">
                                  {t(`app.activity.kind.${normalizedKind}`)}
                                </span>
                              </div>
                            </div>
                            <span className={`status-chip status-${item.status}`}>
                              {t(`app.status.${item.status}`)}
                            </span>
                          </div>
                          <p>{item.detail}</p>
                          <span className="section-note">{formatTime(item.createdAt, lang)}</span>
                        </article>
                      );
                    })
                  ) : (
                    <div className="inspector-empty-state">
                      <strong>{t("app.status.idle")}</strong>
                      <p>{t("app.agent.composer.providerPending")}</p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeInspectorTab === "quick" ? (
              <section className="panel-surface settings-panel inspector-tab-panel">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">{t("app.settings.quick.eyebrow")}</span>
                    <h3>{t("app.settings.quick.title")}</h3>
                  </div>
                  <div className="settings-summary__chips">
                    <span className={`status-chip ${providerConfigured ? "status-completed" : "status-warning"}`}>
                      {t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}
                    </span>
                    <span className={`status-chip ${hasUnsavedSettings ? "status-running" : "status-idle"}`}>
                      {t(`app.common.${hasUnsavedSettings ? "dirty" : "saved"}`)}
                    </span>
                  </div>
                </div>

                <div className="quick-settings-grid">
                  <div className="quick-setting-card">
                    <span className="hero-control-card__label">{t("app.language.label")}</span>
                    <div className="mode-switch mode-switch--inline" aria-label={t("app.language.label")}>
                      <button
                        type="button"
                        className={`mode-switch__button ${lang === "zh-CN" ? "is-active" : ""}`}
                        onClick={() => setLang("zh-CN")}
                      >
                        中文
                      </button>
                      <button
                        type="button"
                        className={`mode-switch__button ${lang === "en-US" ? "is-active" : ""}`}
                        onClick={() => setLang("en-US")}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  <div className="quick-setting-card">
                    <span className="hero-control-card__label">{t("app.hero.appearance")}</span>
                    <button
                      type="button"
                      className="ghost-button hero-theme-button"
                      onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                    >
                      {theme === "dark" ? t("app.theme.light") : t("app.theme.dark")}
                    </button>
                  </div>
                </div>

                <div className="settings-rail-card">
                  <div className="settings-rail-card__summary">
                    <strong>{settingsForm.model || t("app.common.empty")}</strong>
                    <span>{settingsForm.baseUrl || t("app.common.empty")}</span>
                  </div>
                  <p className="section-note">{t("app.settings.page.railDescription")}</p>
                  <button
                    type="button"
                    className="solid-button"
                    onClick={() => {
                      setCurrentView("settings");
                      setIsInspectorOpen(false);
                    }}
                  >
                    {t("app.settings.page.open")}
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        </aside>
      </div>

      <nav className="mobile-dock" aria-label={t("app.nav.title")}>
        {mobileDockItems.map((item) => (
          <button
            key={`dock-${item.id}`}
            type="button"
            className={`mobile-dock__item ${currentView === item.id ? "is-active" : ""}`}
            onClick={() => handleSelectView(item.id)}
          >
            <span className="mobile-dock__icon" aria-hidden="true">
              <PanelIcon type={getNavIconType(item.id)} />
            </span>
            <span className="mobile-dock__label">{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-dock__item ${isMobileNavOpen ? "is-active" : ""}`}
          onClick={() => setIsMobileNavOpen(true)}
          aria-expanded={isMobileNavOpen}
          aria-controls="mobile-shell-drawer-panel"
          aria-label={t("app.nav.title")}
        >
          <span className="mobile-dock__icon" aria-hidden="true">
            <PanelIcon type="desktop" />
          </span>
          <span className="mobile-dock__label">{t("app.nav.title")}</span>
        </button>
      </nav>

      <audio ref={audioRef} preload="metadata">
        {selectedTrackSource ? <source src={selectedTrackSource.src} type="audio/mpeg" /> : null}
      </audio>

      {showMiniPlayer ? (
        <MiniPlayerBar
          currentTime={currentTime}
          duration={duration}
          handleOpenMusicWorkspace={() => setCurrentView("music")}
          handleRestartTrack={handleRestartTrack}
          handleSeek={handleSeek}
          handleTogglePlayback={handleTogglePlayback}
          isPlaying={isPlaying}
          selectedTrack={selectedTrack}
        />
      ) : null}
    </div>
  );
}

function Badge({ label, value }) {
  return (
    <div className="badge-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normalizeActivityKind(kind) {
  return ["system", "output", "plan", "skill"].includes(kind) ? kind : "system";
}

function getNavGroupIconType(groupId) {
  switch (groupId) {
    case "workspace":
      return "desktop";
    case "operations":
      return "trace";
    case "control":
    default:
      return "system";
  }
}

function getNavIconType(viewId) {
  switch (viewId) {
    case "agent":
      return "runtime";
    case "knowledge":
      return "knowledge";
    case "gallery":
      return "gallery";
    case "music":
      return "music";
    case "weather":
      return "weather";
    case "reminders":
      return "reminders";
    case "skills":
      return "skills";
    case "settings":
    default:
      return "system";
  }
}

function getSessionCardIconType(status) {
  switch (status) {
    case "running":
      return "runtime";
    case "failed":
      return "warning";
    case "completed":
      return "check";
    case "queued":
      return "plan";
    case "idle":
    default:
      return "session";
  }
}

function PanelIcon({ type }) {
  const normalizedType = type === "system" || type === "output" || type === "plan" || type === "skill"
    ? normalizeActivityKind(type)
    : type;

  return (
    <svg
      className="panel-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {getPanelIconPath(normalizedType)}
    </svg>
  );
}

function getPanelIconPath(type) {
  switch (type) {
    case "runtime":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 10l2 2-2 2" />
          <path d="M12.5 14H16" />
        </>
      );
    case "gateway":
      return (
        <>
          <circle cx="6.5" cy="12" r="2.5" />
          <circle cx="17.5" cy="7" r="2.5" />
          <circle cx="17.5" cy="17" r="2.5" />
          <path d="M8.8 10.8l6.4-2.6" />
          <path d="M8.8 13.2l6.4 2.6" />
        </>
      );
    case "trace":
      return (
        <>
          <circle cx="6" cy="7" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="17" r="2" />
          <path d="M7.7 8.3l2.6 2.6" />
          <path d="M13.7 13.7l2.6 2.6" />
          <path d="M9.2 14.8l2-1.7" />
        </>
      );
    case "knowledge":
      return (
        <>
          <path d="M7 5.5h9.5a2.5 2.5 0 012.5 2.5v10.5H9.5A2.5 2.5 0 017 16z" />
          <path d="M7 6v10.5A2.5 2.5 0 009.5 19" />
          <path d="M10 9h6" />
          <path d="M10 12h6" />
        </>
      );
    case "reminders":
      return (
        <>
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M7 16V11a5 5 0 0110 0v5l1.2 1.8A1 1 0 0117.4 19H6.6a1 1 0 01-.8-1.2z" />
        </>
      );
    case "skills":
      return (
        <>
          <rect x="5" y="5" width="5" height="5" rx="1.4" />
          <rect x="14" y="5" width="5" height="5" rx="1.4" />
          <rect x="5" y="14" width="5" height="5" rx="1.4" />
          <path d="M16.5 13.5v6" />
          <path d="M13.5 16.5h6" />
        </>
      );
    case "desktop":
      return (
        <>
          <rect x="4" y="5" width="16" height="11" rx="2.5" />
          <path d="M10 19h4" />
          <path d="M12 16v3" />
        </>
      );
    case "gallery":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M7 16l3.2-3.2a1.5 1.5 0 012.1 0L17 17" />
          <path d="M13 14l1.2-1.2a1.5 1.5 0 012.1 0L19 15.5" />
        </>
      );
    case "music":
      return (
        <>
          <path d="M15 6v9.5a2.5 2.5 0 11-2-2.45V8.2l7-1.7v7a2.5 2.5 0 11-2-2.45V5z" />
        </>
      );
    case "weather":
      return (
        <>
          <path d="M7 17h9.5a3.5 3.5 0 10-.7-6.93A5 5 0 006.5 9.5 3.5 3.5 0 007 17z" />
          <path d="M16 6.5h.01" />
          <path d="M18.5 7.5l1-1" />
          <path d="M13.5 7.5l-1-1" />
        </>
      );
    case "output":
      return (
        <>
          <path d="M5 12h9" />
          <path d="M11 8l4 4-4 4" />
          <rect x="4" y="6" width="16" height="12" rx="3" />
        </>
      );
    case "plan":
      return (
        <>
          <path d="M8 7h10" />
          <path d="M8 12h8" />
          <path d="M8 17h6" />
          <path d="M5 7h.01" />
          <path d="M5 12h.01" />
          <path d="M5 17h.01" />
        </>
      );
    case "skill":
      return (
        <>
          <path d="M7 17l7.5-7.5a2.12 2.12 0 013 3L10 20H7z" />
          <path d="M13.5 6.5l4 4" />
          <path d="M15 4l.6 1.8L17.4 6.4l-1.8.6L15 8.8l-.6-1.8-1.8-.6 1.8-.6z" />
        </>
      );
    case "session":
      return (
        <>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 10h8" />
          <path d="M8 14h5" />
        </>
      );
    case "check":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M8.5 12.2l2.2 2.2 4.8-5.1" />
        </>
      );
    case "warning":
      return (
        <>
          <path d="M12 4l8 14H4z" />
          <path d="M12 9v4" />
          <path d="M12 16h.01" />
        </>
      );
    case "system":
    default:
      return (
        <>
          <path d="M12 8.5A3.5 3.5 0 1112 15.5A3.5 3.5 0 0112 8.5z" />
          <path d="M12 3.5v2" />
          <path d="M12 18.5v2" />
          <path d="M20.5 12h-2" />
          <path d="M5.5 12h-2" />
          <path d="M18 6l-1.4 1.4" />
          <path d="M7.4 16.6L6 18" />
          <path d="M18 18l-1.4-1.4" />
          <path d="M7.4 7.4L6 6" />
        </>
      );
  }
}

function RuntimeWorkspace({
  activeSession,
  activeSessionId,
  activeSessionRecommendedSkills,
  activeSessionSkills,
  busy,
  draft,
  handleOpenSession,
  handleOpenSkill,
  handleRunAgent,
  isInspectorOpen,
  lang,
  loading,
  openInspector,
  providerConfigured,
  sessionList,
  setCurrentView,
  setDraft,
}) {
  const { t } = useI18n();
  const messages = activeSession?.messages || [];
  const activityItems = activeSession?.activity || [];
  const recentActivity = activityItems.slice(-4).reverse();
  const recentSessions = sessionList.slice(0, 6);
  const activeStatus = activeSession?.session?.status || "idle";
  const activeTitle = activeSession?.session?.title || t("app.session.defaultTitle");
  const updatedAt =
    activeSession?.session?.updatedAt || messages[messages.length - 1]?.createdAt || 0;
  const isRunning = busy === "run";

  return (
    <section className="runtime-workspace">
      <div className="runtime-overview-grid">
        <article className="panel-surface runtime-overview-card runtime-overview-card--primary">
          <span className="runtime-overview-card__label">{t("app.view.agent.badge.session")}</span>
          <strong>{activeTitle}</strong>
          <div className="runtime-overview-card__meta">
            <span className={`status-chip status-${activeStatus}`}>
              {t(`app.status.${activeStatus}`)}
            </span>
          </div>
        </article>

        <article className="panel-surface runtime-overview-card">
          <span className="runtime-overview-card__label">{t("app.agent.conversation.title")}</span>
          <strong>{t("app.agent.conversation.entries", { count: messages.length })}</strong>
          <span className="runtime-overview-card__meta-text">
            {updatedAt ? formatTime(updatedAt, lang) : t("app.common.loading")}
          </span>
        </article>

        <article className="panel-surface runtime-overview-card runtime-overview-card--compact">
          <span className="runtime-overview-card__label">{t("app.view.agent.badge.mounted")}</span>
          <strong>{t("app.agent.history.skillCount", { count: activeSessionSkills.length })}</strong>
          <span className="runtime-overview-card__meta-text">{t("app.permission.low")}</span>
        </article>

        <article className="panel-surface runtime-overview-card runtime-overview-card--compact">
          <span className="runtime-overview-card__label">{t("app.view.agent.badge.gateway")}</span>
          <strong>{t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}</strong>
          <span
            className={`status-chip ${
              providerConfigured ? "status-completed" : "status-warning"
            }`}
          >
            {providerConfigured ? t("app.status.ready") : t("app.status.idle")}
          </span>
        </article>
      </div>

      <div className="runtime-layout">
        <div className="runtime-main-column">
          <article className="panel-surface runtime-stage-card">
            <div className="section-head runtime-stage-card__head">
              <div>
                <span className="eyebrow">{t("app.agent.conversation.eyebrow")}</span>
                <h3>{t("app.agent.conversation.title")}</h3>
              </div>
              <div className="runtime-stage-card__meta">
                <span className={`status-chip status-${activeStatus}`}>
                  {t(`app.status.${activeStatus}`)}
                </span>
                <span className="section-note">
                  {updatedAt ? formatTime(updatedAt, lang) : t("app.common.loading")}
                </span>
              </div>
            </div>

            <div className="runtime-thread">
              <div className="message-list runtime-message-list runtime-thread__frame">
                {messages.length > 0 ? (
                  messages.map((message, index) => {
                    const messageRole = message.role === "user" ? "user" : "assistant";
                    const roleLabel = t(
                      messageRole === "user"
                        ? "app.agent.message.operator"
                        : "app.agent.message.agent"
                    );

                    return (
                      <article
                        key={message.id}
                        className={`message-card role-${messageRole}`}
                      >
                        <div className="message-card__meta">
                          <div className="message-card__identity">
                            <span className={`message-card__badge role-${messageRole}`}>
                              {roleLabel}
                            </span>
                            <span className="message-card__sequence">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <span className="message-card__time">
                            {formatTime(message.createdAt, lang)}
                          </span>
                        </div>
                        <div className="message-card__body">
                          <pre>{message.content}</pre>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="runtime-empty-state">
                    <strong>{t("app.session.emptyMessages")}</strong>
                    <p>{t("app.agent.composer.placeholder")}</p>
                  </div>
                )}
              </div>
            </div>
          </article>

          <form className="composer runtime-composer" onSubmit={handleRunAgent}>
            <div className="runtime-composer__head">
              <div>
                <span className="eyebrow">{t("app.agent.message.operator")}</span>
                <h4>{t("app.common.send")}</h4>
              </div>
              <span
                className={`status-chip ${
                  providerConfigured ? "status-completed" : "status-warning"
                }`}
              >
                {t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}
              </span>
            </div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("app.agent.composer.placeholder")}
              rows={6}
            />
            <div className="composer__actions runtime-composer__actions">
              <span>
                {providerConfigured
                  ? t("app.agent.composer.providerConfigured")
                  : t("app.agent.composer.providerPending")}
              </span>
              <button
                type="submit"
                className="solid-button"
                disabled={busy !== "" || loading || !draft.trim()}
              >
                {isRunning ? t("app.common.sending") : t("app.common.send")}
              </button>
            </div>
          </form>
        </div>

        <aside className="runtime-sidebar">
          <section className="panel-surface runtime-sidebar-card">
            <div className="runtime-sidebar-card__head">
              <div>
                <span className="eyebrow">{t("app.agent.mount.eyebrow")}</span>
                <h4>
                  {activeSessionSkills.length > 0
                    ? t("app.agent.mount.title")
                    : t("app.agent.mount.emptyTitle")}
                </h4>
              </div>
              <button
                type="button"
                className="ghost-button runtime-sidebar-card__action"
                onClick={() => setCurrentView("skills")}
              >
                {t("app.mode.skills")}
              </button>
            </div>

            {activeSessionSkills.length > 0 ? (
              <div className="runtime-chip-list">
                {activeSessionSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    className={`chip-button ${skill.enabled ? "is-active" : ""}`}
                    onClick={() => {
                      setCurrentView("skills");
                      void handleOpenSkill(skill.id);
                    }}
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.agent.mount.emptyDescription")}
              </p>
            )}
          </section>

          <section className="panel-surface runtime-sidebar-card">
            <div className="runtime-sidebar-card__head">
              <div>
                <span className="eyebrow">{t("app.agent.recommend.eyebrow")}</span>
                <h4>
                  {activeSessionRecommendedSkills.length > 0
                    ? t("app.agent.recommend.title")
                    : t("app.agent.recommend.emptyTitle")}
                </h4>
              </div>
              <button
                type="button"
                className="ghost-button runtime-sidebar-card__action"
                onClick={() => setCurrentView("skills")}
              >
                {t("app.mode.skills")}
              </button>
            </div>

            {activeSessionRecommendedSkills.length > 0 ? (
              <div className="runtime-recommend-list">
                {activeSessionRecommendedSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    className="runtime-recommend-card"
                    onClick={() => {
                      setCurrentView("skills");
                      void handleOpenSkill(skill.id);
                    }}
                  >
                    <strong>{skill.name}</strong>
                    <span>{skill.recommendationReason || skill.triggerHint}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.agent.recommend.emptyDescription")}
              </p>
            )}
          </section>

          <section className="panel-surface runtime-sidebar-card">
            <div className="runtime-sidebar-card__head">
              <div>
                <span className="eyebrow">{t("app.activity.eyebrow")}</span>
                <h4>{t("app.activity.title")}</h4>
              </div>
              <button
                type="button"
                className={`ghost-button runtime-sidebar-card__action ${
                  isInspectorOpen ? "is-active" : ""
                }`}
                onClick={() => openInspector("activity")}
              >
                {t("app.inspector.group.activity.title")}
              </button>
            </div>

            {recentActivity.length > 0 ? (
              <div className="runtime-activity-list">
                {recentActivity.map((item) => {
                  const normalizedKind = normalizeActivityKind(item.kind);

                  return (
                    <article key={item.id} className="runtime-activity-item">
                      <div className="runtime-activity-item__head">
                        <div className="runtime-activity-item__title">
                          <span
                            className={`runtime-activity-item__icon runtime-activity-item__icon--${normalizedKind}`}
                          >
                            <PanelIcon type={normalizedKind} />
                          </span>
                          <div>
                            <strong>{item.title}</strong>
                            <span>{t(`app.activity.kind.${normalizedKind}`)}</span>
                          </div>
                        </div>
                        <span className={`status-chip status-${item.status}`}>
                          {t(`app.status.${item.status}`)}
                        </span>
                      </div>
                      <p>{item.detail}</p>
                      <span className="section-note">{formatTime(item.createdAt, lang)}</span>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="section-note runtime-sidebar-copy">{t("app.status.idle")}</p>
            )}
          </section>

          <section className="panel-surface runtime-sidebar-card">
            <div className="runtime-sidebar-card__head">
              <div>
                <span className="eyebrow">{t("app.agent.history.eyebrow")}</span>
                <h4>{t("app.agent.history.title")}</h4>
              </div>
              <span className="section-note">
                {t("app.agent.history.total", { count: sessionList.length })}
              </span>
            </div>

            <div className="runtime-session-list">
              {recentSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`runtime-session-card ${
                    session.id === activeSessionId ? "is-active" : ""
                  }`}
                  onClick={() => handleOpenSession(session.id)}
                >
                  <div className="runtime-session-card__head">
                    <strong>{session.title}</strong>
                    <span className={`status-chip status-${session.status}`}>
                      {t(`app.status.${session.status}`)}
                    </span>
                  </div>
                  <p>{session.lastMessagePreview || t("app.session.emptyMessages")}</p>
                  <span className="section-note">{formatTime(session.updatedAt, lang)}</span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function KnowledgeVault({
  activeNote,
  activeNoteId,
  busy,
  filteredNotes,
  handleCreateNote,
  handleDeleteNote,
  handleOpenNote,
  handleSaveNote,
  loading,
  noteDraft,
  noteSearch,
  setNoteDraft,
  setNoteSearch,
  hasUnsavedNote,
}) {
  const { lang, t } = useI18n();
  const activeNoteUpdatedAt = activeNote?.updatedAt || 0;

  return (
    <section className="knowledge-panel panel-surface">
      <div className="knowledge-sidebar">
        <div className="knowledge-sidebar__intro">
          <div className="section-head knowledge-head">
            <div>
              <span className="eyebrow">{t("app.knowledge.eyebrow")}</span>
              <h3>{t("app.knowledge.title")}</h3>
            </div>
            <button
              type="button"
              className="solid-button"
              onClick={handleCreateNote}
              disabled={busy !== "" || loading}
            >
              {t("app.knowledge.newPage")}
            </button>
          </div>
          <div className="knowledge-sidebar__summary">
            <article className="knowledge-summary-card">
              <span>{t("app.stats.notes")}</span>
              <strong>{filteredNotes.length}</strong>
            </article>
            <article className="knowledge-summary-card knowledge-summary-card--wide">
              <span>{t("app.knowledge.editor.eyebrow")}</span>
              <strong>{activeNote?.title || t("app.knowledge.defaultTitle")}</strong>
              <p>
                {activeNoteUpdatedAt
                  ? formatTime(activeNoteUpdatedAt, lang)
                  : t("app.knowledge.editor.description")}
              </p>
            </article>
          </div>
        </div>

        <input
          className="field-input"
          value={noteSearch}
          onChange={(event) => setNoteSearch(event.target.value)}
          placeholder={t("app.knowledge.search")}
        />

        <div className="knowledge-note-list">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`knowledge-note-card ${note.id === activeNoteId ? "is-active" : ""}`}
              onClick={() => handleOpenNote(note.id)}
            >
              <div className="knowledge-note-card__head">
                <span className="knowledge-note-icon">{note.icon || "*"}</span>
                <div className="knowledge-note-card__title-block">
                  <strong>{note.title}</strong>
                  <span>{formatTime(note.updatedAt, lang)}</span>
                </div>
              </div>
              <p>{note.summary}</p>
              <div className="knowledge-note-card__meta">
                <span>{(note.tags || []).slice(0, 2).join(" | ") || t("app.knowledge.noTags")}</span>
                <span>{t("app.knowledge.editor.eyebrow")}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="knowledge-editor">
        <div className="knowledge-editor__toolbar">
          <div className="knowledge-editor__stamp">
            <span className="eyebrow">{t("app.knowledge.editor.eyebrow")}</span>
            <p>{t("app.knowledge.editor.description")}</p>
          </div>
          <div className="knowledge-editor__actions">
            <button
              type="button"
              className="ghost-button"
              onClick={handleDeleteNote}
              disabled={!activeNote || busy !== "" || loading}
            >
              {t("app.common.delete")}
            </button>
            <button
              type="button"
              className="solid-button"
              onClick={handleSaveNote}
              disabled={!hasUnsavedNote || busy !== "" || loading}
            >
              {busy === "save-note" ? t("app.common.saving") : t("app.knowledge.savePage")}
            </button>
          </div>
        </div>

        <div className="knowledge-editor__form">
          <div className="knowledge-editor__hero">
            <div className="knowledge-editor__hero-icon">{noteDraft.icon || "*"}</div>
            <div className="knowledge-editor__hero-copy">
              <span className="eyebrow">{t("app.knowledge.editor.eyebrow")}</span>
              <strong>{noteDraft.title || t("app.knowledge.defaultTitle")}</strong>
              <p>{t("app.knowledge.editor.description")}</p>
            </div>
          </div>
          <div className="knowledge-editor__title-row">
            <input
              className="knowledge-icon-input"
              value={noteDraft.icon}
              maxLength={2}
              onChange={(event) =>
                setNoteDraft((prev) => ({
                  ...prev,
                  icon: event.target.value,
                }))
              }
            />
            <input
              className="knowledge-title-input"
              value={noteDraft.title}
              onChange={(event) =>
                setNoteDraft((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
              placeholder={t("app.knowledge.defaultTitle")}
            />
          </div>

          <input
            className="field-input"
            value={noteDraft.tagsText}
            onChange={(event) =>
              setNoteDraft((prev) => ({
                ...prev,
                tagsText: event.target.value,
              }))
            }
            placeholder={t("app.knowledge.tags")}
          />

          <textarea
            className="knowledge-body-input"
            value={noteDraft.body}
            onChange={(event) =>
              setNoteDraft((prev) => ({
                ...prev,
                body: event.target.value,
              }))
            }
            placeholder={t("app.knowledge.bodyPlaceholder")}
          />
        </div>
      </div>
    </section>
  );
}

function parseTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function removeLocalStorageKeys(keys) {
  if (typeof window === "undefined") {
    return;
  }

  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove cache key: ${key}`, error);
    }
  });
}

function getStoredArrayLength(key) {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return 0;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (error) {
    console.error(`Failed to inspect cache key: ${key}`, error);
    return 0;
  }
}

function readGalleryItems() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GALLERY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.src === "string"
    );
  } catch (error) {
    console.error("Failed to read gallery cache", error);
    return [];
  }
}

function writeGalleryItems(items) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to write gallery cache", error);
  }
}

function readWeatherLocations() {
  if (typeof window === "undefined") {
    return WEATHER_LOCATIONS;
  }

  try {
    const raw = window.localStorage.getItem(WEATHER_LOCATIONS_STORAGE_KEY);
    if (!raw) {
      return WEATHER_LOCATIONS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return WEATHER_LOCATIONS;
    }

    const locations = parsed.map((item) => sanitizeWeatherLocation(item)).filter(Boolean);
    return locations.length > 0 ? locations : WEATHER_LOCATIONS;
  } catch (error) {
    console.error("Failed to read weather locations", error);
    return WEATHER_LOCATIONS;
  }
}

function writeWeatherLocations(locations) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WEATHER_LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
  } catch (error) {
    console.error("Failed to write weather locations", error);
  }
}

function sanitizeWeatherLocation(location) {
  if (!location || typeof location !== "object") {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const fallbackId =
    location.id ||
    `geo-${Number(location.geoId) || `${latitude.toFixed(4)}-${longitude.toFixed(4)}`}`;

  return {
    id: String(fallbackId),
    geoId: Number.isFinite(Number(location.geoId)) ? Number(location.geoId) : null,
    nameKey: location.nameKey ? String(location.nameKey) : undefined,
    regionKey: location.regionKey ? String(location.regionKey) : undefined,
    name: String(location.name || ""),
    region: String(location.region || ""),
    timeZone: String(location.timeZone || "UTC"),
    tone: ["sunrise", "rain", "aurora", "polar"].includes(location.tone) ? location.tone : "sunrise",
    latitude,
    longitude,
  };
}

function isSameWeatherLocation(left, right) {
  if (!left || !right) {
    return false;
  }

  if (left.geoId && right.geoId) {
    return Number(left.geoId) === Number(right.geoId);
  }

  return (
    Number(left.latitude).toFixed(4) === Number(right.latitude).toFixed(4) &&
    Number(left.longitude).toFixed(4) === Number(right.longitude).toFixed(4)
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function toDateTimeLocalValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function normalizeReminderDueAt(value) {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatTime(value, lang = "en-US") {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString(lang, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

function formatShortClock(value, lang = "en-US") {
  return new Date(value).toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function generateSkillDraft({ existingSkill, lang, prompt, settings, t }) {
  return forgeSkill({
    existingSkill,
    lang,
    prompt,
    settings,
  });
}

function readSkillHistory() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SKILL_HISTORY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.entries(parsed).reduce((accumulator, [skillId, versions]) => {
      const normalizedId = Number(skillId);
      if (!normalizedId || !Array.isArray(versions)) {
        return accumulator;
      }

      const normalizedVersions = versions
        .map((version) => normalizeSkillHistoryEntry(version))
        .filter(Boolean)
        .slice(0, MAX_SKILL_HISTORY_ENTRIES);

      if (normalizedVersions.length > 0) {
        accumulator[String(normalizedId)] = normalizedVersions;
      }

      return accumulator;
    }, {});
  } catch (error) {
    console.error("Failed to read skill history", error);
    return {};
  }
}

function writeSkillHistory(historyMap) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SKILL_HISTORY_STORAGE_KEY, JSON.stringify(historyMap));
  } catch (error) {
    console.error("Failed to write skill history", error);
  }
}

function readLyricsCache() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LYRICS_CACHE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to read lyrics cache", error);
    return {};
  }
}

function writeLyricsCache(cache) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LYRICS_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to write lyrics cache", error);
  }
}

function getLyricsCacheEntryKey(track, duration) {
  const title = sanitizeLyricsSearchPart(track?.title || "");
  const artist = sanitizeLyricsSearchPart(track?.artist || "");
  return `${title}__${artist}`;
}

function sanitizeLyricsSearchPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveLyricsLines({ duration, entry, fallbackArtist, fallbackTitle, t }) {
  const syncedLines = parseLrcLyrics(entry?.syncedLyrics || "");
  if (syncedLines.length > 0) {
    return syncedLines;
  }

  const plainLines = parsePlainLyrics(entry?.plainLyrics || "");
  if (plainLines.length > 0) {
    return spreadPlainLyricsAcrossTrack(plainLines, duration);
  }

  return buildFallbackLyrics({ artist: fallbackArtist, duration, t, title: fallbackTitle });
}

function parseLrcLyrics(text) {
  if (!text) {
    return [];
  }

  const lines = [];
  const pattern = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  String(text)
    .split(/\r?\n/)
    .forEach((rawLine) => {
      const timestamps = [...rawLine.matchAll(pattern)];
      const content = rawLine.replace(pattern, "").trim();
      if (timestamps.length === 0 || !content) {
        return;
      }

      timestamps.forEach((match) => {
        const minutes = Number(match[1] || 0);
        const seconds = Number(match[2] || 0);
        const fractionRaw = String(match[3] || "0");
        const fraction =
          fractionRaw.length === 3
            ? Number(fractionRaw) / 1000
            : fractionRaw.length === 2
              ? Number(fractionRaw) / 100
              : Number(fractionRaw) / 10;

        lines.push({
          time: minutes * 60 + seconds + fraction,
          text: content,
        });
      });
    });

  return lines.sort((left, right) => left.time - right.time);
}

function parsePlainLyrics(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 80);
}

function spreadPlainLyricsAcrossTrack(lines, duration) {
  const totalDuration = Math.max(duration || lines.length * 6, lines.length * 4, 24);
  const step = totalDuration / Math.max(lines.length, 1);

  return lines.map((line, index) => ({
    time: Math.round(step * index),
    text: line,
  }));
}

function buildFallbackLyrics({ artist, duration, t, title }) {
  const totalDuration = Math.max(duration || 180, 120);
  const step = totalDuration / 6;
  return [
    { time: 0, text: title, subtext: artist },
    { time: Math.round(step), text: t("app.music.lyrics.status.loading"), subtext: t("app.music.playing") },
    { time: Math.round(step * 2), text: t("app.music.lyrics.fallback.line1"), subtext: t("app.music.lyrics.fallback.line2") },
    { time: Math.round(step * 3), text: t("app.music.panelDescription"), subtext: t("app.music.heroDescription") },
    { time: Math.round(step * 4), text: t("app.music.queueHint"), subtext: t("app.music.uploadHint") },
    { time: Math.round(step * 5), text: t("app.music.nowPlaying"), subtext: title },
  ];
}

async function fetchLyricsFromLrclib({ artist, duration, title }) {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });

  if (duration) {
    params.set("duration", String(Math.round(duration)));
  }

  const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.ok) {
    return extractLyricsPayload(await response.json());
  }

  if (response.status !== 404) {
    throw new Error(`lyrics-${response.status}`);
  }

  const searchParams = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });

  const searchResponse = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!searchResponse.ok) {
    throw new Error(`lyrics-${searchResponse.status}`);
  }

  const payload = await searchResponse.json();
  if (!Array.isArray(payload)) {
    throw new Error("lyrics-invalid-payload");
  }

  const matchedLyrics = payload.find((item) => item && (item.syncedLyrics || item.plainLyrics));
  if (!matchedLyrics) {
    throw new Error("lyrics-404");
  }

  return extractLyricsPayload(matchedLyrics);
}

function extractLyricsPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("lyrics-invalid-payload");
  }

  return {
    plainLyrics: String(payload.plainLyrics || ""),
    syncedLyrics: String(payload.syncedLyrics || ""),
  };
}

function normalizeLyricsError(error, t) {
  const message = String(error?.message || "");
  if (message === "lyrics-404") {
    return t("app.music.lyrics.status.notFound");
  }

  return t("app.music.lyrics.status.error");
}

function getSkillHistoryEntries(historyMap, skillId) {
  if (!skillId) {
    return [];
  }
  return Array.isArray(historyMap?.[String(skillId)]) ? historyMap[String(skillId)] : [];
}

function normalizeSkillHistoryEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const skillId = Number(entry.skillId);
  const savedAt = Number(entry.savedAt);
  if (!skillId || !Number.isFinite(savedAt)) {
    return null;
  }

  return {
    versionId: String(entry.versionId || `skill-${skillId}-${savedAt}`),
    skillId,
    name: String(entry.name || ""),
    description: String(entry.description || ""),
    instructions: String(entry.instructions || ""),
    triggerHint: String(entry.triggerHint || ""),
    enabled: Boolean(entry.enabled),
    savedAt,
    reason: normalizeSkillHistoryReason(entry.reason),
  };
}

function normalizeSkillHistoryReason(reason) {
  return ["manual-save", "ai-rewrite", "restore"].includes(reason)
    ? reason
    : "manual-save";
}

function appendSkillHistoryEntry(historyMap, skill, reason) {
  const entry = createSkillHistoryEntry(skill, reason);
  if (!entry) {
    return historyMap;
  }

  const skillKey = String(entry.skillId);
  const currentEntries = Array.isArray(historyMap?.[skillKey]) ? historyMap[skillKey] : [];
  return {
    ...historyMap,
    [skillKey]: [entry, ...currentEntries].slice(0, MAX_SKILL_HISTORY_ENTRIES),
  };
}

function removeSkillHistoryEntries(historyMap, skillId) {
  if (!skillId || !historyMap?.[String(skillId)]) {
    return historyMap;
  }

  const nextHistory = { ...historyMap };
  delete nextHistory[String(skillId)];
  return nextHistory;
}

function createSkillHistoryEntry(skill, reason) {
  if (!skill?.id) {
    return null;
  }

  const savedAt = Date.now();
  return {
    versionId: `skill-${skill.id}-${savedAt}`,
    skillId: skill.id,
    name: String(skill.name || ""),
    description: String(skill.description || ""),
    instructions: String(skill.instructions || ""),
    triggerHint: String(skill.triggerHint || ""),
    enabled: Boolean(skill.enabled),
    savedAt,
    reason: normalizeSkillHistoryReason(reason),
  };
}

function buildSkillDraftFromVersion(version, skillId) {
  return {
    id: skillId || Number(version?.skillId) || 0,
    name: String(version?.name || ""),
    description: String(version?.description || ""),
    instructions: String(version?.instructions || ""),
    triggerHint: String(version?.triggerHint || ""),
    enabled: Boolean(version?.enabled),
  };
}

function shouldTrackSkillVersion(currentSkill, nextSkill) {
  if (!currentSkill?.id || !nextSkill?.id || currentSkill.id !== nextSkill.id) {
    return false;
  }

  return !areSkillPayloadsEqual(currentSkill, nextSkill);
}

function areSkillPayloadsEqual(left, right) {
  return JSON.stringify(toComparableSkill(left)) === JSON.stringify(toComparableSkill(right));
}

function toComparableSkill(skill) {
  return {
    name: String(skill?.name || "").trim(),
    description: String(skill?.description || "").trim(),
    instructions: String(skill?.instructions || "").trim(),
    triggerHint: String(skill?.triggerHint || "").trim(),
    enabled: Boolean(skill?.enabled),
  };
}

function parseImportedSkills(raw, t) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(t("app.skills.import.invalidJson"));
  }

  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed?.type === "mmgh-skill"
      ? [parsed.skill]
      : parsed?.type === "mmgh-skill-bundle"
        ? parsed.skills
        : [parsed.skill || parsed];

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error(t("app.skills.import.emptyPayload"));
  }

  const skills = candidates.map((candidate) => sanitizeImportedSkill(candidate, t)).filter(Boolean);
  if (skills.length === 0) {
    throw new Error(t("app.skills.import.emptyPayload"));
  }

  return skills;
}

function sanitizeImportedSkill(skill, t) {
  if (!skill || typeof skill !== "object") {
    return null;
  }

  return {
    name: String(skill.name || t("app.skills.defaultTitle")).trim().slice(0, 64),
    description: String(skill.description || "").trim(),
    instructions: String(skill.instructions || "").trim(),
    triggerHint: String(skill.triggerHint || "").trim(),
    enabled: Boolean(
      Object.prototype.hasOwnProperty.call(skill, "enabled") ? skill.enabled : true
    ),
  };
}

function downloadJsonFile(payload, filename) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function slugifyFileName(value) {
  const normalized = String(value || "skill")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "skill";
}

function normalizeError(error) {
  if (!error) {
    return "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error.message) {
    return error.message;
  }
  return "Unknown error";
}

export default App;

