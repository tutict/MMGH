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
} from "../storage/agent";
import MiniPlayerBar from "../components/MiniPlayerBar";
import { WEATHER_LOCATIONS } from "../components/weatherData";
import { LANG_PERSIST_ERROR_EVENT, useI18n } from "../i18n";
import { useGalleryController } from "./useGalleryController";
import { useWeatherController } from "./useWeatherController";
import { useMusicController } from "./useMusicController";
import { useReminderAlerts } from "./useReminderAlerts";
import { assessProviderBaseUrl } from "../security/provider";
import {
  appendNoteSection,
  buildDefaultFollowUpTitle,
  buildFollowUpReminderDetail,
  buildFollowUpReminderDueAt,
  buildReminderCompletionDetail,
  buildReminderCompletionNoteEntry,
  buildSessionCaptureDraft,
  createReminderCompletionDraft,
  findNoteIdByTitle,
  formatTime,
  mergeUniqueTags,
  resolveReminderUrgency,
  resolveRuleActionTone,
  toDateTimeLocalValue,
} from "../utils/todayWorkflow";
import {
  buildRecurringPatternInsights,
  buildRuleActionRecommendations,
  buildRuleEffectivenessInsights,
  buildRuntimeRecommendedSkills,
  buildTodayReviewSignals,
  selectCompletedTodayItems,
  selectContinueSessionItems,
  selectDueReminderCount,
  selectOpenReminderCount,
  selectRecentCaptureItems,
  selectRecurringReminderPatterns,
  selectTodayReminderItems,
} from "../utils/todayInsights";
import { mergeWorkspaceSnapshot } from "../application/workspaceSnapshot";
import useDesktopRuntime from "../application/useDesktopRuntime";
import {
  createAbortError,
  downloadJsonFile,
  formatShortClock,
  normalizeError,
  normalizeReminderDueAt,
  parseTags,
  slugifyFileName,
} from "../utils/appUtils";
import {
  GALLERY_STORAGE_KEY,
  LEGACY_ALBUM_STORAGE_KEY,
} from "../utils/galleryStorage";
import {
  getStoredArrayLength,
  removeLocalStorageKeys,
} from "../utils/localStorageCache";
import {
  LYRICS_CACHE_CLEAR_MARKER_STORAGE_KEY,
  LYRICS_CACHE_STORAGE_KEY,
  buildLyricsLookupStateWithClearMarker,
  clearClearedLyricsLookupState,
  writeLyricsCacheClearMarker,
} from "../utils/lyrics";
import {
  SKILL_HISTORY_STORAGE_KEY,
  appendSkillHistoryEntry,
  buildSkillDraftFromVersion,
  getSkillHistoryEntries,
  parseImportedSkills,
  readSkillHistory,
  removeSkillHistoryEntries,
  shouldTrackSkillVersion,
  updateStoredSkillHistory,
} from "../utils/skillHistory";
import {
  WEATHER_LOCATIONS_STORAGE_KEY,
  WEATHER_RECENT_SEARCHES_STORAGE_KEY,
  WEATHER_USAGE_STORAGE_KEY,
  sanitizeWeatherLocation,
} from "../utils/weatherStorage";
import useMobileViewport from "../components/mobile/useMobileViewport";
import { AppButton, AppTextField } from "../components/ui";
import { resolveSkillDisplayTitle } from "../skills/starterSkillTitles";

const GalleryWorkspace = lazy(() => import("../components/GalleryWorkspace"));
const KnowledgeVault = lazy(() => import("../components/KnowledgeVault"));
const MusicWorkspace = lazy(() => import("../components/MusicWorkspace"));
const ReminderWorkspace = lazy(() => import("../components/ReminderWorkspace"));
const ReminderCompletionDialog = lazy(() => import("../components/ReminderCompletionDialog"));
const RuntimeWorkspace = lazy(() => import("../components/RuntimeWorkspace"));
const SettingsWorkspace = lazy(() => import("../components/SettingsWorkspace"));
const SkillWorkspace = lazy(() => import("../components/SkillWorkspace"));
const TodayWorkspace = lazy(() => import("../components/TodayWorkspace"));
const WeatherWorkspace = lazy(() => import("../components/WeatherWorkspace"));

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
const THEME_STORAGE_KEY = "mmgh-theme";

