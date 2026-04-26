import React, {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./CSS/App.css";
import {
  PREVIEW_WORKSPACE_STORAGE_KEY,
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
  openReminder,
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
import MiniPlayerBar from "./components/MiniPlayerBar";
import {
  WEATHER_LOCATIONS,
  createInitialWeatherCities,
  fetchWeatherSnapshots,
} from "./components/weatherData";
import { LANG_PERSIST_ERROR_EVENT, useI18n } from "./i18n";
import { assessProviderBaseUrl } from "./security/provider";
import {
  appendNoteSection,
  buildDefaultFollowUpTitle,
  buildFollowUpReminderDetail,
  buildFollowUpReminderDueAt,
  buildRecurringPatternSkillInstructions,
  buildRecurringPatternSkillName,
  buildReminderCompletionDetail,
  buildReminderCompletionNoteEntry,
  buildSessionCaptureDraft,
  createReminderCompletionDraft,
  findNoteIdByTitle,
  formatTime,
  mergeUniqueTags,
  normalizeReminderPatternKey,
  resolvePatternStatusTone,
  resolveReminderUrgency,
  resolveRuleActionTone,
  resolveRuleEffectivenessTone,
  toDateTimeLocalValue,
} from "./utils/todayWorkflow";
import {
  buildRecurringPatternInsights,
  buildRuleActionRecommendations,
  buildRuleEffectivenessInsights,
  buildRuleEffectivenessSignals,
  buildRuntimeRecommendedSkills,
  buildTodayReviewSignals,
  selectCompletedTodayItems,
  selectContinueSessionItems,
  selectDueReminderCount,
  selectOpenReminderCount,
  selectRecentCaptureItems,
  selectRecurringReminderPatterns,
  selectTodayReminderItems,
} from "./utils/todayInsights";
import {
  patchPlaybackSnapshot,
  resetPlaybackSnapshot,
} from "./utils/playbackSnapshot";
import {
  getDesktopWindowState,
  isTauriAvailable,
  listenToDesktopLifecycle,
  listenToDesktopWindowState,
} from "./storage/tauri";

const GalleryWorkspace = lazy(() => import("./components/GalleryWorkspace"));
const KnowledgeVault = lazy(() => import("./components/KnowledgeVault"));
const MusicWorkspace = lazy(() => import("./components/MusicWorkspace"));
const ReminderWorkspace = lazy(() => import("./components/ReminderWorkspace"));
const ReminderCompletionDialog = lazy(() => import("./components/ReminderCompletionDialog"));
const RuntimeWorkspace = lazy(() => import("./components/RuntimeWorkspace"));
const SettingsWorkspace = lazy(() => import("./components/SettingsWorkspace"));
const SkillWorkspace = lazy(() => import("./components/SkillWorkspace"));
const TodayWorkspace = lazy(() => import("./components/TodayWorkspace"));
const WeatherWorkspace = lazy(() => import("./components/WeatherWorkspace"));

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
const LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY = "mmgh-lyrics-cache-cleared-at-v1";
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
const EMPTY_REMINDER_COMPLETION_DRAFT = {
  reminderId: 0,
  reminderTitle: "",
  linkedNoteId: "",
  result: "",
  saveToNote: true,
  createFollowUp: false,
  followUpTitle: "",
  followUpDueAt: "",
};
const EMPTY_LIST = [];
const LOCAL_CACHE_WRITE_MAX_RETRIES = 5;
const THEME_STORAGE_KEY = "mmgh-theme";

function readStoredTheme() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || "";
  } catch (error) {
    console.error("Failed to read theme preference", error);
    return "";
  }
}

function persistTheme(theme) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Failed to persist theme preference", error);
    throw new Error(`Failed to persist theme preference. ${normalizeError(error)}`);
  }
}

function readInitialAppVisibility() {
  if (typeof document === "undefined") {
    return true;
  }

  const isVisible = document.visibilityState !== "hidden";
  const isFocused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
  return isVisible && isFocused;
}

function createInitialDesktopRuntime() {
  const available = isTauriAvailable();
  return {
    available,
    synced: !available,
    lifecycle: "",
    windowState: null,
  };
}

function mergeDesktopWindowState(previousState, nextState) {
  if (!previousState || !nextState) {
    return nextState;
  }

  return previousState.label === nextState.label &&
    previousState.visible === nextState.visible &&
    previousState.focused === nextState.focused &&
    previousState.minimized === nextState.minimized &&
    previousState.maximized === nextState.maximized &&
    previousState.fullscreen === nextState.fullscreen &&
    previousState.resizable === nextState.resizable &&
    previousState.decorated === nextState.decorated &&
    previousState.width === nextState.width &&
    previousState.height === nextState.height &&
    previousState.scaleFactor === nextState.scaleFactor
    ? previousState
    : nextState;
}

function reuseEqualArray(previousItems, nextItems, isEqual) {
  if (!Array.isArray(nextItems)) {
    return nextItems;
  }
  if (!Array.isArray(previousItems) || previousItems.length !== nextItems.length) {
    return nextItems;
  }

  let changed = false;
  const mergedItems = nextItems.map((item, index) => {
    const previousItem = previousItems[index];
    if (isEqual(previousItem, item)) {
      return previousItem;
    }
    changed = true;
    return item;
  });

  return changed ? mergedItems : previousItems;
}

function reuseEqualItem(previousItem, nextItem, isEqual) {
  if (!previousItem || !nextItem) {
    return nextItem;
  }
  return isEqual(previousItem, nextItem) ? previousItem : nextItem;
}

function isSamePrimitiveArray(previousItems, nextItems) {
  if (previousItems === nextItems) {
    return true;
  }
  if (!Array.isArray(previousItems) || !Array.isArray(nextItems)) {
    return false;
  }
  if (previousItems.length !== nextItems.length) {
    return false;
  }
  return previousItems.every((item, index) => item === nextItems[index]);
}

function isSameStringArray(previousItems, nextItems) {
  return isSamePrimitiveArray(previousItems, nextItems);
}

function isSameCapability(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.description === nextItem?.description &&
    previousItem?.status === nextItem?.status
  );
}

function isSameWorkspaceSettings(previousItem, nextItem) {
  return (
    previousItem?.providerName === nextItem?.providerName &&
    previousItem?.baseUrl === nextItem?.baseUrl &&
    Boolean(previousItem?.hasApiKey) === Boolean(nextItem?.hasApiKey) &&
    previousItem?.apiKey === nextItem?.apiKey &&
    previousItem?.model === nextItem?.model &&
    previousItem?.systemPrompt === nextItem?.systemPrompt
  );
}

function isSameSessionSummary(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.status === nextItem?.status &&
    previousItem?.updatedAt === nextItem?.updatedAt &&
    previousItem?.messageCount === nextItem?.messageCount &&
    previousItem?.lastMessagePreview === nextItem?.lastMessagePreview &&
    previousItem?.mountedSkillCount === nextItem?.mountedSkillCount
  );
}

function isSameMessage(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.role === nextItem?.role &&
    previousItem?.content === nextItem?.content &&
    previousItem?.createdAt === nextItem?.createdAt
  );
}

function isSameActivityItem(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.kind === nextItem?.kind &&
    previousItem?.title === nextItem?.title &&
    previousItem?.detail === nextItem?.detail &&
    previousItem?.status === nextItem?.status &&
    previousItem?.createdAt === nextItem?.createdAt
  );
}

