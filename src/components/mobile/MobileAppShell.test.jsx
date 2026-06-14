import React, { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import MobileAgentView from "./MobileAgentView";
import MobileAppShell from "./MobileAppShell";
import MobileKnowledgeView from "./MobileKnowledgeView";
import MobileRemindersView from "./MobileRemindersView";
import MobileSettingsView from "./MobileSettingsView";

const now = 1_710_000_000_000;

function Icon() {
  return <span data-testid="mobile-test-icon" />;
}

function t(key, params = {}) {
  const copy = {
    "app.common.cancel": "Cancel",
    "app.common.delete": "Delete",
    "app.common.dirty": "dirty",
    "app.common.saved": "saved",
    "app.common.saving": "Saving...",
    "app.provider.configured": "Configured",
    "app.provider.pending": "Pending",
    "app.reminders.bucket.done": "Done",
    "app.reminders.bucket.overdue": "Overdue",
    "app.reminders.bucket.today": "Today",
    "app.reminders.bucket.upcoming": "Upcoming",
    "app.reminders.defaultTitle": "New reminder",
    "app.reminders.editor.eyebrow": "Planner",
    "app.reminders.emptyBucket": "No reminders in this bucket.",
    "app.reminders.emptyState.description": "Create one to attach a due time.",
    "app.reminders.eyebrow": "Alarm",
    "app.reminders.form.dueTime": "Due time",
    "app.reminders.form.linkedNote": "Linked note",
    "app.reminders.form.noLinkedNote": "No linked note",
    "app.reminders.form.note": "Reminder note",
    "app.reminders.form.notePlaceholder": "Reminder details",
    "app.reminders.form.severity": "Severity",
    "app.reminders.form.status": "Status",
    "app.reminders.form.title": "Title",
    "app.reminders.form.titlePlaceholder": "Reminder title",
    "app.reminders.linked": `Linked: ${params.title || ""}`,
    "app.reminders.linkedTo": "Linked to",
    "app.reminders.newReminder": "New reminder",
    "app.reminders.noDueDate": "No due date",
    "app.reminders.note": "note",
    "app.reminders.openNote": "Open note",
    "app.reminders.save": "Save reminder",
    "app.reminders.search": "Search reminders",
    "app.reminders.severity.critical": "Critical",
    "app.reminders.severity.high": "High",
    "app.reminders.severity.low": "Low",
    "app.reminders.severity.medium": "Medium",
    "app.reminders.status.done": "Done",
    "app.reminders.status.open": "Open",
    "app.reminders.status.scheduled": "Scheduled",
    "app.reminders.title": "Reminder Center",
    "app.settings.apiKey": "API key",
    "app.settings.apiKeyAction.clear": "Clear current API key",
    "app.settings.apiKeyAction.undoClear": "Keep current API key",
    "app.settings.apiKeyHint.keep": "A current API key is already available.",
    "app.settings.apiKeyHint.missing": "No API key is available yet.",
    "app.settings.apiKeyHint.clearing": "The current API key will be removed on save.",
    "app.settings.apiKeyPlaceholder.clearing": "Save to remove the current API key",
    "app.settings.apiKeyPlaceholder.enter": "Enter a new API key",
    "app.settings.apiKeyPlaceholder.keep": "Leave blank to keep the current API key",
    "app.settings.baseUrl": "Base URL",
    "app.settings.cache.clear": "Clear cache",
    "app.settings.cache.description": "Clear local helper caches.",
    "app.settings.cache.eyebrow": "Cache center",
    "app.settings.cache.groupCount": `${params.count || 0} groups`,
    "app.settings.cache.safeNote": "Workspace data is kept.",
    "app.settings.cache.title": "Local cache",
    "app.settings.eyebrow": "Gateway",
    "app.settings.model": "Model",
    "app.settings.page.eyebrow": "System settings",
    "app.settings.page.title": "Settings",
    "app.settings.providerName": "Provider name",
    "app.settings.save": "Save settings",
    "app.settings.systemPrompt": "System prompt",
    "app.settings.title": "Provider",
    "app.theme.dark": "Dark mode",
    "app.theme.light": "Light mode",
    "app.view.reminders.badge.due": "Due",
    "app.view.reminders.badge.open": "Open",
    "app.view.settings.badge.gateway": "Gateway",
    "app.view.settings.badge.state": "State",
  };
  return copy[key] || params.date || key;
}

function createShellProps(currentView, openView, legacyContent) {
  const allNavigationItems = [
    { id: "today", label: "Today", meta: "Daily", badge: "1" },
    { id: "agent", label: "Agent", meta: "Chat", badge: "1" },
    { id: "knowledge", label: "Knowledge", meta: "Notes", badge: "1" },
    { id: "weather", label: "Weather", meta: "Weather", badge: "1" },
    { id: "reminders", label: "Reminders", meta: "Tasks", badge: "1" },
    { id: "settings", label: "Settings", meta: "Control", badge: "Saved" },
  ];

  return {
    activeNote: null,
    activeNoteId: 0,
    activeSession: { session: { title: "Primary Session" }, messages: [], activity: [] },
    activeSessionRecommendedSkills: [],
    activeSessionSkillIds: [],
    activeSessionSkills: [],
    activeWeatherCity: { id: "shanghai", name: "Shanghai", conditionKey: "app.weather.condition.clear" },
    allNavigationItems,
    busy: "",
    capabilities: [],
    clockNow: now,
    completedTodayItems: [],
    continueSessionItems: [],
    currentView,
    draft: "",
    dueReminderCount: 0,
    error: "",
    filteredNotes: [],
    formatShortClock: () => "19:30",
    formatTime: () => "19:30",
    cacheCards: [
      {
        id: "media",
        title: "Media cache",
        summary: "2 entries",
        countLabel: "2 cached",
        description: "Clear media cache.",
        buttonLabel: "Clear cache",
        onClear: vi.fn(),
      },
    ],
    handleClearApiKey: vi.fn(),
    handleCreateNote: vi.fn(),
    handleCreateReminder: vi.fn(),
    handleDeleteNote: vi.fn(),
    handleDeleteReminder: vi.fn(),
    handleOpenNote: vi.fn(),
    handleOpenLinkedNote: vi.fn(),
    handleOpenSession: vi.fn(),
    handleRunAgent: vi.fn((event) => event.preventDefault()),
    handleSaveNote: vi.fn(),
    handleSaveReminder: vi.fn(),
    handleSaveSettings: vi.fn((event) => event.preventDefault()),
    handleSelectReminder: vi.fn(),
    handleToggleSkillMounted: vi.fn(),
    handleToggleTodayReminderStatus: vi.fn(),
    hasUnsavedNote: false,
    hasUnsavedReminder: false,
    hasUnsavedSettings: false,
    lang: "en-US",
    legacyContent,
    loading: false,
    mobileDockItems: allNavigationItems.filter((item) =>
      ["today", "agent", "knowledge", "weather"].includes(item.id)
    ),
    noteDraft: { id: 0, title: "", body: "", tagsText: "" },
    noteList: [],
    noteSearch: "",
    notice: "",
    onAddWeatherCity: vi.fn(),
    onRemoveWeatherCity: vi.fn(),
    onWeatherRefresh: vi.fn(),
    openReminderCount: 0,
    openView,
    PanelIcon: Icon,
    providerConfigured: true,
    providerSecurityMessage: "",
    providerSecurityStatus: "trusted",
    recentCaptureItems: [],
    reminderDraft: { id: 0, title: "", detail: "", dueAt: "", severity: "medium", status: "scheduled", linkedNoteId: "" },
    reminderSearch: "",
    reminders: [],
    ruleActionRecommendations: [],
    ruleEffectivenessSignals: [],
    selectedReminderId: 0,
    selectedWeatherCityId: "shanghai",
    sessionList: [],
    setDraft: vi.fn(),
    setLang: vi.fn(),
    setReminderDraft: vi.fn(),
    setReminderSearch: vi.fn(),
    setNoteDraft: vi.fn(),
    setNoteSearch: vi.fn(),
    setSelectedWeatherCityId: vi.fn(),
    settingsForm: {
      providerName: "OpenAI Compatible",
      model: "gpt-4.1-mini",
      baseUrl: "https://api.example.com/v1",
      apiKey: "",
      hasApiKey: false,
      clearApiKey: false,
      systemPrompt: "Be concise.",
    },
    setSettingsForm: vi.fn(),
    setTheme: vi.fn(),
    t,
    theme: "dark",
    todayReminderItems: [],
    todayReviewSignals: [],
    viewMeta: {
      today: { title: "Today" },
      agent: { title: "Agent" },
      knowledge: { title: "Knowledge" },
      weather: { title: "Weather" },
      settings: { title: "Settings" },
      reminders: { title: "Reminders" },
    },
    weatherCities: [],
    weatherError: "",
    weatherLocations: [],
    weatherStatus: "ready",
    weatherUpdatedAt: now,
  };
}

function toShellBags(props) {
  return {
    shell: {
      busy: props.busy,
      capabilities: props.capabilities,
      clockNow: props.clockNow,
      error: props.error,
      formatShortClock: props.formatShortClock,
      lang: props.lang,
      loading: props.loading,
      mediaSlot: props.mediaSlot,
      notice: props.notice,
      PanelIcon: props.PanelIcon,
      providerConfigured: props.providerConfigured,
      setLang: props.setLang,
      setTheme: props.setTheme,
      t: props.t,
      theme: props.theme,
    },
    navigation: {
      allItems: props.allNavigationItems,
      currentView: props.currentView,
      dockItems: props.mobileDockItems,
      openView: props.openView,
      viewMeta: props.viewMeta,
    },
    today: {
      activeSession: props.activeSession,
      completedTodayItems: props.completedTodayItems,
      continueSessionItems: props.continueSessionItems,
      dueReminderCount: props.dueReminderCount,
      formatTime: props.formatTime,
      handleSelectReminder: props.handleSelectReminder,
      handleToggleTodayReminderStatus: props.handleToggleTodayReminderStatus,
      openReminderCount: props.openReminderCount,
      openView: props.openView,
      recentCaptureItems: props.recentCaptureItems,
      ruleActionRecommendations: props.ruleActionRecommendations,
      ruleEffectivenessSignals: props.ruleEffectivenessSignals,
      todayReminderItems: props.todayReminderItems,
      todayReviewSignals: props.todayReviewSignals,
    },
    agent: {
      activeSession: props.activeSession,
      activeSessionRecommendedSkills: props.activeSessionRecommendedSkills,
      activeSessionSkillIds: props.activeSessionSkillIds,
      activeSessionSkills: props.activeSessionSkills,
      draft: props.draft,
      formatTime: props.formatTime,
      handleOpenSession: props.handleOpenSession,
      handleRunAgent: props.handleRunAgent,
      handleToggleSkillMounted: props.handleToggleSkillMounted,
      sessionList: props.sessionList,
      setDraft: props.setDraft,
    },
    knowledge: {
      activeNote: props.activeNote,
      activeNoteId: props.activeNoteId,
      filteredNotes: props.filteredNotes,
      formatTime: props.formatTime,
      handleCreateNote: props.handleCreateNote,
      handleDeleteNote: props.handleDeleteNote,
      handleOpenNote: props.handleOpenNote,
      handleSaveNote: props.handleSaveNote,
      hasUnsavedNote: props.hasUnsavedNote,
      noteDraft: props.noteDraft,
      noteSearch: props.noteSearch,
      setNoteDraft: props.setNoteDraft,
      setNoteSearch: props.setNoteSearch,
    },
    weather: {
      activeWeatherCity: props.activeWeatherCity,
      onAddWeatherCity: props.onAddWeatherCity,
      onRefresh: props.onWeatherRefresh,
      onRemoveWeatherCity: props.onRemoveWeatherCity,
      selectedWeatherCityId: props.selectedWeatherCityId,
      setSelectedWeatherCityId: props.setSelectedWeatherCityId,
      weatherCities: props.weatherCities,
      weatherError: props.weatherError,
      weatherLocations: props.weatherLocations,
      weatherStatus: props.weatherStatus,
      weatherUpdatedAt: props.weatherUpdatedAt,
    },
    settings: {
      cacheCards: props.cacheCards,
      handleClearApiKey: props.handleClearApiKey,
      handleSaveSettings: props.handleSaveSettings,
      hasUnsavedSettings: props.hasUnsavedSettings,
      providerSecurityMessage: props.providerSecurityMessage,
      providerSecurityStatus: props.providerSecurityStatus,
      settingsForm: props.settingsForm,
      setSettingsForm: props.setSettingsForm,
    },
    reminders: {
      handleCreateReminder: props.handleCreateReminder,
      handleDeleteReminder: props.handleDeleteReminder,
      handleOpenLinkedNote: props.handleOpenLinkedNote,
      handleSaveReminder: props.handleSaveReminder,
      handleSelectReminder: props.handleSelectReminder,
      handleToggleTodayReminderStatus: props.handleToggleTodayReminderStatus,
      hasUnsavedReminder: props.hasUnsavedReminder,
      noteList: props.noteList,
      reminderDraft: props.reminderDraft,
      reminderSearch: props.reminderSearch,
      reminders: props.reminders,
      selectedReminderId: props.selectedReminderId,
      setReminderDraft: props.setReminderDraft,
      setReminderSearch: props.setReminderSearch,
    },
    legacy: { content: props.legacyContent },
  };
}

function ShellHarness() {
  const [currentView, setCurrentView] = useState("today");
  const props = createShellProps(currentView, setCurrentView, <div>Legacy {currentView} page</div>);
  return <MobileAppShell {...toShellBags(props)} />;
}

test("mobile shell renders four primary dock tabs plus More and keeps language/theme out of the top bar", async () => {
  const user = userEvent.setup();
  render(<ShellHarness />);

  const dock = screen.getByTestId("mobile-dock");
  expect(within(dock).getAllByRole("button")).toHaveLength(5);
  expect(within(dock).getByRole("button", { name: "Today" })).toBeInTheDocument();
  expect(within(dock).getByRole("button", { name: "Agent" })).toBeInTheDocument();
  expect(within(dock).getByRole("button", { name: "Knowledge" })).toBeInTheDocument();
  expect(within(dock).getByRole("button", { name: "Weather" })).toBeInTheDocument();

  const topbar = screen.getByTestId("mobile-topbar");
  expect(within(topbar).queryByText("Language")).not.toBeInTheDocument();
  expect(within(topbar).queryByText("Theme")).not.toBeInTheDocument();

  await user.click(within(dock).getByRole("button", { name: "More" }));
  await user.click(screen.getByRole("button", { name: /Settings/i }));
  expect(screen.queryByText("Legacy settings page")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();

  await user.click(within(dock).getByRole("button", { name: "More" }));
  await user.click(screen.getByRole("button", { name: /Reminders/i }));
  expect(screen.queryByText("Legacy reminders page")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Reminder Center" })).toBeInTheDocument();
});

test("mobile Agent composer submits through handleRunAgent", async () => {
  const user = userEvent.setup();
  const handleRunAgent = vi.fn((event) => event.preventDefault());
  const DraftHarness = () => {
    const [draft, setDraft] = useState("");
    return (
      <MobileAgentView
        activeSession={{ session: { title: "Primary Session" }, messages: [], activity: [] }}
        activeSessionRecommendedSkills={[]}
        activeSessionSkillIds={[]}
        activeSessionSkills={[]}
        busy=""
        draft={draft}
        formatTime={() => "19:30"}
        handleOpenSession={vi.fn()}
        handleRunAgent={handleRunAgent}
        handleToggleSkillMounted={vi.fn()}
        lang="en-US"
        loading={false}
        providerConfigured
        sessionList={[]}
        setDraft={setDraft}
      />
    );
  };

  render(<DraftHarness />);

  await user.type(screen.getByLabelText("Send"), "Continue the plan");
  await user.click(screen.getByRole("button", { name: "Send" }));

  expect(handleRunAgent).toHaveBeenCalledTimes(1);
});

test("mobile Knowledge editor saves through handleSaveNote", async () => {
  const user = userEvent.setup();
  const handleSaveNote = vi.fn();

  render(
    <MobileKnowledgeView
      activeNote={{ id: 1, title: "Runbook", body: "Body", tags: ["ops"] }}
      activeNoteId={1}
      busy=""
      filteredNotes={[{ id: 1, icon: "*", title: "Runbook", summary: "Checklist", tags: ["ops"], updatedAt: now }]}
      formatTime={() => "19:30"}
      handleCreateNote={vi.fn()}
      handleDeleteNote={vi.fn()}
      handleOpenNote={vi.fn()}
      handleSaveNote={handleSaveNote}
      lang="en-US"
      noteDraft={{ id: 1, title: "Runbook", body: "Body", tagsText: "ops" }}
      noteSearch=""
      setNoteDraft={vi.fn()}
      setNoteSearch={vi.fn()}
    />
  );

  await user.click(screen.getByRole("button", { name: /Runbook/i }));
  await user.click(screen.getByRole("button", { name: "Save" }));

  expect(handleSaveNote).toHaveBeenCalledTimes(1);
});

test("mobile Settings Provider sheet saves edited endpoint fields", async () => {
  const user = userEvent.setup();
  const handleSaveSettings = vi.fn((event) => event.preventDefault());

  function Harness() {
    const [form, setForm] = useState({
      providerName: "OpenAI Compatible",
      model: "old-model",
      baseUrl: "https://old.example/v1",
      apiKey: "",
      hasApiKey: false,
      clearApiKey: false,
      systemPrompt: "Be concise.",
    });

    return (
      <MobileSettingsView
        busy=""
        cacheCards={[]}
        handleClearApiKey={vi.fn()}
        handleSaveSettings={handleSaveSettings}
        hasUnsavedSettings
        lang="en-US"
        providerConfigured
        providerSecurityMessage=""
        providerSecurityStatus="trusted"
        settingsForm={form}
        setSettingsForm={setForm}
        t={t}
      />
    );
  }

  render(<Harness />);

  await user.click(screen.getByRole("button", { name: "Provider" }));
  await user.clear(screen.getByLabelText("Model"));
  await user.type(screen.getByLabelText("Model"), "new-model");
  await user.clear(screen.getByLabelText("Base URL"));
  await user.type(screen.getByLabelText("Base URL"), "https://new.example/v1");
  await user.click(screen.getByRole("button", { name: "Save settings" }));

  expect(handleSaveSettings).toHaveBeenCalledTimes(1);
});

test("mobile Settings API key clear and cache confirmation reuse existing handlers", async () => {
  const user = userEvent.setup();
  const handleClearApiKey = vi.fn();
  const handleClearCache = vi.fn();

  render(
    <MobileSettingsView
      busy=""
      cacheCards={[
        {
          id: "media",
          title: "Media cache",
          summary: "2 entries",
          countLabel: "2 cached",
          description: "Clear media cache.",
          buttonLabel: "Clear cache",
          onClear: handleClearCache,
        },
      ]}
      handleClearApiKey={handleClearApiKey}
      handleSaveSettings={vi.fn((event) => event.preventDefault())}
      hasUnsavedSettings
      lang="en-US"
      providerConfigured
      providerSecurityMessage=""
      providerSecurityStatus="trusted"
      settingsForm={{
        providerName: "OpenAI Compatible",
        model: "gpt-4.1-mini",
        baseUrl: "https://api.example.com/v1",
        apiKey: "",
        hasApiKey: true,
        clearApiKey: false,
        systemPrompt: "Be concise.",
      }}
      setSettingsForm={vi.fn()}
      t={t}
    />
  );

  await user.click(screen.getByRole("button", { name: "Provider" }));
  await user.click(screen.getByRole("button", { name: "Clear current API key" }));
  expect(handleClearApiKey).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await user.click(screen.getByRole("button", { name: /Media cache/i }));
  await user.click(screen.getByRole("button", { name: "Clear cache" }));
  expect(handleClearCache).toHaveBeenCalledTimes(1);
});

test("mobile Reminders opens editor and routes save delete linked note and quick status actions", async () => {
  const user = userEvent.setup();
  const handleDeleteReminder = vi.fn();
  const handleOpenLinkedNote = vi.fn();
  const handleSaveReminder = vi.fn();
  const handleToggleTodayReminderStatus = vi.fn();
  const reminder = {
    id: 7,
    title: "Billing",
    preview: "Pay invoice",
    dueAt: now,
    severity: "high",
    status: "scheduled",
    linkedNoteId: 2,
    updatedAt: now,
  };

  render(
    <MobileRemindersView
      busy=""
      clockNow={now}
      handleCreateReminder={vi.fn()}
      handleDeleteReminder={handleDeleteReminder}
      handleOpenLinkedNote={handleOpenLinkedNote}
      handleSaveReminder={handleSaveReminder}
      handleSelectReminder={vi.fn()}
      handleToggleTodayReminderStatus={handleToggleTodayReminderStatus}
      hasUnsavedReminder
      lang="en-US"
      loading={false}
      noteList={[{ id: 2, title: "Finance note" }]}
      reminderDraft={{
        id: 7,
        title: "Billing",
        detail: "Use the corporate card.",
        dueAt: "2024-03-09T12:00",
        severity: "high",
        status: "scheduled",
        linkedNoteId: "2",
      }}
      reminderSearch=""
      reminders={[reminder]}
      selectedReminderId={7}
      setReminderDraft={vi.fn()}
      setReminderSearch={vi.fn()}
      t={t}
    />
  );

  await user.click(screen.getByRole("button", { name: "Open Billing" }));
  expect(handleToggleTodayReminderStatus).toHaveBeenCalledWith(reminder);

  await user.click(screen.getByRole("button", { name: /Pay invoice/i }));
  await user.click(screen.getByRole("button", { name: "Save reminder" }));
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Open note" }));

  expect(handleSaveReminder).toHaveBeenCalledTimes(1);
  expect(handleDeleteReminder).toHaveBeenCalledTimes(1);
  expect(handleOpenLinkedNote).toHaveBeenCalledWith(2);
});