// The settings form starts out empty, so the first workspace snapshot has to fill
// it in. Fields the user already edited keep their typed value.
function mergeSettingsForm(workspaceSettings, currentForm, touchedFields) {
  const merged = { ...workspaceSettings, clearApiKey: false };
  for (const field of touchedFields) {
    if (Object.prototype.hasOwnProperty.call(currentForm, field)) {
      merged[field] = currentForm[field];
    }
  }
  return merged;
}

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


export function useWorkspaceController() {
  const { lang, setLang, t } = useI18n();
  const [workspace, setWorkspace] = useState(null);
  const [workspaceReadyAt, setWorkspaceReadyAt] = useState(0);
  const [currentView, setCurrentView] = useState("today");
  const isMobileViewport = useMobileViewport("(max-width: 760px)");
  const [theme, setTheme] = useState(() => {
    const savedTheme = readStoredTheme();
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    if (typeof window === "undefined") {
      return "light";
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  const [collapsedSessionGroups, setCollapsedSessionGroups] = useState({});
  const [collapsedSessionPreviews, setCollapsedSessionPreviews] = useState({});
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [isAppVisible, setIsAppVisible] = useState(() => readInitialAppVisibility());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const handleDesktopVisibilityChange = useCallback((visible: boolean) => {
    setIsAppVisible(visible);
  }, []);
  const handleDesktopRestoredFromTray = useCallback(() => {
    setNotice(t("app.desktop.runtime.notice.restored"));
  }, [t]);
  const desktopRuntime = useDesktopRuntime({
    onRestoredFromTray: handleDesktopRestoredFromTray,
    onVisibilityChange: handleDesktopVisibilityChange,
  });
  const {
    galleryFilter,
    galleryItems,
    gallerySearch,
    galleryUploadInputRef,
    galleryViewerId,
    handleClearMediaCache,
    handleDeleteGalleryItem,
    handleGalleryUpload,
    handleToggleFavoriteGalleryItem,
    setGalleryFilter,
    setGalleryItems,
    setGallerySearch,
    setGalleryViewerId,
    syncGalleryCacheFromStorage,
  } = useGalleryController({ setError, t });
  const {
    audioSlot, autoPlayOnReply, handleCyclePlayMode, handlePlayNextTrack, handlePlayPreviousTrack,
    handleRefreshLyrics, handleRestartTrack, handleSeek, handleSelectTrack, handleTogglePlayback,
    handleUploadLyricsFile, handleUploadTracks, invalidateAllLyricsRequestVersions, isPlaying, localizedTracks,
    lyricsCache, lyricsCacheClearMarker, lyricsUploadInputRef, playMode, playerAudioElement,
    selectedTrack, selectedTrackId, selectedTrackLyrics, selectedTrackLyricsError, selectedTrackLyricsSource,
    selectedTrackLyricsStatus, selectedTrackSource, setAutoPlayOnReply, setLyricsCache, setLyricsCacheClearMarker,
    setLyricsLookupState, setVolume, showMiniPlayer, syncLyricsCacheFromStorage, syncLyricsClearMarkerFromStorage,
    tracks, uploadInputRef, volume,
  } = useMusicController({ activeSession: workspace?.activeSession, currentView, isAppVisible, setError, t });
  const [skillHistoryMap, setSkillHistoryMap] = useState(() => readSkillHistory());
  const deferredNoteSearch = useDeferredValue(noteSearch);
  const deferredSessionSearch = useDeferredValue(sessionSearch);


  const skillImportInputRef = useRef(null);
  const pendingWorkspaceSyncRef = useRef(false);
  const hasUnsavedWorkspaceDraftsRef = useRef(false);
  const settingsHydratedRef = useRef(false);
  const settingsTouchedFieldsRef = useRef(new Set<string>());
  const busyRef = useRef("");
  const loadingRef = useRef(true);
  const mobileDrawerPanelRef = useRef(null);
  const inspectorDrawerPanelRef = useRef(null);
  const reminderCompletionPanelRef = useRef(null);
  const lastMobileNavTriggerRef = useRef(null);
  const lastInspectorTriggerRef = useRef(null);
  const lastReminderCompletionTriggerRef = useRef(null);
  const runAgentRequestVersionRef = useRef(0);
  const forgeSkillRequestVersionRef = useRef(0);
  const forgeSkillAbortControllerRef = useRef(null);
  // The first hydration must not overwrite a field the user already typed into,
  // so every user-driven update records the fields it touched.
  const changeSettingsForm = useCallback((updater) => {
    setSettingsForm((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      for (const field of Object.keys(next)) {
        if (next[field] !== previous[field]) {
          settingsTouchedFieldsRef.current.add(field);
        }
      }
      return next;
    });
  }, []);
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
  // The moment the workspace first becomes available. Reminder alerts use it to
  // tell leftovers from reminders the user creates during the session.
  const markWorkspaceReady = useCallback(() => {
    setWorkspaceReadyAt((current) => current || Date.now());
  }, []);
  const {
    handleAddWeatherCity,
    handleClearWeatherCache,
    handleRemoveWeatherCity,
    loadWeatherSnapshotData,
    resetWeatherAfterClearAll,
    selectedWeatherCityId,
    setSelectedWeatherCityId,
    setWeatherAuxCacheVersion,
    syncWeatherCacheFromStorage,
    weatherAuxCacheVersion,
    weatherCities,
    weatherError,
    weatherLocations,
    weatherStatus,
    weatherUpdatedAt,
  } = useWeatherController({ currentView, openView, setError, t });




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


  const syncWorkspaceFromStorage = useCallback(async (options: { force?: boolean } = {}) => {
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
      markWorkspaceReady();
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
  }, [markWorkspaceReady, t]);

  const commitWorkspaceSnapshot = useCallback((snapshot) => {
    if (!snapshot) {
      return;
    }

    markWorkspaceReady();
    startTransition(() => {
      setWorkspace((current) => mergeWorkspaceSnapshot(current, snapshot));
    });
  }, [markWorkspaceReady]);



  const syncSkillHistoryFromStorage = useCallback(() => {
    setSkillHistoryMap(readSkillHistory());
  }, []);



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
    setLyricsLookupState,
    setWeatherAuxCacheVersion,
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
  }, [localizedTracks, lyricsCache, lyricsCacheClearMarker, setLyricsLookupState]);

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









  const selectedReminder = workspace?.activeReminder || null;

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
    if (workspace?.settings) {
      if (!settingsHydratedRef.current) {
        settingsHydratedRef.current = true;
        // The form starts out empty, so the first snapshot has to fill it in. A
        // field the user already touched keeps the typed value instead.
        setSettingsForm((previous) =>
          mergeSettingsForm(workspace.settings, previous, settingsTouchedFieldsRef.current)
        );
      } else if (!hasUnsavedSettings) {
        setSettingsForm({
          ...workspace.settings,
          clearApiKey: false,
        });
      }
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

  const handleSelectReminder = useCallback(async (reminderId: number, options: { force?: boolean } = {}) => {
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
      Object.values(skillHistoryMap as Record<string, any[]>).reduce(
        (total: number, versions) => total + (Array.isArray(versions) ? versions.length : 0),
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
      ["today", "agent", "knowledge", "reminders"]
        .map((id) => allNavigationItems.find((item) => item.id === id))
        .filter(Boolean),
    [allNavigationItems]
  );
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

  const openDueReminder = useCallback(async (dueReminder) => {
    setNotice("");
    setIsInspectorOpen(false);
    setIsMobileNavOpen(false);
    setCurrentView("reminders");
    return handleSelectReminder(dueReminder.id, { force: true });
  }, [handleSelectReminder]);
  useReminderAlerts({
    active: !(hasUnsavedWorkspaceDrafts || busy !== "" || loading),
    onOpen: openDueReminder,
    reminders,
    t,
    workspaceReadyAt,
  });


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
    changeSettingsForm((prev) => ({
      ...prev,
      clearApiKey: !prev.clearApiKey,
      hasApiKey: prev.clearApiKey ? Boolean(workspace?.settings?.hasApiKey) : false,
      apiKey: "",
    }));
  }, [changeSettingsForm, workspace?.settings?.hasApiKey]);

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
      const generatedSkill = await forgeSkill({
        existingSkill: mode === "rewrite" ? activeSkill : null,
        lang,
        prompt,
        signal: controller.signal,
        settings: settingsForm,
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
      resetWeatherAfterClearAll(fallbackLocations);
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
      title: t("app.view.music.title"),
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
          value:
            weatherStatus === "idle" || weatherStatus === "error"
              ? t(`app.weather.status.${weatherStatus}`)
              : t(activeWeatherCity.conditionKey),
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
      title: resolveSkillDisplayTitle(activeSkill, t) || t("app.view.skills.title"),
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

  const sessionLibraryPanel = (
    <section className="panel-surface today-section">
        <div className="rail-section__head rail-section__head--split">
          <div>
            <span className="eyebrow">{t("app.nav.sessions.eyebrow")}</span>
            <strong>{t("app.nav.sessions.title")}</strong>
          </div>
          <AppButton
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
          </AppButton>
        </div>

        {isSessionLibraryCollapsed ? (
          <div className="session-library-summary">
            <strong>{activeSession?.session?.title || t("app.session.defaultTitle")}</strong>
            <span>{t("app.nav.sessions.summary", { count: sessionList.length })}</span>
          </div>
        ) : (
          <div className="session-stack">
            <div className="session-toolbar">
              <AppTextField
                value={newSessionTitle}
                onChange={(event) => setNewSessionTitle(event.target.value)}
                placeholder={t("app.session.newPlaceholder")}
                aria-label={t("app.session.newPlaceholder")}
                size="small"
                fullWidth
              />
              <AppButton
                className="ghost-button"
                onClick={handleCreateSession}
                disabled={busy !== "" || loading}
              >
                {t("app.session.create")}
              </AppButton>
            </div>

            <AppTextField
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder={t("app.session.searchPlaceholder")}
              aria-label={t("app.session.searchLabel")}
              size="small"
              fullWidth
            />

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
                        <AppButton
                          className="session-group__head"
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
                        </AppButton>
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
                                  <AppButton
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
                                      <span className={`session-card__badge status-${session.status}`}>
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
                                  </AppButton>
                                  <AppButton
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
                                  </AppButton>
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

            <AppButton
              className="ghost-button danger-button session-stack__danger"
              onClick={() => handleDeleteSession(activeSessionId)}
              disabled={!activeSessionId || busy !== "" || loading}
            >
              {t("app.session.delete")}
            </AppButton>
          </div>
        )}
      </section>
  );

  const railPresenceStatus = loading || busy ? "running" : providerConfigured ? "ready" : "idle";
  const workspaceLoadingFallback = <WorkspaceLoadingState label={t("app.common.loading")} />;
  const stage = (
    <>
      {currentView === "agent" ? <div className="desk-sessions">{sessionLibraryPanel}</div> : null}
      <div className="desk-stage__content">
        {currentView === "today" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <TodayWorkspace
              activeSession={activeSession}
              activeSessionId={activeSessionId}
              busy={busy}
              clockNow={clockNow}
              completedTodayItems={completedTodayItems}
              continueSessionItems={continueSessionItems}
              formatTime={formatTime}
              handleOpenNote={handleOpenNote}
              handleOpenLinkedNote={handleOpenReminderNote}
              handleOpenSession={handleOpenSession}
              handleOpenSkill={handleOpenSkill}
              handleSelectReminder={handleSelectReminder}
              handleToggleSkillMounted={handleToggleSkillMounted}
              handleToggleTodayReminderStatus={handleToggleTodayReminderStatus}
              lang={lang}
              loading={loading}
              noteList={noteList}
              openReminderCount={openReminderCount}
              openView={openView}
              recentCaptureItems={recentCaptureItems}
              resolveReminderUrgency={resolveReminderUrgency}
              resolveRuleActionTone={resolveRuleActionTone}
              ruleActionRecommendations={ruleActionRecommendations}
              todayReminderItems={todayReminderItems}
              todayReviewSignals={todayReviewSignals}
            />
          </Suspense>
        ) : currentView === "agent" ? (
          <Suspense fallback={workspaceLoadingFallback}>
            <RuntimeWorkspace
              activeSession={activeSession}
              activeSessionRecommendedSkills={runtimeRecommendedSkills}
              activeSessionSkills={activeSessionSkills}
              busy={busy}
              captureDraft={runtimeCaptureDraft}
              draft={draft}
              formatTime={formatTime}
              handleCaptureSessionNote={handleCaptureSessionNote}
              handleCaptureSessionReminder={handleCaptureSessionReminder}
              handleOpenSkill={handleOpenSkill}
              handleRunAgent={handleRunAgent}
              handleToggleSkillMounted={handleToggleSkillMounted}
              lang={lang}
              loading={loading}
              mountedSkillIds={activeSessionSkillIds}
              normalizeActivityKind={normalizeActivityKind}
              openView={openView}
              PanelIcon={PanelIcon}
              providerConfigured={providerConfigured}
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
              onUploadTracks={handleUploadTracks}
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
              setLang={setLang}
              setSettingsForm={changeSettingsForm}
              setTheme={setTheme}
              theme={theme}
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
      </div>
    </>
  );
  const miniPlayer = (
    <MiniPlayerBar
      handleOpenMusicWorkspace={() => openView("music")}
      handlePlayNextTrack={handlePlayNextTrack}
      handlePlayPreviousTrack={handlePlayPreviousTrack}
      handleSeek={handleSeek}
      handleTogglePlayback={handleTogglePlayback}
      isPlaying={isPlaying}
      placement={isMobileViewport ? "phone" : "desk"}
      selectedTrack={selectedTrack}
    />
  );
  return {
    activeNote,
    activeNoteId,
    activeSession,
    activeSessionId,
    activeSessionSkillIds,
    activeSessionSkills,
    activeSkill,
    activeSkillId,
    activeSkillVersions,
    activeWeatherCity,
    agendaReminderItems: todayReminderItems,
    allNavigationItems,
    audioSlot,
    autoPlayOnReply,
    busy,
    cacheCards,
    capabilities,
    desktopRuntimeMeta,
    clockNow,
    closeReminderCompletionDialog,
    completedTodayItems,
    continueSessionItems,
    currentView,
    draft,
    dueReminderCount,
    error,
    filteredNotes,
    formatShortClock,
    formatTime,
    galleryFilter,
    galleryItems,
    gallerySearch,
    galleryViewerId,
    handleAddWeatherCity,
    handleCaptureSessionNote,
    handleCaptureSessionReminder,
    handleClearApiKey,
    handleCreateNote,
    handleCreateReminder,
    handleCreateSkill,
    handleCyclePlayMode,
    handleDeleteGalleryItem,
    handleDeleteNote,
    handleDeleteReminder,
    handleDeleteSkill,
    handleExportAllSkills,
    handleExportSkill,
    handleForgeSkill,
    handleGalleryUpload,
    handleImportSkills,
    handleInstallSkillTemplate,
    handleLoadSkillVersion,
    handleOpenNote,
    handleOpenReminderNote,
    handleOpenSession,
    handleOpenSkill,
    handlePlayNextTrack,
    handlePlayPreviousTrack,
    handleRefreshLyrics,
    handleRemoveWeatherCity,
    handleRestartTrack,
    handleRestoreSkillVersion,
    handleRunAgent,
    handleSaveNote,
    handleSaveReminder,
    handleSaveSettings,
    handleSaveSkill,
    handleSeek,
    handleSelectReminder,
    handleSelectTrack,
    handleSubmitReminderCompletion,
    handleToggleFavoriteGalleryItem,
    handleTogglePlayback,
    handleToggleSkillMounted,
    handleToggleTodayReminderStatus,
    handleUploadLyricsFile,
    hasUnsavedNote,
    hasUnsavedReminder,
    hasUnsavedSettings,
    hasUnsavedSkill,
    isAppVisible,
    isMobileViewport,
    isPlaying,
    isReminderCompletionOpen,
    lang,
    loadWeatherSnapshotData,
    loading,
    localizedTracks,
    miniPlayer,
    mobileDockItems,
    mountedSkillIds: activeSessionSkillIds,
    noteDraft,
    noteList,
    noteSearch,
    notice,
    openReminderCount,
    openView,
    playMode,
    playerAudioElement,
    providerConfigured,
    providerSecurityAssessment,
    providerSecurityMessage,
    railPresenceStatus,
    recentCaptureItems,
    reminderCompletionDraft,
    reminderDraft,
    reminderSearch,
    reminders,
    resolveReminderUrgency,
    resolveRuleActionTone,
    ruleActionRecommendations,
    runtimeCaptureDraft,
    runtimeRecommendedSkills,
    selectedReminderId,
    selectedTrack,
    selectedTrackId,
    selectedTrackLyrics,
    selectedTrackLyricsError,
    selectedTrackLyricsSource,
    selectedTrackLyricsStatus,
    selectedTrackSource,
    selectedWeatherCityId,
    sessionLibraryPanel,
    sessionList,
    setAutoPlayOnReply,
    setDraft,
    setError,
    setGalleryFilter,
    setGallerySearch,
    setGalleryViewerId,
    setLang,
    setNoteDraft,
    setNoteSearch,
    setReminderCompletionDraft,
    setReminderDraft,
    setReminderSearch,
    setSelectedWeatherCityId,
    setSettingsForm: changeSettingsForm,
    setSkillDraft,
    setSkillSearch,
    setTheme,
    setVolume,
    settingsForm,
    showMiniPlayer,
    skillActionContextKey,
    skillDraft,
    skillList,
    skillSearch,
    stage,
    t,
    theme,
    todayReminderItems,
    todayReviewSignals,
    viewMeta,
    volume,
    weatherAuxCacheVersion,
    weatherCities,
    weatherError,
    weatherLocations,
    weatherStatus,
    weatherUpdatedAt,
    workspaceLoadingFallback,
    PanelIcon,
    normalizeActivityKind,
  };
}

function getFocusableElements(container: ParentNode | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element): element is HTMLElement => {
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

function focusDialogPanel(panel: HTMLElement | null) {
  if (!panel) {
    return;
  }

  const [firstFocusable] = getFocusableElements(panel);
  const target = firstFocusable || panel;

  if (target instanceof HTMLElement) {
    target.focus();
  }
}

function trapFocusWithinPanel(event: KeyboardEvent, panel: HTMLElement) {
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
    <section className="panel-surface today-section">
      <p className="section-note">{label}</p>
    </section>
  );
}