function isSameNoteSummary(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.icon === nextItem?.icon &&
    previousItem?.title === nextItem?.title &&
    previousItem?.summary === nextItem?.summary &&
    isSameStringArray(previousItem?.tags, nextItem?.tags) &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameNoteDetail(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.icon === nextItem?.icon &&
    previousItem?.title === nextItem?.title &&
    previousItem?.summary === nextItem?.summary &&
    previousItem?.body === nextItem?.body &&
    isSameStringArray(previousItem?.tags, nextItem?.tags) &&
    previousItem?.createdAt === nextItem?.createdAt &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameReminderSummary(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.preview === nextItem?.preview &&
    previousItem?.dueAt === nextItem?.dueAt &&
    previousItem?.severity === nextItem?.severity &&
    previousItem?.status === nextItem?.status &&
    previousItem?.linkedNoteId === nextItem?.linkedNoteId &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameReminderDetail(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.title === nextItem?.title &&
    previousItem?.detail === nextItem?.detail &&
    previousItem?.preview === nextItem?.preview &&
    previousItem?.dueAt === nextItem?.dueAt &&
    previousItem?.severity === nextItem?.severity &&
    previousItem?.status === nextItem?.status &&
    previousItem?.linkedNoteId === nextItem?.linkedNoteId &&
    previousItem?.createdAt === nextItem?.createdAt &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function isSameSkillSummary(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.name === nextItem?.name &&
    previousItem?.summary === nextItem?.summary &&
    previousItem?.triggerHint === nextItem?.triggerHint &&
    previousItem?.recommendationReason === nextItem?.recommendationReason &&
    Boolean(previousItem?.enabled) === Boolean(nextItem?.enabled)
  );
}

function isSameSkillDetail(previousItem, nextItem) {
  return (
    previousItem?.id === nextItem?.id &&
    previousItem?.name === nextItem?.name &&
    previousItem?.summary === nextItem?.summary &&
    previousItem?.description === nextItem?.description &&
    previousItem?.instructions === nextItem?.instructions &&
    previousItem?.triggerHint === nextItem?.triggerHint &&
    Boolean(previousItem?.enabled) === Boolean(nextItem?.enabled) &&
    previousItem?.permissionLevel === nextItem?.permissionLevel &&
    previousItem?.createdAt === nextItem?.createdAt &&
    previousItem?.updatedAt === nextItem?.updatedAt
  );
}

function mergeSessionDetail(previousItem, nextItem) {
  if (!previousItem || !nextItem) {
    return nextItem;
  }

  const mergedSession = reuseEqualItem(previousItem.session, nextItem.session, isSameSessionSummary);
  const mergedMessages = reuseEqualArray(previousItem.messages, nextItem.messages, isSameMessage);
  const mergedActivity = reuseEqualArray(
    previousItem.activity,
    nextItem.activity,
    isSameActivityItem
  );
  const mergedMountedSkillIds = reuseEqualArray(
    previousItem.mountedSkillIds,
    nextItem.mountedSkillIds,
    (left, right) => left === right
  );
  const mergedMountedSkills = reuseEqualArray(
    previousItem.mountedSkills,
    nextItem.mountedSkills,
    isSameSkillSummary
  );
  const mergedRecommendedSkills = reuseEqualArray(
    previousItem.recommendedSkills,
    nextItem.recommendedSkills,
    isSameSkillSummary
  );

  if (
    previousItem.session === mergedSession &&
    previousItem.messages === mergedMessages &&
    previousItem.activity === mergedActivity &&
    previousItem.mountedSkillIds === mergedMountedSkillIds &&
    previousItem.mountedSkills === mergedMountedSkills &&
    previousItem.recommendedSkills === mergedRecommendedSkills
  ) {
    return previousItem;
  }

  return {
    ...nextItem,
    session: mergedSession,
    messages: mergedMessages,
    activity: mergedActivity,
    mountedSkillIds: mergedMountedSkillIds,
    mountedSkills: mergedMountedSkills,
    recommendedSkills: mergedRecommendedSkills,
  };
}

function mergeWorkspaceSnapshot(previousSnapshot, nextSnapshot) {
  if (!previousSnapshot) {
    return nextSnapshot;
  }
  if (!nextSnapshot) {
    return nextSnapshot;
  }

  const mergedSettings = reuseEqualItem(
    previousSnapshot.settings,
    nextSnapshot.settings,
    isSameWorkspaceSettings
  );
  const mergedCapabilities = reuseEqualArray(
    previousSnapshot.capabilities,
    nextSnapshot.capabilities,
    isSameCapability
  );
  const mergedSessions = reuseEqualArray(
    previousSnapshot.sessions,
    nextSnapshot.sessions,
    isSameSessionSummary
  );
  const mergedActiveSession = mergeSessionDetail(
    previousSnapshot.activeSession,
    nextSnapshot.activeSession
  );
  const mergedNotes = reuseEqualArray(previousSnapshot.notes, nextSnapshot.notes, isSameNoteSummary);
  const mergedActiveNote = reuseEqualItem(
    previousSnapshot.activeNote,
    nextSnapshot.activeNote,
    isSameNoteDetail
  );
  const mergedReminders = reuseEqualArray(
    previousSnapshot.reminders,
    nextSnapshot.reminders,
    isSameReminderSummary
  );
  const mergedActiveReminder = reuseEqualItem(
    previousSnapshot.activeReminder,
    nextSnapshot.activeReminder,
    isSameReminderDetail
  );
  const mergedSkills = reuseEqualArray(previousSnapshot.skills, nextSnapshot.skills, isSameSkillSummary);
  const mergedActiveSkill = reuseEqualItem(
    previousSnapshot.activeSkill,
    nextSnapshot.activeSkill,
    isSameSkillDetail
  );

  if (
    previousSnapshot.settings === mergedSettings &&
    previousSnapshot.capabilities === mergedCapabilities &&
    previousSnapshot.sessions === mergedSessions &&
    previousSnapshot.activeSessionId === nextSnapshot.activeSessionId &&
    previousSnapshot.activeSession === mergedActiveSession &&
    previousSnapshot.notes === mergedNotes &&
    previousSnapshot.activeNoteId === nextSnapshot.activeNoteId &&
    previousSnapshot.activeNote === mergedActiveNote &&
    previousSnapshot.reminders === mergedReminders &&
    previousSnapshot.activeReminderId === nextSnapshot.activeReminderId &&
    previousSnapshot.activeReminder === mergedActiveReminder &&
    previousSnapshot.skills === mergedSkills &&
    previousSnapshot.activeSkillId === nextSnapshot.activeSkillId &&
    previousSnapshot.activeSkill === mergedActiveSkill
  ) {
    return previousSnapshot;
  }

  return {
    ...nextSnapshot,
    settings: mergedSettings,
    capabilities: mergedCapabilities,
    sessions: mergedSessions,
    activeSession: mergedActiveSession,
    notes: mergedNotes,
    activeNote: mergedActiveNote,
    reminders: mergedReminders,
    activeReminder: mergedActiveReminder,
    skills: mergedSkills,
    activeSkill: mergedActiveSkill,
  };
}

function App() {
  const { lang, setLang, t } = useI18n();
  const [workspace, setWorkspace] = useState(null);
  const [currentView, setCurrentView] = useState("today");
  const [theme, setTheme] = useState(() => {
    const savedTheme = readStoredTheme();
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    if (typeof window === "undefined") {
      return "dark";
    }
    return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [settingsForm, setSettingsForm] = useState({
    providerName: "OpenAI Compatible",
    baseUrl: "",
    clearApiKey: false,
    hasApiKey: false,
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
  const [isReminderCompletionOpen, setIsReminderCompletionOpen] = useState(false);
  const [reminderCompletionDraft, setReminderCompletionDraft] = useState({
    ...EMPTY_REMINDER_COMPLETION_DRAFT,
  });
  const [activeInspectorTab, setActiveInspectorTab] = useState("runtime");
  const [collapsedSessionGroups, setCollapsedSessionGroups] = useState({});
  const [collapsedSessionPreviews, setCollapsedSessionPreviews] = useState({});
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [isAppVisible, setIsAppVisible] = useState(() => readInitialAppVisibility());
  const [desktopRuntime, setDesktopRuntime] = useState(() => createInitialDesktopRuntime());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [galleryItems, setGalleryItems] = useState(() => readGalleryItems());
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [galleryViewerId, setGalleryViewerId] = useState("");
  const [weatherLocations, setWeatherLocations] = useState(() => readWeatherLocations());
  const [selectedWeatherCityId, setSelectedWeatherCityId] = useState(() => readWeatherLocations()[0]?.id || WEATHER_LOCATIONS[0].id);
  const [weatherCities, setWeatherCities] = useState(() => createInitialWeatherCities(readWeatherLocations()));
  const [weatherAuxCacheVersion, setWeatherAuxCacheVersion] = useState(0);
  const [weatherStatus, setWeatherStatus] = useState("loading");
  const [weatherError, setWeatherError] = useState("");
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState(0);
  const [tracks, setTracks] = useState(BUILT_IN_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState(BUILT_IN_TRACKS[0].id);
  const [autoPlayOnReply, setAutoPlayOnReply] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(72);
  const [playMode, setPlayMode] = useState("loop");
  const [playerAudioElement, setPlayerAudioElement] = useState(null);
  const [skillHistoryMap, setSkillHistoryMap] = useState(() => readSkillHistory());
  const [lyricsCache, setLyricsCache] = useState(() => readLyricsCache());
  const [lyricsCacheClearMarker, setLyricsCacheClearMarker] = useState(() => readLyricsCacheClearMarker());
  const [lyricsLookupState, setLyricsLookupState] = useState({});
  const deferredNoteSearch = useDeferredValue(noteSearch);
  const deferredSessionSearch = useDeferredValue(sessionSearch);

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
  const uploadedTrackUrlsRef = useRef(new Set());
  const pendingWorkspaceSyncRef = useRef(false);
  const hasUnsavedWorkspaceDraftsRef = useRef(false);
  const busyRef = useRef("");
  const loadingRef = useRef(true);
  const mobileDrawerPanelRef = useRef(null);
  const inspectorDrawerPanelRef = useRef(null);
  const reminderCompletionPanelRef = useRef(null);
  const lastMobileNavTriggerRef = useRef(null);
  const lastInspectorTriggerRef = useRef(null);
  const lastReminderCompletionTriggerRef = useRef(null);
  const weatherRequestIdRef = useRef(0);
  const weatherAbortControllerRef = useRef(null);
  const lyricsRequestVersionRef = useRef({});
  const runAgentRequestVersionRef = useRef(0);
  const forgeSkillRequestVersionRef = useRef(0);
  const forgeSkillAbortControllerRef = useRef(null);
  const openView = useCallback(
    (viewId) => {
      if (!viewId) {
        return;
      }
      if (viewId !== currentView) {
        setNotice("");
      }
      setCurrentView(viewId);
      setIsMobileNavOpen(false);
    },
    [currentView]
  );
  const loadWeatherSnapshotData = useCallback(async (locations) => {
    const sourceLocations =
      Array.isArray(locations) && locations.length > 0 ? locations : weatherLocations;
    const requestId = weatherRequestIdRef.current + 1;
    const controller = new AbortController();

    weatherRequestIdRef.current = requestId;
    weatherAbortControllerRef.current?.abort();
    weatherAbortControllerRef.current = controller;

    setWeatherStatus("loading");
    setWeatherError("");
    setWeatherCities(createInitialWeatherCities(sourceLocations));
    try {
      const nextCities = await fetchWeatherSnapshots(sourceLocations, {
        signal: controller.signal,
      });
      if (weatherRequestIdRef.current !== requestId) {
        return;
      }
      setWeatherCities(nextCities);
      setWeatherUpdatedAt(Date.now());
      setWeatherStatus(nextCities.some((city) => city.fetchFailed) ? "partial" : "ready");
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      if (weatherRequestIdRef.current !== requestId) {
        return;
      }
      setWeatherStatus("error");
      setWeatherError(normalizeError(err));
    } finally {
      if (weatherAbortControllerRef.current === controller) {
        weatherAbortControllerRef.current = null;
      }
    }
  }, [weatherLocations]);
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

  const updateGalleryItems = useCallback((updater) => {
    try {
      const nextItems = updateStoredGalleryItems(updater);
      setGalleryItems(nextItems);
      return { ok: true, value: nextItems };
    } catch (err) {
      setError(t("app.settings.cache.writeFailed", { detail: normalizeError(err) }));
      return { ok: false, value: null };
    }
  }, [t]);

  const updateWeatherLocations = useCallback((updater) => {
    try {
      const nextLocations = updateStoredWeatherLocations(updater);
      setWeatherLocations(nextLocations);
      return { ok: true, value: nextLocations };
    } catch (err) {
      setError(t("app.settings.cache.writeFailed", { detail: normalizeError(err) }));
      return { ok: false, value: null };
    }
  }, [t]);

  const updateSkillHistoryMap = useCallback((updater) => {
    try {
      const nextHistoryMap = updateStoredSkillHistory(updater);
      setSkillHistoryMap(nextHistoryMap);
      return { ok: true, value: nextHistoryMap };
    } catch (err) {
      setError(t("app.settings.cache.writeFailed", { detail: normalizeError(err) }));
      return { ok: false, value: null };
    }
  }, [t]);

  const updateLyricsCache = useCallback((updater) => {
    try {
      const nextLyricsCache = updateStoredLyricsCache(updater);
      setLyricsCache(nextLyricsCache);
      return { ok: true, value: nextLyricsCache };
    } catch (err) {
      setError(t("app.settings.cache.writeFailed", { detail: normalizeError(err) }));
      return { ok: false, value: null };
    }
  }, [t]);

  const syncWorkspaceFromStorage = useCallback(async (options = {}) => {
    const syncDeferredMessage = t("app.workspace.syncDeferred");
    if (
      !options.force &&
      (hasUnsavedWorkspaceDraftsRef.current || busyRef.current !== "" || loadingRef.current)
    ) {
      pendingWorkspaceSyncRef.current = true;
      setError(syncDeferredMessage);
      return;
    }

    try {
      const snapshot = await bootstrap();
      startTransition(() => {
        setWorkspace((current) => mergeWorkspaceSnapshot(current, snapshot));
      });
      pendingWorkspaceSyncRef.current = false;
      setError((current) => (current === syncDeferredMessage ? "" : current));
      return true;
    } catch (err) {
      if (options.force) {
        pendingWorkspaceSyncRef.current = true;
      }
      setError(normalizeError(err));
      return false;
    }
  }, [t]);

  const commitWorkspaceSnapshot = useCallback((snapshot) => {
    if (!snapshot) {
      return;
    }

    startTransition(() => {
      setWorkspace((current) => mergeWorkspaceSnapshot(current, snapshot));
    });
  }, []);

  const syncGalleryCacheFromStorage = useCallback(() => {
    const nextItems = readGalleryItems();
    setGalleryItems(nextItems);
    setGalleryViewerId((prev) => (nextItems.some((item) => item.id === prev) ? prev : ""));
  }, []);

  const syncWeatherCacheFromStorage = useCallback(() => {
    const nextLocations = readWeatherLocations();
    setWeatherLocations(nextLocations);
    setSelectedWeatherCityId((prev) =>
      nextLocations.some((location) => location.id === prev)
        ? prev
        : nextLocations[0]?.id || WEATHER_LOCATIONS[0].id
    );
  }, []);

  const syncSkillHistoryFromStorage = useCallback(() => {
    setSkillHistoryMap(readSkillHistory());
  }, []);

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
    let cancelled = false;

    const loadWorkspace = async () => {
      setLoading(true);
      setError("");
      try {
        const snapshot = await bootstrap();
        if (!cancelled) {
          commitWorkspaceSnapshot(snapshot);
        }
      } catch (err) {
        if (!cancelled) {
          setError(normalizeError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [commitWorkspaceSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const syncAppVisibility = () => {
      setIsAppVisible(readInitialAppVisibility());
    };

    syncAppVisibility();
    window.addEventListener("focus", syncAppVisibility);
    window.addEventListener("blur", syncAppVisibility);
    document.addEventListener("visibilitychange", syncAppVisibility);

    return () => {
      window.removeEventListener("focus", syncAppVisibility);
      window.removeEventListener("blur", syncAppVisibility);
      document.removeEventListener("visibilitychange", syncAppVisibility);
    };
  }, []);

  useEffect(() => {
    if (!isTauriAvailable()) {
      return undefined;
    }

    let disposed = false;
    const unlistenCallbacks = [];

    const applyWindowState = (nextState) => {
      if (disposed || !nextState) {
        return;
      }

      setDesktopRuntime((current) => ({
        ...current,
        available: true,
        synced: true,
        windowState: mergeDesktopWindowState(current.windowState, nextState),
      }));

      if (typeof nextState.visible === "boolean" || typeof nextState.focused === "boolean") {
        setIsAppVisible(Boolean(nextState.visible) && Boolean(nextState.focused));
      }
    };

    const connectDesktopRuntime = async () => {
      try {
        const nextState = await getDesktopWindowState();
        applyWindowState(nextState);
      } catch (err) {
        console.error("Failed to read initial desktop window state", err);
        if (!disposed) {
          setDesktopRuntime((current) => ({
            ...current,
            available: true,
            synced: false,
          }));
        }
      }

      try {
        const unlistenWindowState = await listenToDesktopWindowState((payload) => {
          applyWindowState(payload);
        });

        if (disposed) {
          await unlistenWindowState?.();
          return;
        }

        unlistenCallbacks.push(unlistenWindowState);
      } catch (err) {
        console.error("Failed to listen to desktop window state", err);
      }

      try {
        const unlistenLifecycle = await listenToDesktopLifecycle((payload) => {
          if (disposed) {
            return;
          }

          const reason = String(payload?.reason || "");
          setDesktopRuntime((current) => ({
            ...current,
            available: true,
            synced: true,
            lifecycle: reason,
          }));

          if (reason === "restored-from-tray") {
            setNotice(t("app.desktop.runtime.notice.restored"));
          }
        });

        if (disposed) {
          await unlistenLifecycle?.();
          return;
        }

        unlistenCallbacks.push(unlistenLifecycle);
      } catch (err) {
        console.error("Failed to listen to desktop lifecycle", err);
      }
    };

    void connectDesktopRuntime();

    return () => {
      disposed = true;
      Promise.all(
        unlistenCallbacks.map(async (unlisten) => {
          if (typeof unlisten === "function") {
            await unlisten();
          }
        })
      ).catch((err) => {
        console.error("Failed to detach desktop listeners", err);
      });
    };
  }, [t]);

  useEffect(() => {
    if (typeof window === "undefined" || !isAppVisible) {
      return undefined;
    }

    let timer = 0;

    const syncClock = () => {
      const now = Date.now();
      setClockNow(now);
      const nextDelay = Math.max(1000, 60000 - (now % 60000) + 40);
      timer = window.setTimeout(syncClock, nextDelay);
    };

    syncClock();

    return () => {
      window.clearTimeout(timer);
    };
  }, [isAppVisible]);

  useEffect(() => {
    if (audioRef.current) {
      setPlayerAudioElement(audioRef.current);
    }
  }, [selectedTrackId]);

  useEffect(() => {
    void loadWeatherSnapshotData(weatherLocations);
  }, [loadWeatherSnapshotData, weatherLocations]);

  useEffect(
    () => () => {
      weatherRequestIdRef.current += 1;
      weatherAbortControllerRef.current?.abort();
      weatherAbortControllerRef.current = null;
    },
    []
  );

  useEffect(
    () => () => {
      runAgentRequestVersionRef.current += 1;
      forgeSkillRequestVersionRef.current += 1;
      forgeSkillAbortControllerRef.current?.abort();
      forgeSkillAbortControllerRef.current = null;
    },
    []
  );

  useEffect(() => {
    try {
      persistTheme(theme);
    } catch (err) {
      setError(t("app.preference.persistFailed", { detail: normalizeError(err) }));
    }
  }, [t, theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorage = (event) => {
      if (event.storageArea !== window.localStorage) {
        return;
      }

      if (!event.key) {
        void syncWorkspaceFromStorage();
        syncGalleryCacheFromStorage();
        syncWeatherCacheFromStorage();
        setWeatherAuxCacheVersion((prev) => prev + 1);
        syncSkillHistoryFromStorage();
        syncLyricsClearMarkerFromStorage();
        syncLyricsCacheFromStorage();
        return;
      }

      if (event.key === PREVIEW_WORKSPACE_STORAGE_KEY) {
        void syncWorkspaceFromStorage();
        return;
      }

      if (event.key === GALLERY_STORAGE_KEY || event.key === LEGACY_ALBUM_STORAGE_KEY) {
        syncGalleryCacheFromStorage();
        return;
      }

      if (
        event.key === WEATHER_LOCATIONS_STORAGE_KEY
      ) {
        syncWeatherCacheFromStorage();
        return;
      }

      if (
        event.key === WEATHER_RECENT_SEARCHES_STORAGE_KEY ||
        event.key === WEATHER_USAGE_STORAGE_KEY
      ) {
        setWeatherAuxCacheVersion((prev) => prev + 1);
        return;
      }

      if (event.key === SKILL_HISTORY_STORAGE_KEY) {
        syncSkillHistoryFromStorage();
        return;
      }

      if (event.key === LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY) {
        syncLyricsClearMarkerFromStorage();
        return;
      }

      if (event.key === LYRICS_CACHE_STORAGE_KEY) {
        syncLyricsCacheFromStorage();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [
    syncGalleryCacheFromStorage,
    syncLyricsCacheFromStorage,
    syncLyricsClearMarkerFromStorage,
    syncSkillHistoryFromStorage,
    syncWeatherCacheFromStorage,
    syncWorkspaceFromStorage,
  ]);

  useEffect(() => {
    if (lyricsCacheClearMarker) {
      setLyricsLookupState(buildLyricsLookupStateWithClearMarker(lyricsCache, localizedTracks));
      return;
    }

    setLyricsLookupState((prev) => clearClearedLyricsLookupState(prev));
  }, [localizedTracks, lyricsCache, lyricsCacheClearMarker]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleLangPersistError = (event) => {
      setError(
        t("app.preference.persistFailed", {
          detail: normalizeError(event?.detail),
        })
      );
    };

    window.addEventListener(LANG_PERSIST_ERROR_EVENT, handleLangPersistError);
    return () => window.removeEventListener(LANG_PERSIST_ERROR_EVENT, handleLangPersistError);
  }, [t]);

  useEffect(() => {
    if (busy && busy !== "forge-skill") {
      setNotice("");
    }
  }, [busy]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const nextUrls = new Set(
      tracks
        .map((track) => track?.src)
        .filter((src) => typeof src === "string" && src.startsWith("blob:"))
    );

    uploadedTrackUrlsRef.current.forEach((url) => {
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
      uploadedTrackUrlsRef.current.forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
      uploadedTrackUrlsRef.current.clear();
    },
    []
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.appVisibility = isAppVisible ? "visible" : "hidden";
    document.documentElement.dataset.desktopRuntime = desktopRuntime.available ? "tauri" : "web";
    document.documentElement.dataset.desktopVisibility =
      desktopRuntime.windowState?.visible === false ? "tray" : "visible";
    document.documentElement.dataset.desktopFocus =
      desktopRuntime.windowState?.focused === false ? "background" : "focused";
    document.documentElement.style.colorScheme = theme;
  }, [desktopRuntime.available, desktopRuntime.windowState?.focused, desktopRuntime.windowState?.visible, isAppVisible, theme]);

  useEffect(
    () => {
      if (!isInspectorOpen && !isMobileNavOpen && !isReminderCompletionOpen) {
        return undefined;
      }

      const activePanel = isReminderCompletionOpen
        ? reminderCompletionPanelRef.current
        : isInspectorOpen
          ? inspectorDrawerPanelRef.current
          : mobileDrawerPanelRef.current;

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          if (isReminderCompletionOpen) {
            setIsReminderCompletionOpen(false);
            return;
          }
          setIsInspectorOpen(false);
          setIsMobileNavOpen(false);
          return;
        }

        if (event.key === "Tab" && activePanel) {
          trapFocusWithinPanel(event, activePanel);
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

      const focusTimer =
        typeof window !== "undefined"
          ? window.setTimeout(() => focusDialogPanel(activePanel), 0)
          : 0;

      return () => {
        if (typeof document !== "undefined") {
          document.body.style.overflow = previousOverflow;
        }
        if (typeof window !== "undefined") {
          window.clearTimeout(focusTimer);
          window.removeEventListener("keydown", handleKeyDown);
        }
      };
    },
    [isInspectorOpen, isMobileNavOpen, isReminderCompletionOpen]
  );

  useEffect(() => {
    if (isMobileNavOpen) {
      return;
    }

    const trigger = lastMobileNavTriggerRef.current;
    if (trigger?.isConnected) {
      trigger.focus();
    }
    lastMobileNavTriggerRef.current = null;
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (isReminderCompletionOpen) {
      return;
    }

    const trigger = lastReminderCompletionTriggerRef.current;
    if (trigger?.isConnected) {
      trigger.focus();
    }
    lastReminderCompletionTriggerRef.current = null;
  }, [isReminderCompletionOpen]);

  useEffect(() => {
    if (isInspectorOpen) {
      return;
    }

    const trigger = lastInspectorTriggerRef.current;
    if (trigger?.isConnected) {
      trigger.focus();
    }
    lastInspectorTriggerRef.current = null;
  }, [isInspectorOpen]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentView]);

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

  const activeSession = workspace?.activeSession;
  const activeSessionId = workspace?.activeSessionId;
  const sessionList = workspace?.sessions ?? EMPTY_LIST;
  const capabilities = workspace?.capabilities ?? EMPTY_LIST;
  const noteList = workspace?.notes ?? EMPTY_LIST;
  const reminders = workspace?.reminders ?? EMPTY_LIST;
  const skillList = workspace?.skills ?? EMPTY_LIST;
  const activeNote = workspace?.activeNote;
  const activeNoteId = workspace?.activeNoteId;
  const activeSkill = workspace?.activeSkill;
  const activeSkillId = workspace?.activeSkillId;
  const activeSessionSkillIds = activeSession?.mountedSkillIds ?? EMPTY_LIST;
  const activeSessionSkills = activeSession?.mountedSkills ?? EMPTY_LIST;
  const activeSessionRecommendedSkills = activeSession?.recommendedSkills ?? EMPTY_LIST;
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

  const handleRefreshLyrics = useCallback(async (options = {}) => {
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

  const selectedReminder = workspace?.activeReminder || null;
  const lastAssistantMessageId = useMemo(() => {
    const lastMessage = activeSession?.messages?.[activeSession.messages.length - 1];
    return lastMessage?.role === "assistant" ? lastMessage.id : null;
  }, [activeSession]);

  const providerConfigured = useMemo(() => {
    const settings = workspace?.settings;
    return Boolean(
      settings?.baseUrl?.trim() &&
      (settings?.hasApiKey || settings?.apiKey?.trim()) &&
      settings?.model?.trim()
    );
  }, [workspace]);
  const providerSecurityAssessment = useMemo(
    () => assessProviderBaseUrl(settingsForm.baseUrl),
    [settingsForm.baseUrl]
  );
  const providerSecurityMessage = useMemo(() => {
    switch (providerSecurityAssessment.reason) {
      case "trustedHost":
        return t("app.settings.providerSecurity.trusted", {
          host: providerSecurityAssessment.host,
        });
      case "localHost":
        return t("app.settings.providerSecurity.local", {
          host: providerSecurityAssessment.host,
        });
      case "untrustedHost":
        return t("app.settings.providerSecurity.untrusted", {
          host: providerSecurityAssessment.host,
        });
      case "invalidUrl":
        return t("app.settings.providerSecurity.invalidUrl");
      case "missingHost":
        return t("app.settings.providerSecurity.missingHost");
      case "unsupportedScheme":
        return t("app.settings.providerSecurity.unsupportedScheme");
      case "embeddedCredentials":
        return t("app.settings.providerSecurity.embeddedCredentials");
      case "queryOrFragment":
        return t("app.settings.providerSecurity.queryOrFragment");
      case "remoteHttp":
        return t("app.settings.providerSecurity.remoteHttp");
      default:
        return "";
    }
  }, [providerSecurityAssessment, t]);

  const filteredNotes = useMemo(() => {
    if (!deferredNoteSearch.trim()) {
      return noteList;
    }
    const needle = deferredNoteSearch.trim().toLowerCase();
    return noteList.filter((note) =>
      [note.title, note.summary, ...(note.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [deferredNoteSearch, noteList]);

  const filteredSessions = useMemo(() => {
    if (!deferredSessionSearch.trim()) {
      return sessionList;
    }
    const needle = deferredSessionSearch.trim().toLowerCase();
    return sessionList.filter((session) =>
      [session.title, session.lastMessagePreview, t(`app.status.${session.status}`)]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [deferredSessionSearch, sessionList, t]);

  const groupedSessions = useMemo(() => {
    const groups = {
      today: [],
      week: [],
      earlier: [],
    };
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
    const currentSettings = workspace.settings;
    return (
      Boolean(settingsForm.clearApiKey) ||
      Boolean(settingsForm.apiKey?.trim()) ||
      (settingsForm.providerName || "") !== (currentSettings.providerName || "") ||
      (settingsForm.baseUrl || "") !== (currentSettings.baseUrl || "") ||
      (settingsForm.model || "") !== (currentSettings.model || "") ||
      (settingsForm.systemPrompt || "") !== (currentSettings.systemPrompt || "")
    );
  }, [settingsForm, workspace]);

  const hasUnsavedNote = useMemo(() => {
    if (!activeNote) {
      return false;
    }
    return (
      noteDraft.icon !== (activeNote.icon || "*") ||
      noteDraft.title !== (activeNote.title || "") ||
      noteDraft.body !== (activeNote.body || "") ||
      noteDraft.tagsText !== (activeNote.tags || []).join(", ")
    );
  }, [activeNote, noteDraft]);

  const hasUnsavedReminder = useMemo(() => {
    if (!selectedReminder) {
      return false;
    }
    return (
      reminderDraft.title !== (selectedReminder.title || "") ||
      reminderDraft.detail !== (selectedReminder.detail || "") ||
      reminderDraft.dueAt !==
        (selectedReminder.dueAt ? toDateTimeLocalValue(selectedReminder.dueAt) : "") ||
      reminderDraft.severity !== (selectedReminder.severity || "medium") ||
      reminderDraft.status !== (selectedReminder.status || "scheduled") ||
      String(reminderDraft.linkedNoteId || "") !== String(selectedReminder.linkedNoteId || "")
    );
  }, [reminderDraft, selectedReminder]);

  const hasUnsavedSkill = useMemo(() => {
    if (!activeSkill) {
      return false;
    }
    return (
      skillDraft.name !== (activeSkill.name || "") ||
      skillDraft.description !== (activeSkill.description || "") ||
      skillDraft.instructions !== (activeSkill.instructions || "") ||
      skillDraft.triggerHint !== (activeSkill.triggerHint || "") ||
      Boolean(skillDraft.enabled) !== Boolean(activeSkill.enabled)
    );
  }, [activeSkill, skillDraft]);
  const hasUnsavedWorkspaceDrafts =
    hasUnsavedSettings || hasUnsavedNote || hasUnsavedReminder || hasUnsavedSkill;
  const skillActionContextKey = useMemo(
    () =>
      JSON.stringify({
        activeSessionId: activeSessionId || 0,
        hasUnsavedWorkspaceDrafts,
        providerName: settingsForm.providerName || "",
        baseUrl: settingsForm.baseUrl || "",
        clearApiKey: Boolean(settingsForm.clearApiKey),
        hasApiKey: Boolean(settingsForm.hasApiKey),
        apiKey: settingsForm.apiKey || "",
        model: settingsForm.model || "",
        systemPrompt: settingsForm.systemPrompt || "",
      }),
    [activeSessionId, hasUnsavedWorkspaceDrafts, settingsForm]
  );

  useEffect(() => {
    hasUnsavedWorkspaceDraftsRef.current = hasUnsavedWorkspaceDrafts;
  }, [hasUnsavedWorkspaceDrafts]);

  useEffect(() => {
    if (workspace?.settings && !hasUnsavedSettings) {
      setSettingsForm({
        ...workspace.settings,
        clearApiKey: false,
      });
    }

    if (workspace?.activeNote && (!hasUnsavedNote || noteDraft.id !== workspace.activeNote.id)) {
      setNoteDraft({
        id: workspace.activeNote.id,
        icon: workspace.activeNote.icon || "*",
        title: workspace.activeNote.title || "",
        body: workspace.activeNote.body || "",
        tagsText: (workspace.activeNote.tags || []).join(", "),
      });
    }

    if (workspace?.activeSkill) {
      if (!hasUnsavedSkill || skillDraft.id !== workspace.activeSkill.id) {
        setSkillDraft({
          id: workspace.activeSkill.id,
          name: workspace.activeSkill.name || "",
          description: workspace.activeSkill.description || "",
          instructions: workspace.activeSkill.instructions || "",
          triggerHint: workspace.activeSkill.triggerHint || "",
          enabled: Boolean(workspace.activeSkill.enabled),
        });
      }
    } else {
      setSkillDraft({ ...EMPTY_SKILL_DRAFT });
    }
  }, [
    hasUnsavedNote,
    hasUnsavedSettings,
    hasUnsavedSkill,
    noteDraft.id,
    skillDraft.id,
    workspace,
  ]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (hasUnsavedWorkspaceDrafts || busy !== "" || loading || !pendingWorkspaceSyncRef.current) {
      return;
    }

    void syncWorkspaceFromStorage({ force: true });
  }, [busy, hasUnsavedWorkspaceDrafts, loading, syncWorkspaceFromStorage]);

  const confirmDiscardWorkspaceDrafts = useCallback(() => {
    if (!hasUnsavedWorkspaceDrafts) {
      return true;
    }

    if (typeof window === "undefined") {
      return false;
    }

    return window.confirm(t("app.common.discardChangesConfirm"));
  }, [hasUnsavedWorkspaceDrafts, t]);

  const handleSelectReminder = useCallback(async (reminderId, options = {}) => {
    if (!reminderId || reminderId === selectedReminderId) {
      return false;
    }

    if (busy !== "" || loading) {
      return false;
    }

    if (!options.force && hasUnsavedReminder && !confirmDiscardWorkspaceDrafts()) {
      return false;
    }

    setBusy("open-reminder");
    setError("");
    try {
      const snapshot = await openReminder({
        reminderId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      setSelectedReminderId(snapshot.activeReminderId || reminderId);
      return true;
    } catch (err) {
      setError(normalizeError(err));
      return false;
    } finally {
      setBusy("");
    }
  }, [
    activeSessionId,
    busy,
    commitWorkspaceSnapshot,
    confirmDiscardWorkspaceDrafts,
    hasUnsavedReminder,
    loading,
    selectedReminderId,
  ]);

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

  const openReminderCount = useMemo(() => selectOpenReminderCount(reminders), [reminders]);

  const dueReminderCount = useMemo(
    () => selectDueReminderCount(reminders, clockNow),
    [clockNow, reminders]
  );
  const todayReminderItems = useMemo(
    () => selectTodayReminderItems(reminders, clockNow),
    [clockNow, reminders]
  );
  const completedTodayItems = useMemo(
    () => selectCompletedTodayItems(reminders, clockNow),
    [clockNow, reminders]
  );
  const recurringReminderPatterns = useMemo(
    () => selectRecurringReminderPatterns(reminders, clockNow),
    [clockNow, reminders]
  );
  const recurringPatternInsights = useMemo(
    () =>
      buildRecurringPatternInsights({
        activeSessionSkillIds,
        clockNow,
        recurringReminderPatterns,
        reminders,
        skillList,
      }),
    [activeSessionSkillIds, clockNow, recurringReminderPatterns, reminders, skillList]
  );
  const todayReviewSignals = useMemo(
    () =>
      buildTodayReviewSignals({
        clockNow,
        noteList,
        recurringPatternInsights,
        reminders,
        t,
      }),
    [clockNow, noteList, recurringPatternInsights, reminders, t]
  );
  const ruleEffectivenessInsights = useMemo(
    () =>
      buildRuleEffectivenessInsights({
        clockNow,
        recurringPatternInsights,
        reminders,
      }),
    [clockNow, recurringPatternInsights, reminders]
  );
  const ruleEffectivenessSignals = useMemo(
    () => buildRuleEffectivenessSignals({ ruleEffectivenessInsights, t }),
    [ruleEffectivenessInsights, t]
  );
  const ruleActionRecommendations = useMemo(
    () => buildRuleActionRecommendations({ ruleEffectivenessInsights, t }),
    [ruleEffectivenessInsights, t]
  );
  const runtimeCaptureDraft = useMemo(
    () => buildSessionCaptureDraft({ activeSession, t }),
    [activeSession, t]
  );
  const runtimeRecommendedSkills = useMemo(
    () =>
      buildRuntimeRecommendedSkills({
        activeSessionRecommendedSkills,
        activeSessionSkillIds,
        recurringPatternInsights,
        skillList,
        t,
      }),
    [activeSessionRecommendedSkills, activeSessionSkillIds, recurringPatternInsights, skillList, t]
  );
  const continueSessionItems = useMemo(
    () => selectContinueSessionItems(sessionList, activeSessionId),
    [activeSessionId, sessionList]
  );
  const recentCaptureItems = useMemo(
    () => selectRecentCaptureItems(noteList, reminders),
    [noteList, reminders]
  );
  const mediaCacheCount = useMemo(
    () => galleryItems.length + getStoredArrayLength(LEGACY_ALBUM_STORAGE_KEY),
    [galleryItems.length]
  );
  const auxiliaryCacheGroupCount = 4;
  const cacheCards = [
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
  ];
  const navigationGroups = useMemo(
    () => [
      {
        id: "workspace",
        label: t("app.nav.group.workspace"),
        items: [
          {
            id: "today",
            label: t("app.mode.today"),
            meta: t("app.view.today.eyebrow"),
            badge: `${openReminderCount}`,
          },
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
      ["today", "agent", "knowledge", "weather"]
        .map((id) => allNavigationItems.find((item) => item.id === id))
        .filter(Boolean),
    [allNavigationItems]
  );
  const activeNavItem =
    allNavigationItems.find((item) => item.id === currentView) || allNavigationItems[0] || null;
  const desktopRuntimeMeta = useMemo(() => {
    if (!desktopRuntime.available) {
      return null;
    }

    if (!desktopRuntime.synced || !desktopRuntime.windowState) {
      return {
        label: t("app.desktop.runtime.label"),
        value: t("app.desktop.runtime.connecting"),
        tone: "is-pending",
        title: t("app.desktop.runtime.connecting"),
      };
    }

    const { focused, fullscreen, height, maximized, visible, width } = desktopRuntime.windowState;
    let valueKey = "app.desktop.runtime.state.background";
    let tone = "is-background";

    if (!visible) {
      valueKey = "app.desktop.runtime.state.tray";
    } else if (fullscreen) {
      valueKey = "app.desktop.runtime.state.fullscreen";
      tone = "is-live";
    } else if (maximized) {
      valueKey = "app.desktop.runtime.state.maximized";
      tone = "is-live";
    } else if (focused) {
      valueKey = "app.desktop.runtime.state.focused";
      tone = "is-live";
    }

    return {
      label: t("app.desktop.runtime.label"),
      value: t(valueKey),
      tone,
      title: `${Math.max(0, width || 0)} x ${Math.max(0, height || 0)}`,
    };
  }, [desktopRuntime.available, desktopRuntime.synced, desktopRuntime.windowState, t]);

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
      lyricsLookupState[selectedTrack.id]?.status === "cleared"
    ) {
      return;
    }

    void handleRefreshLyrics({ force: true, initiatedBy: "auto" });
  }, [duration, handleRefreshLyrics, lyricsCache, lyricsLookupState, selectedTrack, selectedTrackId]);

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

  useEffect(() => {
    if (reminders.length === 0) {
      setSelectedReminderId(0);
      setReminderDraft({ ...EMPTY_REMINDER_DRAFT });
      return;
    }

    const workspaceReminderId = workspace?.activeReminderId || 0;
    if (workspaceReminderId && workspaceReminderId !== selectedReminderId) {
      setSelectedReminderId(workspaceReminderId);
      return;
    }

    if (!reminders.some((reminder) => reminder.id === selectedReminderId)) {
      setSelectedReminderId(reminders[0].id);
    }
  }, [reminders, selectedReminderId, workspace?.activeReminderId]);

  useEffect(() => {
    if (!selectedReminder) {
      setReminderDraft({ ...EMPTY_REMINDER_DRAFT });
      return;
    }

    if (hasUnsavedReminder && reminderDraft.id === selectedReminder.id) {
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
  }, [hasUnsavedReminder, reminderDraft.id, selectedReminder]);

  useEffect(() => {
    if (hasUnsavedWorkspaceDrafts || busy !== "" || loading) {
      return;
    }

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
    const triggeredReminderKeys = triggeredRemindersRef.current;
    triggeredReminderKeys.add(alertKey);
    setNotice("");
    setIsInspectorOpen(false);
    openView("reminders");

    void handleSelectReminder(dueReminder.id, { force: true }).then((opened) => {
      if (!opened) {
        triggeredReminderKeys.delete(alertKey);
      }
    });

    if (typeof window !== "undefined") {
      const audio = new Audio("/reply-pulse.mp3");
      void audio.play().catch(() => {});
      let didAlert = false;
      const timeoutId = window.setTimeout(() => {
        didAlert = true;
        window.alert(t("app.reminders.alertDue", { title: dueReminder.title }));
      }, 120);

      return () => {
        if (!didAlert) {
          window.clearTimeout(timeoutId);
          triggeredReminderKeys.delete(alertKey);
        }
      };
    }
  }, [busy, clockNow, handleSelectReminder, hasUnsavedWorkspaceDrafts, loading, openView, reminders, t]);

  function handleAddWeatherCity(location) {
    const normalizedLocation = sanitizeWeatherLocation(location);
    if (!normalizedLocation) {
      return;
    }

    const weatherLocationUpdate = updateWeatherLocations((prev) => {
      if (prev.some((item) => isSameWeatherLocation(item, normalizedLocation))) {
        return prev;
      }
      return [...prev, normalizedLocation];
    });
    if (!weatherLocationUpdate.ok) {
      return;
    }
    setSelectedWeatherCityId(normalizedLocation.id);
    openView("weather");
  }

  function handleRemoveWeatherCity(cityId) {
    if (!cityId) {
      return;
    }

    const weatherLocationUpdate = updateWeatherLocations((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      const nextLocations = prev.filter((city) => city.id !== cityId);
      if (nextLocations.length === 0) {
        return prev;
      }

      return nextLocations;
    });
    if (!weatherLocationUpdate.ok) {
      return;
    }

    if (!weatherLocationUpdate.value.some((city) => city.id === selectedWeatherCityId)) {
      setSelectedWeatherCityId(weatherLocationUpdate.value[0]?.id || WEATHER_LOCATIONS[0].id);
    }
  }

  async function handleOpenSession(sessionId) {
    if (!sessionId || sessionId === activeSessionId) {
      setIsMobileNavOpen(false);
      return;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      setIsMobileNavOpen(false);
      return;
    }
    setBusy("open");
    setError("");
    try {
      const snapshot = await openSession(sessionId);
      commitWorkspaceSnapshot(snapshot);
      setIsMobileNavOpen(false);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleCreateSession() {
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }
    setBusy("create");
    setError("");
    try {
      const snapshot = await createSession(newSessionTitle || t("app.session.defaultTitle"));
      commitWorkspaceSnapshot(snapshot);
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
      commitWorkspaceSnapshot(snapshot);
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

  const handleSaveSettings = useCallback(async (event) => {
    event.preventDefault();
    if (providerSecurityAssessment.status === "blocked") {
      setError(providerSecurityMessage);
      return;
    }
    if (
      providerSecurityAssessment.status === "warning" &&
      typeof window !== "undefined" &&
      !window.confirm(
        t("app.settings.providerSecurity.confirmUntrusted", {
          host: providerSecurityAssessment.host,
        })
      )
    ) {
      return;
    }
    if (
      providerSecurityAssessment.status === "local" &&
      typeof window !== "undefined" &&
      !window.confirm(
        t("app.settings.providerSecurity.confirmLocal", {
          host: providerSecurityAssessment.host,
        })
      )
    ) {
      return;
    }
    setBusy("save-settings");
    setError("");
    try {
      const snapshot = await saveSettings({
        settings: settingsForm,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }, [
    activeSessionId,
    commitWorkspaceSnapshot,
    providerSecurityAssessment,
    providerSecurityMessage,
    settingsForm,
    t,
  ]);

  const handleClearApiKey = useCallback(() => {
    setSettingsForm((prev) => ({
      ...prev,
      clearApiKey: !prev.clearApiKey,
      hasApiKey: prev.clearApiKey ? Boolean(workspace?.settings?.hasApiKey) : false,
      apiKey: "",
    }));
  }, [workspace?.settings?.hasApiKey]);

  async function handleOpenNote(noteId) {
    if (!noteId || noteId === activeNoteId) {
      return false;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return false;
    }
    setBusy("open-note");
    setError("");
    try {
      const snapshot = await openKnowledgeNote({
        noteId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      return true;
    } catch (err) {
      setError(normalizeError(err));
      return false;
    } finally {
      setBusy("");
    }
  }

  async function handleCreateNote() {
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }
    setBusy("create-note");
    setError("");
    try {
      const snapshot = await createKnowledgeNote({
        title: t("app.knowledge.defaultTitle"),
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      openView("knowledge");
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
      commitWorkspaceSnapshot(snapshot);
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
    if (hasUnsavedNote && noteDraft.id === activeNoteId && !confirmDiscardWorkspaceDrafts()) {
      return;
    }
    setBusy("delete-note");
    setError("");
    try {
      const snapshot = await deleteKnowledgeNote({
        noteId: activeNoteId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleOpenSkill(skillId) {
    if (!skillId || skillId === activeSkillId) {
      return false;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return false;
    }
    setBusy("open-skill");
    setError("");
    try {
      const snapshot = await openSkill({
        skillId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      return true;
    } catch (err) {
      setError(normalizeError(err));
      return false;
    } finally {
      setBusy("");
    }
  }

  async function handleCreateSkill() {
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }
    setBusy("create-skill");
    setError("");
    try {
      const snapshot = await createSkill({
        name: t("app.skills.defaultTitle"),
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      openView("skills");
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
        updateSkillHistoryMap((prev) => appendSkillHistoryEntry(prev, activeSkill, "manual-save"));
      }
      commitWorkspaceSnapshot(snapshot);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  const rollbackCreatedSkill = useCallback(async (skillId, error) => {
    const baseMessage = normalizeError(error);
    if (!skillId || !activeSessionId) {
      return baseMessage;
    }

    try {
      const rollbackSnapshot = await deleteSkill({
        skillId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(rollbackSnapshot);
      return baseMessage;
    } catch (rollbackError) {
      return `${baseMessage} Rollback failed: ${normalizeError(rollbackError)}`;
    }
  }, [activeSessionId, commitWorkspaceSnapshot]);

  const rollbackCreatedNote = useCallback(async (noteId, error) => {
    const baseMessage = normalizeError(error);
    if (!noteId || !activeSessionId) {
      return baseMessage;
    }

    try {
      const rollbackSnapshot = await deleteKnowledgeNote({
        noteId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(rollbackSnapshot);
      return baseMessage;
    } catch (rollbackError) {
      return `${baseMessage} Rollback failed: ${normalizeError(rollbackError)}`;
    }
  }, [activeSessionId, commitWorkspaceSnapshot]);

  const rollbackCreatedReminder = useCallback(async (reminderId, error) => {
    const baseMessage = normalizeError(error);
    if (!reminderId || !activeSessionId) {
      return baseMessage;
    }

    try {
      const rollbackSnapshot = await deleteReminder({
        reminderId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(rollbackSnapshot);
      return baseMessage;
    } catch (rollbackError) {
      return `${baseMessage} Rollback failed: ${normalizeError(rollbackError)}`;
    }
  }, [activeSessionId, commitWorkspaceSnapshot]);

  async function handleInstallSkillTemplate(template) {
    if (!template || !activeSessionId) {
      return;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }

    setBusy("install-skill-template");
    setError("");
    let createdSkillId = 0;
    try {
      const createdSnapshot = await createSkill({
        name: template.name,
        activeSessionId,
      });
      createdSkillId = createdSnapshot?.activeSkill?.id || createdSnapshot?.activeSkillId;
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
      commitWorkspaceSnapshot(savedSnapshot);
      openView("skills");
    } catch (err) {
      setError(await rollbackCreatedSkill(createdSkillId, err));
    } finally {
      setBusy("");
    }
  }

  async function handleImportSkills(event) {
    const file = event?.target?.files?.[0];
    if (!file || !activeSessionId) {
      return;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      if (event?.target) {
        event.target.value = "";
      }
      return;
    }

    const createdSkillIds = [];
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
        createdSkillIds.push(createdSkillId);

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
        commitWorkspaceSnapshot(latestSnapshot);
        openView("skills");
      }
    } catch (err) {
      let rollbackMessage = "";
      try {
        let rollbackSnapshot = null;

        for (const skillId of createdSkillIds.reverse()) {
          rollbackSnapshot = await deleteSkill({
            skillId,
            activeSessionId,
          });
        }

        if (rollbackSnapshot) {
          commitWorkspaceSnapshot(rollbackSnapshot);
          rollbackMessage = " Imported skills were rolled back.";
        }
      } catch (rollbackError) {
        rollbackMessage = ` Rollback failed: ${normalizeError(rollbackError)}`;
      }

      setError(`${normalizeError(err)}${rollbackMessage}`);
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

    setError("");

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

    try {
      downloadJsonFile(payload, `${slugifyFileName(skill.name || "skill")}.skill.json`);
    } catch (err) {
      setError(t("app.skills.export.failed", { detail: normalizeError(err) }));
    }
  }

  function handleExportAllSkills() {
    if (!skillList.length) {
      return;
    }

    setError("");

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

    try {
      downloadJsonFile(payload, "mmgh-skills.bundle.json");
    } catch (err) {
      setError(t("app.skills.export.failed", { detail: normalizeError(err) }));
    }
  }

  async function handleForgeSkill({ prompt, mode }) {
    if (!activeSessionId || !String(prompt || "").trim()) {
      return;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }

    const requestVersion = forgeSkillRequestVersionRef.current + 1;
    forgeSkillRequestVersionRef.current = requestVersion;
    forgeSkillAbortControllerRef.current?.abort();
    const controller = new AbortController();
    forgeSkillAbortControllerRef.current = controller;

    setBusy("forge-skill");
    setError("");
    setNotice("");
    let createdSkillId = 0;
    try {
      const generatedSkill = await generateSkillDraft({
        existingSkill: mode === "rewrite" ? activeSkill : null,
        lang,
        prompt,
        signal: controller.signal,
        settings: settingsForm,
        t,
      });
      if (forgeSkillRequestVersionRef.current !== requestVersion) {
        return;
      }

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
          updateSkillHistoryMap((prev) => appendSkillHistoryEntry(prev, activeSkill, "ai-rewrite"));
        }
        if (forgeSkillRequestVersionRef.current !== requestVersion) {
          return;
        }
        commitWorkspaceSnapshot(savedSnapshot);
        setNotice(String(generatedSkill.warning || "").trim());
        return;
      }

      const createdSnapshot = await createSkill({
        name: generatedSkill.name || t("app.skills.defaultTitle"),
        activeSessionId,
      });
      createdSkillId = createdSnapshot?.activeSkill?.id || createdSnapshot?.activeSkillId;
      if (!createdSkillId) {
        throw new Error(t("app.skills.forge.createFailed"));
      }
      if (forgeSkillRequestVersionRef.current !== requestVersion) {
        await rollbackCreatedSkill(createdSkillId, createAbortError("Skill generation was cancelled."));
        return;
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
      if (forgeSkillRequestVersionRef.current !== requestVersion) {
        await rollbackCreatedSkill(createdSkillId, createAbortError("Skill generation was cancelled."));
        return;
      }
      commitWorkspaceSnapshot(savedSnapshot);
      setNotice(String(generatedSkill.warning || "").trim());
      openView("skills");
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      setNotice("");
      if (forgeSkillRequestVersionRef.current === requestVersion) {
        setError(await rollbackCreatedSkill(createdSkillId, err));
      }
    } finally {
      if (forgeSkillAbortControllerRef.current === controller) {
        forgeSkillAbortControllerRef.current = null;
      }
      if (forgeSkillRequestVersionRef.current === requestVersion) {
        setBusy("");
      }
    }
  }

  async function handleDeleteSkill() {
    if (!activeSkillId) {
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(t("app.skills.deleteConfirm"))) {
      return;
    }
    if (hasUnsavedSkill && skillDraft.id === activeSkillId && !confirmDiscardWorkspaceDrafts()) {
      return;
    }
    setBusy("delete-skill");
    setError("");
    try {
      const snapshot = await deleteSkill({
        skillId: activeSkillId,
        activeSessionId,
      });
      updateSkillHistoryMap((prev) => removeSkillHistoryEntries(prev, activeSkillId));
      commitWorkspaceSnapshot(snapshot);
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

    const isMounted = activeSessionSkillIds.includes(skillId);
    const nextSkillIds = isMounted
      ? activeSessionSkillIds.filter((id) => id !== skillId)
      : [...activeSessionSkillIds, skillId];
    const toggledSkill = skillList.find((item) => item.id === skillId);

    setBusy("save-session-skills");
    setError("");
    setNotice("");
    try {
      const snapshot = await saveSessionSkills({
        sessionId: activeSessionId,
        skillIds: nextSkillIds,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      setNotice(
        t(isMounted ? "app.today.review.rule.notice.unmounted" : "app.today.review.rule.notice.mounted", {
          title: toggledSkill?.name || t("app.skills.defaultTitle"),
        })
      );
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
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }

    setSkillDraft(buildSkillDraftFromVersion(version, activeSkillId));
  }

  async function handleRestoreSkillVersion(version) {
    if (!version || !activeSkillId || !activeSessionId || !activeSkill) {
      return;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
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
      updateSkillHistoryMap((prev) => appendSkillHistoryEntry(prev, activeSkill, "restore"));
      commitWorkspaceSnapshot(snapshot);
      openView("skills");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  async function handleCreateReminder() {
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }
    setBusy("create-reminder");
    setError("");
    try {
      const snapshot = await createReminder({
        title: t("app.reminders.defaultTitle"),
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      setSelectedReminderId(snapshot.activeReminderId || 0);
      openView("reminders");
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
      commitWorkspaceSnapshot(snapshot);
      setSelectedReminderId(snapshot.activeReminderId || reminderDraft.id);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  function closeReminderCompletionDialog() {
    setIsReminderCompletionOpen(false);
    setReminderCompletionDraft({ ...EMPTY_REMINDER_COMPLETION_DRAFT });
  }

  async function loadReminderDetailForAction(reminder) {
    if (!reminder?.id) {
      return null;
    }
    if (selectedReminder?.id === reminder.id && typeof selectedReminder.detail === "string") {
      return selectedReminder;
    }

    const snapshot = await openReminder({
      reminderId: reminder.id,
      activeSessionId,
    });
    commitWorkspaceSnapshot(snapshot);
    return snapshot?.activeReminder || null;
  }

  async function openReminderNoteForCompletion(reminder, createIfMissing = false) {
    const fallbackTitle = reminder?.title?.trim() || t("app.knowledge.defaultTitle");
    const noteId = reminder?.linkedNoteId || findNoteIdByTitle(noteList, fallbackTitle);

    if (noteId) {
      const snapshot = await openKnowledgeNote({
        noteId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      return snapshot?.activeNote || null;
    }

    if (!createIfMissing) {
      return null;
    }

    const createdSnapshot = await createKnowledgeNote({
      title: fallbackTitle,
      activeSessionId,
    });
    commitWorkspaceSnapshot(createdSnapshot);
    return createdSnapshot?.activeNote || null;
  }

  async function handleToggleTodayReminderStatus(reminder) {
    if (!reminder?.id || busy !== "" || loading) {
      return false;
    }
    if (hasUnsavedWorkspaceDrafts && !confirmDiscardWorkspaceDrafts()) {
      return false;
    }

    if (reminder.status === "done") {
      setBusy("toggle-reminder-status");
      setError("");
      setNotice("");
      try {
        const detailedReminder = await loadReminderDetailForAction(reminder);
        if (!detailedReminder) {
          throw new Error(t("app.today.review.errorMissingReminder"));
        }

        const snapshot = await saveReminder({
          activeSessionId,
          reminder: {
            id: detailedReminder.id,
            title: detailedReminder.title,
            detail: detailedReminder.detail,
            dueAt: normalizeReminderDueAt(detailedReminder.dueAt),
            severity: detailedReminder.severity,
            status: "scheduled",
            linkedNoteId: detailedReminder.linkedNoteId ? Number(detailedReminder.linkedNoteId) : null,
          },
        });
        commitWorkspaceSnapshot(snapshot);
        setSelectedReminderId(snapshot.activeReminderId || detailedReminder.id);
        setNotice(
          t("app.today.notice.reopened", {
            title: detailedReminder.title || t("app.reminders.defaultTitle"),
          })
        );
        return true;
      } catch (err) {
        setError(normalizeError(err));
        return false;
      } finally {
        setBusy("");
      }
    }

    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastReminderCompletionTriggerRef.current = document.activeElement;
    }
    setIsInspectorOpen(false);
    setIsMobileNavOpen(false);
    setError("");
    setNotice("");
    setReminderCompletionDraft(
      createReminderCompletionDraft(
        {
          ...reminder,
          linkedNoteId: reminder.linkedNoteId || findNoteIdByTitle(noteList, reminder.title),
        },
        clockNow
      )
    );
    setIsReminderCompletionOpen(true);
    return true;
  }

  async function handleSubmitReminderCompletion() {
    if (!reminderCompletionDraft.reminderId || busy !== "" || loading) {
      return;
    }

    setBusy("complete-reminder");
    setError("");
    setNotice("");

    try {
      const detailedReminder = await loadReminderDetailForAction({
        id: reminderCompletionDraft.reminderId,
      });
      if (!detailedReminder) {
        throw new Error(t("app.today.review.errorMissingReminder"));
      }

      const completionResult = reminderCompletionDraft.result.trim();
      let linkedNote = null;

      if (reminderCompletionDraft.saveToNote) {
        linkedNote = await openReminderNoteForCompletion(detailedReminder, true);
        if (!linkedNote) {
          throw new Error(t("app.today.review.errorMissingNote"));
        }

        const savedNoteSnapshot = await saveKnowledgeNote({
          activeSessionId,
          note: {
            id: linkedNote.id,
            icon: linkedNote.icon || "*",
            title:
              linkedNote.title?.trim() || detailedReminder.title || t("app.knowledge.defaultTitle"),
            body: appendNoteSection(
              linkedNote.body,
              buildReminderCompletionNoteEntry({
                completedAt: clockNow,
                followUpDueAt: reminderCompletionDraft.createFollowUp
                  ? normalizeReminderDueAt(reminderCompletionDraft.followUpDueAt) ||
                    buildFollowUpReminderDueAt(clockNow)
                  : null,
                followUpTitle: reminderCompletionDraft.createFollowUp
                  ? reminderCompletionDraft.followUpTitle.trim() ||
                    buildDefaultFollowUpTitle(detailedReminder.title, t)
                  : "",
                lang,
                reminderTitle: detailedReminder.title,
                result: completionResult,
                t,
              })
            ),
            tags: mergeUniqueTags(
              linkedNote.tags,
              ["reminder", "completion"],
              reminderCompletionDraft.createFollowUp ? ["follow-up"] : EMPTY_LIST
            ),
          },
        });
        commitWorkspaceSnapshot(savedNoteSnapshot);
        linkedNote = savedNoteSnapshot?.activeNote || linkedNote;
      } else if (reminderCompletionDraft.createFollowUp) {
        linkedNote = await openReminderNoteForCompletion(detailedReminder, false);
      }

      if (reminderCompletionDraft.createFollowUp) {
        const followUpTitle =
          reminderCompletionDraft.followUpTitle.trim() ||
          buildDefaultFollowUpTitle(detailedReminder.title, t);
        const followUpDueAt =
          normalizeReminderDueAt(reminderCompletionDraft.followUpDueAt) ||
          buildFollowUpReminderDueAt(clockNow);

        const createdSnapshot = await createReminder({
          title: followUpTitle,
          activeSessionId,
        });
        commitWorkspaceSnapshot(createdSnapshot);
        const createdReminderId =
          createdSnapshot?.activeReminder?.id || createdSnapshot?.activeReminderId || 0;

        if (!createdReminderId) {
          throw new Error(t("app.agent.quick.createReminderFailed"));
        }

        const savedFollowUpSnapshot = await saveReminder({
          activeSessionId,
          reminder: {
            id: createdReminderId,
            title: followUpTitle,
            detail: buildFollowUpReminderDetail({
              reminderTitle: detailedReminder.title,
              result: completionResult,
              summary: detailedReminder.preview || "",
              t,
            }),
            dueAt: followUpDueAt,
            severity: detailedReminder.severity,
            status: "scheduled",
            linkedNoteId: linkedNote?.id || detailedReminder.linkedNoteId || null,
          },
        });
        commitWorkspaceSnapshot(savedFollowUpSnapshot);
      }

      const completedSnapshot = await saveReminder({
        activeSessionId,
        reminder: {
          id: detailedReminder.id,
          title: detailedReminder.title,
          detail: buildReminderCompletionDetail({
            completedAt: clockNow,
            currentDetail: detailedReminder.detail,
            lang,
            result: completionResult,
            t,
          }),
          dueAt: normalizeReminderDueAt(detailedReminder.dueAt),
          severity: detailedReminder.severity,
          status: "done",
          linkedNoteId: linkedNote?.id || detailedReminder.linkedNoteId || null,
        },
      });
      commitWorkspaceSnapshot(completedSnapshot);
      setSelectedReminderId(completedSnapshot.activeReminderId || detailedReminder.id);
      closeReminderCompletionDialog();
      setNotice(
        t(
          reminderCompletionDraft.createFollowUp
            ? "app.today.notice.doneWithFollowUp"
            : "app.today.notice.done",
          {
            title: detailedReminder.title || t("app.reminders.defaultTitle"),
          }
        )
      );
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
    if (
      hasUnsavedReminder &&
      reminderDraft.id === selectedReminderId &&
      !confirmDiscardWorkspaceDrafts()
    ) {
      return;
    }

    setBusy("delete-reminder");
    setError("");
    try {
      const snapshot = await deleteReminder({
        reminderId: selectedReminderId,
        activeSessionId,
      });
      commitWorkspaceSnapshot(snapshot);
      setSelectedReminderId(snapshot.activeReminderId || 0);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusy("");
    }
  }

  const handleCaptureSessionNote = useCallback(async () => {
    if (!activeSessionId) {
      return;
    }
    const captureDraft = buildSessionCaptureDraft({ activeSession, t });
    if (!captureDraft) {
      return;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }

    setBusy("capture-note");
    setError("");
    setNotice("");
    let createdNoteId = 0;
    try {
      const createdSnapshot = await createKnowledgeNote({
        title: captureDraft.noteTitle,
        activeSessionId,
      });
      createdNoteId = createdSnapshot?.activeNote?.id || createdSnapshot?.activeNoteId || 0;
      if (!createdNoteId) {
        throw new Error(t("app.agent.quick.createNoteFailed"));
      }

      const savedSnapshot = await saveKnowledgeNote({
        activeSessionId,
        note: {
          id: createdNoteId,
          icon: "*",
          title: captureDraft.noteTitle,
          body: captureDraft.noteBody,
          tags: captureDraft.tags,
        },
      });
      commitWorkspaceSnapshot(savedSnapshot);
      setNotice(t("app.agent.quick.noteSaved", { title: captureDraft.noteTitle }));
    } catch (err) {
      setError(await rollbackCreatedNote(createdNoteId, err));
    } finally {
      setBusy("");
    }
  }, [
    activeSession,
    activeSessionId,
    commitWorkspaceSnapshot,
    confirmDiscardWorkspaceDrafts,
    rollbackCreatedNote,
    t,
  ]);

  const handleCaptureSessionReminder = useCallback(async () => {
    if (!activeSessionId) {
      return;
    }
    const captureDraft = buildSessionCaptureDraft({ activeSession, t });
    if (!captureDraft) {
      return;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return;
    }

    setBusy("capture-reminder");
    setError("");
    setNotice("");
    let createdReminderId = 0;
    const linkedNoteId = findNoteIdByTitle(noteList, captureDraft.noteTitle);
    try {
      const createdSnapshot = await createReminder({
        title: captureDraft.reminderTitle,
        activeSessionId,
      });
      createdReminderId =
        createdSnapshot?.activeReminder?.id || createdSnapshot?.activeReminderId || 0;
      if (!createdReminderId) {
        throw new Error(t("app.agent.quick.createReminderFailed"));
      }

      const savedSnapshot = await saveReminder({
        activeSessionId,
        reminder: {
          id: createdReminderId,
          title: captureDraft.reminderTitle,
          detail: captureDraft.reminderDetail,
          dueAt: captureDraft.reminderDueAt,
          severity: "medium",
          status: "scheduled",
          linkedNoteId,
        },
      });
      commitWorkspaceSnapshot(savedSnapshot);
      setSelectedReminderId(savedSnapshot.activeReminderId || createdReminderId);
      setNotice(t("app.agent.quick.reminderSaved", { title: captureDraft.reminderTitle }));
    } catch (err) {
      setError(await rollbackCreatedReminder(createdReminderId, err));
    } finally {
      setBusy("");
    }
  }, [
    activeSession,
    activeSessionId,
    commitWorkspaceSnapshot,
    confirmDiscardWorkspaceDrafts,
    noteList,
    rollbackCreatedReminder,
    t,
  ]);

  async function handleOpenReminderNote(noteId) {
    if (!noteId) {
      return;
    }
    const opened = await handleOpenNote(noteId);
    if (opened) {
      openView("knowledge");
    }
  }

  async function handleOpenReminderPattern(patternTitle) {
    const normalizedPattern = normalizeReminderPatternKey(patternTitle);
    if (!normalizedPattern || busy !== "" || loading) {
      return false;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return false;
    }

    const matchedReminder = [...reminders]
      .filter((item) => normalizeReminderPatternKey(item.title) === normalizedPattern)
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

    setReminderSearch(patternTitle);
    openView("reminders");

    if (!matchedReminder) {
      return true;
    }

    if (matchedReminder.id === selectedReminderId) {
      return true;
    }

    return handleSelectReminder(matchedReminder.id, { force: true });
  }

  async function handlePromoteReminderPattern(pattern) {
    if (!pattern?.title || !activeSessionId || busy !== "" || loading) {
      return false;
    }
    if (!confirmDiscardWorkspaceDrafts()) {
      return false;
    }

    setBusy("promote-pattern-skill");
    setError("");
    setNotice("");
    let createdSkillId = 0;

    try {
      const skillName = buildRecurringPatternSkillName(pattern.title, t);
      const createdSnapshot = await createSkill({
        name: skillName,
        activeSessionId,
      });
      createdSkillId = createdSnapshot?.activeSkill?.id || createdSnapshot?.activeSkillId || 0;
      if (!createdSkillId) {
        throw new Error(t("app.skills.forge.createFailed"));
      }
      commitWorkspaceSnapshot(createdSnapshot);

      const savedSnapshot = await saveSkill({
        activeSessionId,
        skill: {
          id: createdSkillId,
          name: skillName,
          description: t("app.today.review.skill.description", {
            count: pattern.count,
            title: pattern.title,
          }),
          triggerHint: t("app.today.review.skill.trigger", {
            title: pattern.title,
          }),
          instructions: buildRecurringPatternSkillInstructions({
            count: pattern.count,
            patternTitle: pattern.title,
            t,
          }),
          enabled: true,
        },
      });
      commitWorkspaceSnapshot(savedSnapshot);
      openView("skills");
      setNotice(
        t("app.today.review.skill.notice", {
          title: pattern.title,
        })
      );
      return true;
    } catch (err) {
      setError(await rollbackCreatedSkill(createdSkillId, err));
      return false;
    } finally {
      setBusy("");
    }
  }

  async function handleRunAgent(event) {
    event.preventDefault();
    if (!activeSessionId || !draft.trim()) {
      return;
    }

    const requestVersion = runAgentRequestVersionRef.current + 1;
    runAgentRequestVersionRef.current = requestVersion;
    setBusy("run");
    setError("");
    try {
      const snapshot = await runAgent({
        sessionId: activeSessionId,
        prompt: draft,
      });
      if (runAgentRequestVersionRef.current !== requestVersion) {
        return;
      }
      commitWorkspaceSnapshot(snapshot);
      setDraft("");
    } catch (err) {
      if (runAgentRequestVersionRef.current === requestVersion) {
        setError(normalizeError(err));
      }
    } finally {
      if (runAgentRequestVersionRef.current === requestVersion) {
        setBusy("");
      }
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

  const handleGalleryUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }
    setError("");
    try {
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

      const galleryUpdate = updateGalleryItems((prev) => [...items, ...prev]);
      if (!galleryUpdate.ok) {
        return;
      }
      setGalleryViewerId(items[0]?.id || "");
    } catch (error) {
      setError(normalizeError(error));
    } finally {
      event.target.value = "";
    }
  }, [updateGalleryItems]);

  const handleToggleFavoriteGalleryItem = useCallback((itemId) => {
    updateGalleryItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, favorite: !item.favorite } : item
      )
    );
  }, [updateGalleryItems]);

  const handleDeleteGalleryItem = useCallback((itemId) => {
    if (typeof window !== "undefined" && !window.confirm(t("app.gallery.deleteConfirm"))) {
      return;
    }

    const galleryUpdate = updateGalleryItems((prev) => prev.filter((item) => item.id !== itemId));
    if (!galleryUpdate.ok) {
      return;
    }
    setGalleryViewerId((prev) => (prev === itemId ? "" : prev));
  }, [t, updateGalleryItems]);

  function handleClearMediaCache() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.media"))
    ) {
      return;
    }

    setError("");
    try {
      removeLocalStorageKeys([GALLERY_STORAGE_KEY, LEGACY_ALBUM_STORAGE_KEY]);
      setGalleryItems([]);
      setGallerySearch("");
      setGalleryFilter("all");
      setGalleryViewerId("");
    } catch (err) {
      setError(t("app.settings.cache.clearFailed", { detail: normalizeError(err) }));
    }
  }

  function handleClearWeatherCache() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.weather"))
    ) {
      return;
    }

    const fallbackLocations = WEATHER_LOCATIONS.map((location) => sanitizeWeatherLocation(location)).filter(Boolean);
    setError("");
    try {
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
      setWeatherAuxCacheVersion((prev) => prev + 1);
    } catch (err) {
      setError(t("app.settings.cache.clearFailed", { detail: normalizeError(err) }));
    }
  }

  function handleClearSkillHistoryCache() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.skillHistory"))
    ) {
      return;
    }

    setError("");
    try {
      removeLocalStorageKeys([SKILL_HISTORY_STORAGE_KEY]);
      setSkillHistoryMap({});
    } catch (err) {
      setError(t("app.settings.cache.clearFailed", { detail: normalizeError(err) }));
    }
  }

  function handleClearAllCaches() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("app.settings.cache.confirm.all"))
    ) {
      return;
    }

    const fallbackLocations = WEATHER_LOCATIONS.map((location) => sanitizeWeatherLocation(location)).filter(Boolean);
    setError("");
    try {
      const nextLyricsClearMarker = String(Date.now());
      writeLyricsCacheClearMarker(nextLyricsClearMarker);
      removeLocalStorageKeys([
        GALLERY_STORAGE_KEY,
        LEGACY_ALBUM_STORAGE_KEY,
        WEATHER_LOCATIONS_STORAGE_KEY,
        WEATHER_RECENT_SEARCHES_STORAGE_KEY,
        WEATHER_USAGE_STORAGE_KEY,
        SKILL_HISTORY_STORAGE_KEY,
        LYRICS_CACHE_STORAGE_KEY,
      ]);
      invalidateAllLyricsRequestVersions();
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
      setLyricsCache({});
      setLyricsCacheClearMarker(nextLyricsClearMarker);
      setLyricsLookupState(buildLyricsLookupStateWithClearMarker({}, tracks));
      setWeatherAuxCacheVersion((prev) => prev + 1);
    } catch (err) {
      try {
        writeLyricsCacheClearMarker(lyricsCacheClearMarker);
      } catch (rollbackError) {
        setError(
          t("app.settings.cache.clearFailed", {
            detail: `${normalizeError(err)}; rollback: ${normalizeError(rollbackError)}`,
          })
        );
        return;
      }
      setError(t("app.settings.cache.clearFailed", { detail: normalizeError(err) }));
    }
  }

  const viewMeta = {
    today: {
      eyebrow: t("app.view.today.eyebrow"),
      title: t("app.view.today.title"),
      description: t("app.view.today.description"),
      badges: [
        { label: t("app.view.today.badge.focus"), value: `${todayReminderItems.length}` },
        { label: t("app.view.today.badge.due"), value: `${dueReminderCount}` },
        { label: t("app.view.today.badge.flow"), value: `${sessionList.length}` },
      ],
    },
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
  const isModalOpen = isInspectorOpen || isMobileNavOpen || isReminderCompletionOpen;
  const modalBackgroundProps = isModalOpen ? { "aria-hidden": "true", inert: "" } : {};

  function openInspector(tab = "runtime") {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastInspectorTriggerRef.current = document.activeElement;
    }
    setIsMobileNavOpen(false);
    setActiveInspectorTab(tab);
    setIsInspectorOpen(true);
  }

  function handleSelectView(viewId) {
    openView(viewId);
  }

  function handleToggleMobileNav() {
    if (!isMobileNavOpen && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      lastMobileNavTriggerRef.current = document.activeElement;
      setIsInspectorOpen(false);
    }
    setIsMobileNavOpen((prev) => !prev);
  }

  function handleToggleInspector(tab = "runtime") {
    if (isInspectorOpen) {
      setIsInspectorOpen(false);
      return;
    }

    openInspector(tab);
  }

  function handleInspectorTabKeyDown(event, tabIndex) {
    let nextTabIndex = tabIndex;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextTabIndex = (tabIndex + 1) % inspectorTabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextTabIndex = (tabIndex - 1 + inspectorTabs.length) % inspectorTabs.length;
        break;
      case "Home":
        nextTabIndex = 0;
        break;
      case "End":
        nextTabIndex = inspectorTabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();

    const nextTab = inspectorTabs[nextTabIndex];
    if (!nextTab) {
      return;
    }

    setActiveInspectorTab(nextTab.id);

    const tabButtons = Array.from(event.currentTarget.parentElement?.querySelectorAll('[role="tab"]') || []);
    const nextButton = tabButtons[nextTabIndex];
    if (nextButton instanceof HTMLElement) {
      nextButton.focus();
    }
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

  const workspaceLoadingFallback = <WorkspaceLoadingState label={t("app.common.loading")} />;

  return (
    <div
      className={`agent-app theme-${theme} view-${currentView} ${
        showMiniPlayer ? "agent-app--with-mini-player" : ""
      }`}
    >
      <div className="agent-app__glow agent-app__glow--one" />
      <div className="agent-app__glow agent-app__glow--two" />
      <div className="agent-app__mesh" aria-hidden="true" />

      <aside className="session-rail session-rail--desktop panel-surface" {...modalBackgroundProps}>
        {railContent}
      </aside>

      {isMobileNavOpen ? (
        <div className="mobile-shell-drawer is-open">
          <button
            type="button"
            className="mobile-shell-drawer__backdrop"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label={t("app.common.close")}
          />
          <aside
            id="mobile-shell-drawer-panel"
            ref={mobileDrawerPanelRef}
            className="mobile-shell-drawer__panel session-rail session-rail--drawer panel-surface"
            role="dialog"
            aria-modal="true"
            aria-label={t("app.nav.title")}
            tabIndex={-1}
          >
            {railContent}
          </aside>
        </div>
      ) : null}

      <main className="workspace-column" {...modalBackgroundProps}>
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
              {desktopRuntimeMeta ? (
                <span
                  className={`workspace-hero__meta-pill workspace-hero__meta-pill--desktop ${desktopRuntimeMeta.tone}`}
                  title={desktopRuntimeMeta.title}
                >
                  <span>{desktopRuntimeMeta.label}</span>
                  <strong>{desktopRuntimeMeta.value}</strong>
                </span>
              ) : null}
              <button
                type="button"
                className="shell-menu-button"
                onClick={handleToggleMobileNav}
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

        {notice ? <div className="notice-banner">{notice}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}

        {currentView === "today" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <TodayWorkspace
              activeSession={activeSession}
              activeSessionId={activeSessionId}
              activeWeatherCity={activeWeatherCity}
              busy={busy}
              clockNow={clockNow}
              completedTodayItems={completedTodayItems}
              continueSessionItems={continueSessionItems}
              dueReminderCount={dueReminderCount}
              formatShortClock={formatShortClock}
              formatTime={formatTime}
              handleOpenNote={handleOpenNote}
              handleOpenLinkedNote={handleOpenReminderNote}
              handleOpenReminderPattern={handleOpenReminderPattern}
              handleOpenSession={handleOpenSession}
              handleOpenSkill={handleOpenSkill}
              handlePromoteReminderPattern={handlePromoteReminderPattern}
              handleSelectReminder={handleSelectReminder}
              handleToggleSkillMounted={handleToggleSkillMounted}
              handleToggleTodayReminderStatus={handleToggleTodayReminderStatus}
              lang={lang}
              loading={loading}
              noteList={noteList}
              openReminderCount={openReminderCount}
              openView={openView}
              providerConfigured={providerConfigured}
              recentCaptureItems={recentCaptureItems}
              recurringPatternInsights={recurringPatternInsights}
              resolvePatternStatusTone={resolvePatternStatusTone}
              resolveReminderUrgency={resolveReminderUrgency}
              resolveRuleActionTone={resolveRuleActionTone}
              resolveRuleEffectivenessTone={resolveRuleEffectivenessTone}
              ruleActionRecommendations={ruleActionRecommendations}
              ruleEffectivenessInsights={ruleEffectivenessInsights}
              ruleEffectivenessSignals={ruleEffectivenessSignals}
              todayReminderItems={todayReminderItems}
              todayReviewSignals={todayReviewSignals}
              weatherStatus={weatherStatus}
            />
          </Suspense>
        ) : currentView === "agent" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <RuntimeWorkspace
              activeSession={activeSession}
              activeSessionId={activeSessionId}
              activeSessionRecommendedSkills={runtimeRecommendedSkills}
              activeSessionSkills={activeSessionSkills}
              busy={busy}
              captureDraft={runtimeCaptureDraft}
              draft={draft}
              formatTime={formatTime}
              handleCaptureSessionNote={handleCaptureSessionNote}
              handleCaptureSessionReminder={handleCaptureSessionReminder}
              handleOpenSession={handleOpenSession}
              handleOpenSkill={handleOpenSkill}
              handleRunAgent={handleRunAgent}
              handleToggleSkillMounted={handleToggleSkillMounted}
              isInspectorOpen={isInspectorOpen}
              lang={lang}
              loading={loading}
              mountedSkillIds={activeSessionSkillIds}
              normalizeActivityKind={normalizeActivityKind}
              openInspector={openInspector}
              openView={openView}
              PanelIcon={PanelIcon}
              providerConfigured={providerConfigured}
              sessionList={sessionList}
              setDraft={setDraft}
            />
          </Suspense>
        ) : currentView === "knowledge" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <KnowledgeVault
              activeNote={activeNote}
              activeNoteId={activeNoteId}
              busy={busy}
              filteredNotes={filteredNotes}
              formatTime={formatTime}
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
          </Suspense>
        ) : currentView === "gallery" ? (
          <Suspense fallback={workspaceLoadingFallback}>
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
          </Suspense>
        ) : currentView === "music" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <MusicWorkspace
              autoPlayOnReply={autoPlayOnReply}
              handleCyclePlayMode={handleCyclePlayMode}
              handlePlayNextTrack={handlePlayNextTrack}
              handlePlayPreviousTrack={handlePlayPreviousTrack}
              handleRestartTrack={handleRestartTrack}
              handleSeek={handleSeek}
              handleSelectTrack={handleSelectTrack}
              handleTogglePlayback={handleTogglePlayback}
              isAppVisible={isAppVisible}
              isPlaying={isPlaying}
              lyricsError={selectedTrackLyricsError}
              lyricsLines={selectedTrackLyrics}
              lyricsSource={selectedTrackLyricsSource}
              lyricsStatus={selectedTrackLyricsStatus}
              onRefreshLyrics={() => void handleRefreshLyrics({ force: true, initiatedBy: "manual" })}
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
          </Suspense>
        ) : currentView === "weather" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <WeatherWorkspace
              auxiliaryCacheVersion={weatherAuxCacheVersion}
              clockNow={clockNow}
              onLocalCacheError={(message) => setError(message)}
              selectedCityId={selectedWeatherCityId}
              setSelectedCityId={setSelectedWeatherCityId}
              weatherCities={weatherCities}
              weatherError={weatherError}
              weatherStatus={weatherStatus}
              weatherUpdatedAt={weatherUpdatedAt}
              onAddCity={handleAddWeatherCity}
              onRefresh={() => void loadWeatherSnapshotData(weatherLocations)}
              onRemoveCity={handleRemoveWeatherCity}
            />
          </Suspense>
        ) : currentView === "skills" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <SkillWorkspace
              activeSkill={activeSkill}
              activeSkillId={activeSkillId}
              activeSkillVersions={activeSkillVersions}
              activeSessionRecommendedSkills={runtimeRecommendedSkills}
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
              skillActionContextKey={skillActionContextKey}
              skillDraft={skillDraft}
              skillSearch={skillSearch}
            />
          </Suspense>
        ) : currentView === "settings" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <SettingsWorkspace
              busy={busy}
              cacheCards={cacheCards}
              handleClearApiKey={handleClearApiKey}
              handleSaveSettings={handleSaveSettings}
              hasUnsavedSettings={hasUnsavedSettings}
              providerConfigured={providerConfigured}
              providerSecurityMessage={providerSecurityMessage}
              providerSecurityStatus={providerSecurityAssessment.status}
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
            />
          </Suspense>
        ) : (
          <Suspense fallback={workspaceLoadingFallback}>
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
              setSelectedReminderId={handleSelectReminder}
              setReminderDraft={setReminderDraft}
              setReminderSearch={setReminderSearch}
            />
          </Suspense>
        )}
      </main>

      {isReminderCompletionOpen ? (
        <Suspense fallback={null}>
          <ReminderCompletionDialog
            busy={busy}
            draft={reminderCompletionDraft}
            noteList={noteList}
            onClose={closeReminderCompletionDialog}
            onSubmit={handleSubmitReminderCompletion}
            panelRef={reminderCompletionPanelRef}
            setDraft={setReminderCompletionDraft}
          />
        </Suspense>
      ) : null}

      {isInspectorOpen ? (
        <div className="inspector-drawer is-open">
          <button
            type="button"
            className="inspector-drawer__backdrop"
            onClick={() => setIsInspectorOpen(false)}
            aria-label={t("app.common.close")}
          />
          <aside
            id="inspector-drawer-panel"
            ref={inspectorDrawerPanelRef}
            className="inspector-drawer__panel panel-surface"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspector-drawer-title"
            tabIndex={-1}
          >
            <div className="inspector-drawer__head">
              <div className="inspector-drawer__headline">
                <span className="eyebrow">{activeInspectorMeta.eyebrow}</span>
                <h3 id="inspector-drawer-title">{activeInspectorMeta.label}</h3>
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
            <div className="inspector-tab-strip" role="tablist" aria-labelledby="inspector-drawer-title">
              {inspectorTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  id={`inspector-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  tabIndex={activeInspectorTab === tab.id ? 0 : -1}
                  aria-controls={`inspector-panel-${tab.id}`}
                  aria-selected={activeInspectorTab === tab.id}
                  className={`inspector-tab ${activeInspectorTab === tab.id ? "is-active" : ""}`}
                  onClick={() => setActiveInspectorTab(tab.id)}
                  onKeyDown={(event) => handleInspectorTabKeyDown(event, index)}
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
              <section
                id="inspector-panel-runtime"
                className="panel-surface runtime-panel inspector-tab-panel"
                role="tabpanel"
                aria-labelledby="inspector-tab-runtime"
              >
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
              <section
                id="inspector-panel-media"
                className="panel-surface sound-panel inspector-tab-panel"
                role="tabpanel"
                aria-labelledby="inspector-tab-media"
              >
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
              <section
                id="inspector-panel-activity"
                className="panel-surface activity-panel inspector-tab-panel"
                role="tabpanel"
                aria-labelledby="inspector-tab-activity"
              >
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
                <section
                  id="inspector-panel-quick"
                  className="panel-surface settings-panel inspector-tab-panel"
                  role="tabpanel"
                  aria-labelledby="inspector-tab-quick"
                >
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
                      openView("settings");
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
      ) : null}

      <nav className="mobile-dock" aria-label={t("app.nav.title")} {...modalBackgroundProps}>
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
          onClick={handleToggleMobileNav}
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

      <div {...modalBackgroundProps}>
        <audio ref={audioRef} preload="metadata">
          {selectedTrackSource ? <source src={selectedTrackSource.src} type="audio/mpeg" /> : null}
        </audio>

        {showMiniPlayer ? (
          <MiniPlayerBar
            handleOpenMusicWorkspace={() => openView("music")}
            handleRestartTrack={handleRestartTrack}
            handleSeek={handleSeek}
            handleTogglePlayback={handleTogglePlayback}
            isPlaying={isPlaying}
            selectedTrack={selectedTrack}
          />
        ) : null}
      </div>
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

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => {
    if (
      element.hasAttribute("hidden") ||
      element.getAttribute("aria-hidden") === "true" ||
      element.getAttribute("aria-disabled") === "true"
    ) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    return element.getClientRects().length > 0;
  });
}

function focusDialogPanel(panel) {
  if (!panel) {
    return;
  }

  const [firstFocusable] = getFocusableElements(panel);
  const target = firstFocusable || panel;

  if (target instanceof HTMLElement) {
    target.focus();
  }
}

function trapFocusWithinPanel(event, panel) {
  const focusableElements = getFocusableElements(panel);

  if (!focusableElements.length) {
    event.preventDefault();
    if (panel instanceof HTMLElement) {
      panel.focus();
    }
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey) {
    if (activeElement === firstElement || !panel.contains(activeElement)) {
      event.preventDefault();
      lastElement.focus();
    }
    return;
  }

  if (activeElement === lastElement || !panel.contains(activeElement)) {
    event.preventDefault();
    firstElement.focus();
  }
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
    case "today":
      return "today";
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
      return "failed";
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
    case "today":
      return (
        <>
          <rect x="4.5" y="5" width="15" height="14" rx="3" />
          <path d="M8 3.8v2.4" />
          <path d="M16 3.8v2.4" />
          <path d="M4.5 9.5h15" />
          <path d="M8.5 13h3" />
          <path d="M13.5 13h2" />
        </>
      );
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
    case "failed":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M9.2 9.2l5.6 5.6" />
          <path d="M14.8 9.2l-5.6 5.6" />
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

function WorkspaceLoadingState({ label }) {
  return (
    <section className="panel-surface today-section today-section--compact">
      <p className="section-note runtime-sidebar-copy">{label}</p>
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

  const snapshots = [];
  keys.forEach((key) => {
    try {
      snapshots.push({
        key,
        value: window.localStorage.getItem(key),
      });
    } catch (error) {
      console.error(`Failed to inspect cache key: ${key}`, error);
      throw new Error(`Failed to clear local cache. ${key}: ${normalizeError(error)}`);
    }
  });

  const removedSnapshots = [];
  for (const snapshot of snapshots) {
    try {
      window.localStorage.removeItem(snapshot.key);
      removedSnapshots.push(snapshot);
    } catch (error) {
      console.error(`Failed to remove cache key: ${snapshot.key}`, error);
      const rollbackFailures = restoreLocalStorageSnapshots(removedSnapshots);
      const rollbackDetail =
        rollbackFailures.length > 0
          ? ` Rollback failed for ${rollbackFailures.join("; ")}.`
          : "";
      throw new Error(
        `Failed to clear local cache. ${snapshot.key}: ${normalizeError(error)}.${rollbackDetail}`
      );
    }
  }
}

function restoreLocalStorageSnapshots(snapshots) {
  if (typeof window === "undefined") {
    return [];
  }

  return snapshots.reduce((failures, snapshot) => {
    try {
      if (snapshot.value === null) {
        window.localStorage.removeItem(snapshot.key);
      } else {
        window.localStorage.setItem(snapshot.key, snapshot.value);
      }
    } catch (error) {
      console.error(`Failed to restore cache key: ${snapshot.key}`, error);
      failures.push(`${snapshot.key}: ${normalizeError(error)}`);
    }
    return failures;
  }, []);
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

function resolveStateUpdater(current, updater) {
  return typeof updater === "function" ? updater(current) : updater;
}

function updateStoredValue({ key, parseRaw, serialize, updater, cacheLabel }) {
  if (typeof window === "undefined") {
    return parseRaw(serialize(resolveStateUpdater(parseRaw(null), updater)));
  }

  for (let attempt = 0; attempt < LOCAL_CACHE_WRITE_MAX_RETRIES; attempt += 1) {
    let raw = null;

    try {
      raw = window.localStorage.getItem(key);
      const current = parseRaw(raw);
      const next = resolveStateUpdater(current, updater);
      const serializedNext = serialize(next);
      const latestRaw = window.localStorage.getItem(key);

      if (latestRaw !== raw) {
        continue;
      }

      window.localStorage.setItem(key, serializedNext);

      if (window.localStorage.getItem(key) === serializedNext) {
        return parseRaw(serializedNext);
      }
    } catch (error) {
      console.error(`Failed to update ${cacheLabel}`, error);
      throw new Error(`Failed to persist ${cacheLabel}. ${normalizeError(error)}`);
    }
  }

  throw new Error(`Failed to persist ${cacheLabel}. Concurrent updates could not be reconciled.`);
}

function parseGalleryItemsRaw(raw) {
  if (!raw) {
    return [];
  }

  try {
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
    console.error("Failed to parse gallery cache", error);
    return [];
  }
}

function readGalleryItems() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return parseGalleryItemsRaw(window.localStorage.getItem(GALLERY_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read gallery cache", error);
    return [];
  }
}

function updateStoredGalleryItems(updater) {
  return updateStoredValue({
    key: GALLERY_STORAGE_KEY,
    parseRaw: parseGalleryItemsRaw,
    serialize: (items) => JSON.stringify(Array.isArray(items) ? items : []),
    updater,
    cacheLabel: "gallery cache",
  });
}

function readWeatherLocations() {
  if (typeof window === "undefined") {
    return WEATHER_LOCATIONS;
  }

  try {
    return parseWeatherLocationsRaw(window.localStorage.getItem(WEATHER_LOCATIONS_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read weather locations", error);
    return WEATHER_LOCATIONS;
  }
}

function parseWeatherLocationsRaw(raw) {
  if (!raw) {
    return WEATHER_LOCATIONS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return WEATHER_LOCATIONS;
    }

    const locations = parsed.map((item) => sanitizeWeatherLocation(item)).filter(Boolean);
    return locations.length > 0 ? locations : WEATHER_LOCATIONS;
  } catch (error) {
    console.error("Failed to parse weather locations", error);
    return WEATHER_LOCATIONS;
  }
}

function updateStoredWeatherLocations(updater) {
  return updateStoredValue({
    key: WEATHER_LOCATIONS_STORAGE_KEY,
    parseRaw: parseWeatherLocationsRaw,
    serialize: (locations) => {
      const normalizedLocations = (Array.isArray(locations) ? locations : [])
        .map((location) => sanitizeWeatherLocation(location))
        .filter(Boolean);
      return JSON.stringify(normalizedLocations.length > 0 ? normalizedLocations : WEATHER_LOCATIONS);
    },
    updater,
    cacheLabel: "weather cache",
  });
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

function normalizeReminderDueAt(value) {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatShortClock(value, lang = "en-US") {
  return new Date(value).toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

async function generateSkillDraft({ existingSkill, lang, prompt, settings, signal, t }) {
  return forgeSkill({
    existingSkill,
    lang,
    prompt,
    settings,
    signal,
  });
}

function readSkillHistory() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return parseSkillHistoryRaw(window.localStorage.getItem(SKILL_HISTORY_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read skill history", error);
    return {};
  }
}

function parseSkillHistoryRaw(raw) {
  if (!raw) {
    return {};
  }

  try {
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
    console.error("Failed to parse skill history", error);
    return {};
  }
}

function updateStoredSkillHistory(updater) {
  return updateStoredValue({
    key: SKILL_HISTORY_STORAGE_KEY,
    parseRaw: parseSkillHistoryRaw,
    serialize: (historyMap) => JSON.stringify(historyMap || {}),
    updater,
    cacheLabel: "skill history cache",
  });
}

function readLyricsCache() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return parseLyricsCacheRaw(window.localStorage.getItem(LYRICS_CACHE_STORAGE_KEY));
  } catch (error) {
    console.error("Failed to read lyrics cache", error);
    return {};
  }
}

function readLyricsCacheClearMarker() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return String(window.localStorage.getItem(LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY) || "");
  } catch (error) {
    console.error("Failed to read lyrics cache clear marker", error);
    return "";
  }
}

function writeLyricsCacheClearMarker(marker) {
  if (typeof window === "undefined") {
    return String(marker || "");
  }

  const normalizedMarker = String(marker || "");

  try {
    if (normalizedMarker) {
      window.localStorage.setItem(LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY, normalizedMarker);
    } else {
      window.localStorage.removeItem(LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY);
    }
    return normalizedMarker;
  } catch (error) {
    console.error("Failed to persist lyrics cache clear marker", error);
    throw new Error(`Failed to persist lyrics cache clear marker. ${normalizeError(error)}`);
  }
}

function parseLyricsCacheRaw(raw) {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse lyrics cache", error);
    return {};
  }
}

function updateStoredLyricsCache(updater) {
  return updateStoredValue({
    key: LYRICS_CACHE_STORAGE_KEY,
    parseRaw: parseLyricsCacheRaw,
    serialize: (cache) => JSON.stringify(cache || {}),
    updater,
    cacheLabel: "lyrics cache",
  });
}

function buildLyricsLookupStateFromCache(cache, trackList) {
  return (Array.isArray(trackList) ? trackList : []).reduce((accumulator, track) => {
    const cacheKey = getLyricsCacheEntryKey(track);
    const entry = cache?.[cacheKey];

    if (entry?.fingerprint !== cacheKey || !entry?.source) {
      return accumulator;
    }

    accumulator[track.id] = {
      status: entry.source === "manual" ? "manual" : "ready",
      error: "",
    };
    return accumulator;
  }, {});
}

function buildLyricsLookupStateWithClearMarker(cache, trackList) {
  return (Array.isArray(trackList) ? trackList : []).reduce((accumulator, track) => {
    if (!track?.id) {
      return accumulator;
    }

    const cacheKey = getLyricsCacheEntryKey(track);
    const entry = cache?.[cacheKey];
    accumulator[track.id] =
      entry?.fingerprint === cacheKey && entry?.source
        ? {
            status: entry.source === "manual" ? "manual" : "ready",
            error: "",
          }
        : {
            status: "cleared",
            error: "",
          };
    return accumulator;
  }, {});
}

function mergeLyricsLookupStateFromCache({ cache, previousState, trackList }) {
  const cacheState = buildLyricsLookupStateFromCache(cache, trackList);

  return Object.entries(previousState || {}).reduce((accumulator, [trackId, entry]) => {
    if (cacheState[trackId]) {
      return accumulator;
    }

    if (
      entry?.status === "loading" ||
      entry?.status === "cleared" ||
      String(entry?.error || "").trim()
    ) {
      accumulator[trackId] = entry;
    }
    return accumulator;
  }, { ...cacheState });
}

function clearClearedLyricsLookupState(lookupState) {
  return Object.entries(lookupState || {}).reduce((accumulator, [trackId, entry]) => {
    if (entry?.status !== "cleared") {
      accumulator[trackId] = entry;
    }
    return accumulator;
  }, {});
}

function getLyricsCacheEntryKey(track, duration) {
  void duration;
  const title = resolveLyricsCacheIdentityPart(track, "title");
  const artist = resolveLyricsCacheIdentityPart(track, "artist");
  return `${title}__${artist}`;
}

function resolveLyricsCacheIdentityPart(track, field) {
  const translationKeyField = `${field}Key`;
  return sanitizeLyricsSearchPart(track?.[translationKeyField] || track?.[field] || "");
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

  let url = "";

  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  } catch (error) {
    throw new Error(`Failed to export JSON file. ${normalizeError(error)}`);
  } finally {
    if (url) {
      try {
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to revoke exported JSON URL", error);
      }
    }
  }
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

function createAbortError(message) {
  if (typeof DOMException === "function") {
    return new DOMException(message, "AbortError");
  }
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

export default App;




