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
  saveSessionSkills,
  saveReminder,
  saveSkill,
  saveKnowledgeNote,
  saveSettings,
} from "./storage/agent";
import GalleryWorkspace from "./components/GalleryWorkspace";
import ReminderWorkspace from "./components/ReminderWorkspace";
import SkillWorkspace from "./components/SkillWorkspace";
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
  const [reminderDraft, setReminderDraft] = useState({ ...EMPTY_REMINDER_DRAFT });
  const [reminderSearch, setReminderSearch] = useState("");
  const [selectedReminderId, setSelectedReminderId] = useState(0);
  const [skillDraft, setSkillDraft] = useState({ ...EMPTY_SKILL_DRAFT });
  const [skillSearch, setSkillSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [galleryItems, setGalleryItems] = useState(() => readGalleryItems());
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [galleryViewerId, setGalleryViewerId] = useState("");
  const [tracks, setTracks] = useState(BUILT_IN_TRACKS);
  const [selectedTrackId, setSelectedTrackId] = useState(BUILT_IN_TRACKS[0].id);
  const [autoPlayOnReply, setAutoPlayOnReply] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(72);

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
      setIsPlaying(false);
      setCurrentTime(0);
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
  }, []);

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
  const selectedTrackSource = tracks.find((track) => track.id === selectedTrackId) || tracks[0] || null;
  const selectedTrack =
    localizedTracks.find((track) => track.id === selectedTrackId) || localizedTracks[0] || null;
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

  const filteredSkills = useMemo(() => {
    if (!skillSearch.trim()) {
      return skillList;
    }
    const needle = skillSearch.trim().toLowerCase();
    return skillList.filter((skill) =>
      [skill.name, skill.summary, skill.triggerHint]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [skillList, skillSearch]);

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

  const galleryFavoriteCount = useMemo(
    () => galleryItems.filter((item) => item.favorite).length,
    [galleryItems]
  );
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

  async function handleOpenSession(sessionId) {
    if (!sessionId || sessionId === activeSessionId) {
      return;
    }
    setBusy("open");
    setError("");
    try {
      const snapshot = await openSession(sessionId);
      setWorkspace(snapshot);
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
    setBusy("save-skill");
    setError("");
    try {
      const snapshot = await saveSkill({
        activeSessionId,
        skill: {
          id: skillDraft.id,
          name: skillDraft.name,
          description: skillDraft.description,
          instructions: skillDraft.instructions,
          triggerHint: skillDraft.triggerHint,
          enabled: Boolean(skillDraft.enabled),
        },
      });
      setWorkspace(snapshot);
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
  };

  return (
    <div className={`agent-app theme-${theme}`}>
      <div className="agent-app__glow agent-app__glow--one" />
      <div className="agent-app__glow agent-app__glow--two" />

      <aside className="session-rail panel-surface">
        <div className="rail-brand">
          <span className="rail-brand__tag">{t("app.brand.tag")}</span>
          <h1>MMGH Agent</h1>
          <p>{t("app.brand.description")}</p>
        </div>

        <div className="rail-stats">
          <StatCard label={t("app.stats.sessions")} value={String(sessionList.length).padStart(2, "0")} />
          <StatCard label={t("app.stats.notes")} value={String(noteList.length).padStart(2, "0")} />
          <StatCard label={t("app.stats.skills")} value={String(skillList.length).padStart(2, "0")} />
        </div>

        <div className="session-create">
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

        <div className="session-list">
          {sessionList.map((session) => (
            <button
              key={session.id}
              type="button"
              className={`session-card ${
                session.id === activeSessionId ? "is-active" : ""
              }`}
              onClick={() => handleOpenSession(session.id)}
            >
              <div className="session-card__head">
                <strong>{session.title}</strong>
                <span className={`status-chip status-${session.status}`}>
                  {t(`app.status.${session.status}`)}
                </span>
              </div>
              <p>{session.lastMessagePreview || t("app.session.emptyMessages")}</p>
              <div className="session-card__meta">
                <span>{t("app.session.messageCount", { count: session.messageCount })}</span>
                <span>{formatTime(session.updatedAt, lang)}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="ghost-button danger-button"
          onClick={() => handleDeleteSession(activeSessionId)}
          disabled={!activeSessionId || busy !== "" || loading}
        >
          {t("app.session.delete")}
        </button>
      </aside>

      <main className="workspace-column">
        <section className="workspace-hero panel-surface">
          <div className="workspace-hero__headline">
            <span className="eyebrow">{viewMeta[currentView].eyebrow}</span>
            <h2>{viewMeta[currentView].title}</h2>
            <p>{viewMeta[currentView].description}</p>
          </div>
          <div className="workspace-hero__actions">
            <div className="mode-switch mode-switch--inline">
              <button
                type="button"
                className={`mode-switch__button ${currentView === "agent" ? "is-active" : ""}`}
                onClick={() => setCurrentView("agent")}
              >
                {t("app.mode.agent")}
              </button>
              <button
                type="button"
                className={`mode-switch__button ${currentView === "knowledge" ? "is-active" : ""}`}
                onClick={() => setCurrentView("knowledge")}
                >
                  {t("app.mode.knowledge")}
                </button>
                <button
                  type="button"
                  className={`mode-switch__button ${currentView === "gallery" ? "is-active" : ""}`}
                  onClick={() => setCurrentView("gallery")}
                >
                  {t("app.mode.gallery")}
                </button>
                <button
                  type="button"
                  className={`mode-switch__button ${currentView === "reminders" ? "is-active" : ""}`}
                  onClick={() => setCurrentView("reminders")}
                >
                  {t("app.mode.reminders")}
                </button>
                <button
                  type="button"
                  className={`mode-switch__button ${currentView === "skills" ? "is-active" : ""}`}
                  onClick={() => setCurrentView("skills")}
                >
                  {t("app.mode.skills")}
                </button>
            </div>
            <div className="hero-badges">
              {viewMeta[currentView].badges.map((badge) => (
                <Badge key={`${currentView}-${badge.label}`} label={badge.label} value={badge.value} />
              ))}
            </div>
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
            <button
              type="button"
              className="ghost-button"
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? t("app.theme.light") : t("app.theme.dark")}
            </button>
          </div>
        </section>

        {error ? <div className="error-banner">{error}</div> : null}

        {currentView === "agent" ? (
          <section className="conversation-panel panel-surface">
            <div className="section-head">
              <div>
                <span className="eyebrow">{t("app.agent.conversation.eyebrow")}</span>
                <h3>{t("app.agent.conversation.title")}</h3>
              </div>
              <span className="section-note">
                {loading
                  ? t("app.common.loading")
                  : t("app.agent.conversation.entries", {
                      count: activeSession?.messages?.length || 0,
                    })}
              </span>
            </div>

            <div className="conversation-skill-strip">
              <div>
                <span className="eyebrow">{t("app.agent.mount.eyebrow")}</span>
                <h4>
                  {activeSessionSkills.length > 0
                    ? t("app.agent.mount.title")
                    : t("app.agent.mount.emptyTitle")}
                </h4>
              </div>
              <div className="conversation-skill-strip__chips">
                {activeSessionSkills.length > 0 ? (
                  activeSessionSkills.map((skill) => (
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
                  ))
                ) : (
                  <span className="section-note">
                    {t("app.agent.mount.emptyDescription")}
                  </span>
                )}
              </div>
            </div>

            <div className="conversation-shell">
              <div className="conversation-thread">
                <div className="message-list">
                  {activeSession?.messages?.map((message) => (
                    <article
                      key={message.id}
                      className={`message-card role-${message.role || "assistant"}`}
                    >
                      <div className="message-card__meta">
                        <span>
                          {t(
                            message.role === "user"
                              ? "app.agent.message.operator"
                              : "app.agent.message.agent"
                          )}
                        </span>
                        <span>{formatTime(message.createdAt, lang)}</span>
                      </div>
                      <pre>{message.content}</pre>
                    </article>
                  ))}
                </div>

                <form className="composer" onSubmit={handleRunAgent}>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t("app.agent.composer.placeholder")}
                    rows={5}
                  />
                  <div className="composer__actions">
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
                      {busy === "run" ? t("app.common.sending") : t("app.common.send")}
                    </button>
                  </div>
                </form>
              </div>

              <aside className="session-history-bar">
                <div className="session-history-bar__head">
                  <div>
                    <span className="eyebrow">{t("app.agent.history.eyebrow")}</span>
                    <h4>{t("app.agent.history.title")}</h4>
                  </div>
                  <span className="section-note">
                    {t("app.agent.history.total", { count: sessionList.length })}
                  </span>
                </div>

                <div className="session-history-list">
                  {sessionList.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={`session-history-card ${
                        session.id === activeSessionId ? "is-active" : ""
                      }`}
                      onClick={() => handleOpenSession(session.id)}
                    >
                      <div className="session-history-card__head">
                        <strong>{session.title}</strong>
                        <span className={`status-chip status-${session.status}`}>
                          {t(`app.status.${session.status}`)}
                        </span>
                      </div>
                      <p>{session.lastMessagePreview || t("app.session.emptyMessages")}</p>
                      <div className="session-history-card__meta">
                        <span>{t("app.session.messageCount", { count: session.messageCount })}</span>
                        <span>
                          {t("app.agent.history.skillCount", {
                            count: session.mountedSkillCount || 0,
                          })}
                        </span>
                        <span>{formatTime(session.updatedAt, lang)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          </section>
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
        ) : currentView === "skills" ? (
          <SkillWorkspace
            activeSkill={activeSkill}
            activeSkillId={activeSkillId}
            activeSessionTitle={activeSession?.session?.title || t("app.skills.currentSession")}
            busy={busy}
            filteredSkills={filteredSkills}
            handleCreateSkill={handleCreateSkill}
            handleDeleteSkill={handleDeleteSkill}
            handleOpenSkill={handleOpenSkill}
            handleSaveSkill={handleSaveSkill}
            handleToggleSkillMounted={handleToggleSkillMounted}
            hasUnsavedSkill={hasUnsavedSkill}
            loading={loading}
            mountedSkillIds={activeSessionSkillIds}
            setSkillDraft={setSkillDraft}
            setSkillSearch={setSkillSearch}
            skillDraft={skillDraft}
            skillSearch={skillSearch}
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

        <section className="music-stage panel-surface">
          <div className={`music-stage__content theme-${selectedTrack?.theme || "ember"}`}>
            <div className="music-cover-stack">
              <div className={`music-vinyl ${isPlaying ? "is-spinning" : ""}`}>
                <img src={selectedTrack?.cover} alt={selectedTrack?.title || t("app.music.trackCover")} />
                <span className="music-vinyl__core" />
              </div>
              <div className="music-cover-meta">
                <span className="eyebrow">{t("app.music.eyebrow")}</span>
                <h3>{selectedTrack?.title || t("app.music.noTrack")}</h3>
                <p>{selectedTrack?.artist || t("app.music.noArtist")}</p>
                <div className="music-status-row">
                  <span className={`status-chip ${isPlaying ? "status-running" : "status-idle"}`}>
                    {isPlaying ? t("app.music.playing") : t("app.music.paused")}
                  </span>
                  <span className="status-chip status-completed">
                    {autoPlayOnReply ? t("app.music.replySyncOn") : t("app.music.manualMode")}
                  </span>
                </div>
              </div>
            </div>

            <div className="music-live-panel">
              <div className="music-bars" aria-hidden="true">
                {Array.from({ length: 18 }).map((_, index) => (
                  <span
                    key={index}
                    className={`music-bar ${isPlaying ? "is-active" : ""}`}
                    style={{ animationDelay: `${index * 90}ms` }}
                  />
                ))}
              </div>
              <div className="music-progress">
                <span>{formatDuration(currentTime)}</span>
                <input
                  className="music-slider"
                  type="range"
                  min="0"
                  max={Math.max(duration, 1)}
                  step="0.1"
                  value={Math.min(currentTime, duration || 0)}
                  onChange={handleSeek}
                />
                <span>{formatDuration(duration)}</span>
              </div>
              <div className="music-controls">
                <button type="button" className="icon-button" onClick={handleRestartTrack}>
                  {t("app.music.restart")}
                </button>
                <button type="button" className="solid-button" onClick={handleTogglePlayback}>
                  {isPlaying ? t("app.music.pause") : t("app.music.play")}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  {t("app.music.upload")}
                </button>
              </div>
              <div className="music-volume">
                <span>{t("app.music.volume")}</span>
                <input
                  className="music-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                />
                <span>{volume}%</span>
              </div>
            </div>
          </div>

          <audio ref={audioRef} preload="metadata">
            {selectedTrackSource ? <source src={selectedTrackSource.src} type="audio/mpeg" /> : null}
          </audio>
        </section>
      </main>

      <aside className="inspector-column">
        <section className="panel-surface runtime-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.runtime.eyebrow")}</span>
              <h3>{t("app.runtime.title")}</h3>
            </div>
          </div>
          <div className="capability-grid">
            {capabilities.map((item) => (
              <article key={item.id} className="capability-card">
                <span className="capability-card__status">{t(`app.status.${item.status}`)}</span>
                <strong>{t(`app.capability.${item.id}.title`)}</strong>
                <p>{t(`app.capability.${item.id}.description`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-surface sound-panel">
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

        <section className="panel-surface activity-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.activity.eyebrow")}</span>
              <h3>{t("app.activity.title")}</h3>
            </div>
          </div>
          <div className="activity-list">
            {activeSession?.activity?.map((item) => (
              <article key={item.id} className="activity-card">
                <div className="activity-card__head">
                  <strong>{item.title}</strong>
                  <span className={`status-chip status-${item.status}`}>
                    {t(`app.status.${item.status}`)}
                  </span>
                </div>
                <p>{item.detail}</p>
                <span className="section-note">{formatTime(item.createdAt, lang)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-surface settings-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.settings.eyebrow")}</span>
              <h3>{t("app.settings.title")}</h3>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleSaveSettings}>
            <label>
              <span>{t("app.settings.providerName")}</span>
              <input
                className="field-input"
                value={settingsForm.providerName || ""}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    providerName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>{t("app.settings.baseUrl")}</span>
              <input
                className="field-input"
                value={settingsForm.baseUrl || ""}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    baseUrl: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>{t("app.settings.apiKey")}</span>
              <input
                className="field-input"
                type="password"
                value={settingsForm.apiKey || ""}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    apiKey: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>{t("app.settings.model")}</span>
              <input
                className="field-input"
                value={settingsForm.model || ""}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    model: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>{t("app.settings.systemPrompt")}</span>
              <textarea
                className="field-area"
                rows={5}
                value={settingsForm.systemPrompt || ""}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    systemPrompt: event.target.value,
                  }))
                }
              />
            </label>

            <button
              type="submit"
              className="solid-button"
              disabled={busy !== "" || !hasUnsavedSettings}
            >
              {busy === "save-settings" ? t("app.common.saving") : t("app.settings.save")}
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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

  return (
    <section className="knowledge-panel panel-surface">
      <div className="knowledge-sidebar">
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
                <strong>{note.title}</strong>
              </div>
              <p>{note.summary}</p>
              <div className="knowledge-note-card__meta">
                <span>{(note.tags || []).slice(0, 2).join(" | ") || t("app.knowledge.noTags")}</span>
                <span>{formatTime(note.updatedAt, lang)}</span>
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
