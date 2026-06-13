import React, { useMemo, useState } from "react";
import MobileAgentView from "./MobileAgentView";
import MobileKnowledgeView from "./MobileKnowledgeView";
import MobileRemindersView from "./MobileRemindersView";
import MobileSettingsView from "./MobileSettingsView";
import MobileSheet from "./MobileSheet";
import MobileTodayView from "./MobileTodayView";
import MobileWeatherView from "./MobileWeatherView";
import { getMobileNavIconType, mobileText } from "./mobileText";

const PRIMARY_VIEW_IDS = new Set(["today", "agent", "knowledge", "weather"]);

function MobileAppShell({
  activeNote,
  activeNoteId,
  activeSession,
  activeSessionRecommendedSkills,
  activeSessionSkillIds,
  activeSessionSkills,
  activeWeatherCity,
  allNavigationItems = [],
  busy,
  cacheCards,
  capabilities = [],
  clockNow,
  completedTodayItems,
  continueSessionItems,
  currentView,
  draft,
  dueReminderCount,
  error,
  filteredNotes,
  formatShortClock,
  formatTime,
  handleCreateNote,
  handleCreateReminder,
  handleDeleteNote,
  handleDeleteReminder,
  handleOpenNote,
  handleOpenLinkedNote,
  handleOpenSession,
  handleRunAgent,
  handleSaveNote,
  handleSaveReminder,
  handleSaveSettings,
  handleSelectReminder,
  handleClearApiKey,
  handleToggleSkillMounted,
  handleToggleTodayReminderStatus,
  hasUnsavedNote,
  hasUnsavedReminder,
  hasUnsavedSettings,
  lang,
  legacyContent,
  loading,
  mediaSlot,
  mobileDockItems = [],
  noteList,
  noteDraft,
  noteSearch,
  notice,
  onAddWeatherCity,
  onRemoveWeatherCity,
  onWeatherRefresh,
  openReminderCount,
  openView,
  PanelIcon,
  providerConfigured,
  providerSecurityMessage,
  providerSecurityStatus,
  recentCaptureItems,
  reminderDraft,
  reminderSearch,
  reminders,
  ruleActionRecommendations,
  ruleEffectivenessSignals,
  selectedWeatherCityId,
  selectedReminderId,
  sessionList,
  setDraft,
  setLang,
  setReminderDraft,
  setReminderSearch,
  setNoteDraft,
  setNoteSearch,
  setSelectedWeatherCityId,
  settingsForm,
  setSettingsForm,
  setTheme,
  t,
  theme,
  todayReminderItems,
  todayReviewSignals,
  viewMeta,
  weatherCities,
  weatherError,
  weatherLocations,
  weatherStatus,
  weatherUpdatedAt,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const currentMeta = viewMeta[currentView] || viewMeta.today || {};
  const moreItems = useMemo(
    () => allNavigationItems.filter((item) => !PRIMARY_VIEW_IDS.has(item.id)),
    [allNavigationItems]
  );
  const renderIcon = (viewId) => <PanelIcon type={getMobileNavIconType(viewId)} />;

  return (
    <div className={`agent-app mobile-app theme-${theme} view-${currentView}`}>
      <header className="mobile-topbar" data-testid="mobile-topbar">
        <div className="mobile-topbar__title">
          <strong>MMGH · {currentMeta.title || currentView}</strong>
        </div>
        <time>{formatShortClock(clockNow, lang)}</time>
        <button
          type="button"
          className="mobile-icon-button"
          onClick={() => setMoreOpen(true)}
          aria-label={mobileText(lang, "more")}
        >
          <span aria-hidden="true">{renderIcon("more")}</span>
        </button>
        <button
          type="button"
          className="mobile-icon-button"
          onClick={() => setInspectorOpen(true)}
          aria-label={mobileText(lang, "inspector")}
        >
          <span aria-hidden="true"><PanelIcon type="trace" /></span>
        </button>
      </header>

      <main className="mobile-main">
        {notice ? <div className="mobile-banner mobile-banner--notice">{notice}</div> : null}
        {error ? <div className="mobile-banner mobile-banner--error">{error}</div> : null}
        {currentView === "today" ? (
          <MobileTodayView
            activeSession={activeSession}
            busy={busy}
            clockNow={clockNow}
            completedTodayItems={completedTodayItems}
            continueSessionItems={continueSessionItems}
            dueReminderCount={dueReminderCount}
            formatShortClock={formatShortClock}
            formatTime={formatTime}
            handleSelectReminder={handleSelectReminder}
            handleToggleTodayReminderStatus={handleToggleTodayReminderStatus}
            lang={lang}
            loading={loading}
            openReminderCount={openReminderCount}
            openView={openView}
            recentCaptureItems={recentCaptureItems}
            ruleActionRecommendations={ruleActionRecommendations}
            ruleEffectivenessSignals={ruleEffectivenessSignals}
            todayReminderItems={todayReminderItems}
            todayReviewSignals={todayReviewSignals}
          />
        ) : currentView === "agent" ? (
          <MobileAgentView
            activeSession={activeSession}
            activeSessionRecommendedSkills={activeSessionRecommendedSkills}
            activeSessionSkillIds={activeSessionSkillIds}
            activeSessionSkills={activeSessionSkills}
            busy={busy}
            draft={draft}
            formatTime={formatTime}
            handleOpenSession={handleOpenSession}
            handleRunAgent={handleRunAgent}
            handleToggleSkillMounted={handleToggleSkillMounted}
            lang={lang}
            loading={loading}
            providerConfigured={providerConfigured}
            sessionList={sessionList}
            setDraft={setDraft}
          />
        ) : currentView === "knowledge" ? (
          <MobileKnowledgeView
            activeNote={activeNote}
            activeNoteId={activeNoteId}
            busy={busy}
            filteredNotes={filteredNotes}
            formatTime={formatTime}
            handleCreateNote={handleCreateNote}
            handleDeleteNote={handleDeleteNote}
            handleOpenNote={handleOpenNote}
            handleSaveNote={handleSaveNote}
            hasUnsavedNote={hasUnsavedNote}
            lang={lang}
            noteDraft={noteDraft}
            noteSearch={noteSearch}
            setNoteDraft={setNoteDraft}
            setNoteSearch={setNoteSearch}
          />
        ) : currentView === "weather" ? (
          <MobileWeatherView
            activeWeatherCity={activeWeatherCity}
            lang={lang}
            onAddWeatherCity={onAddWeatherCity}
            onRefresh={onWeatherRefresh}
            onRemoveWeatherCity={onRemoveWeatherCity}
            selectedWeatherCityId={selectedWeatherCityId}
            setSelectedWeatherCityId={setSelectedWeatherCityId}
            t={t}
            weatherCities={weatherCities}
            weatherError={weatherError}
            weatherLocations={weatherLocations}
            weatherStatus={weatherStatus}
            weatherUpdatedAt={weatherUpdatedAt}
          />
        ) : currentView === "settings" ? (
          <MobileSettingsView
            busy={busy}
            cacheCards={cacheCards}
            handleClearApiKey={handleClearApiKey}
            handleSaveSettings={handleSaveSettings}
            hasUnsavedSettings={hasUnsavedSettings}
            lang={lang}
            providerConfigured={providerConfigured}
            providerSecurityMessage={providerSecurityMessage}
            providerSecurityStatus={providerSecurityStatus}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            t={t}
          />
        ) : currentView === "reminders" ? (
          <MobileRemindersView
            busy={busy}
            clockNow={clockNow}
            handleCreateReminder={handleCreateReminder}
            handleDeleteReminder={handleDeleteReminder}
            handleOpenLinkedNote={handleOpenLinkedNote}
            handleSaveReminder={handleSaveReminder}
            handleSelectReminder={handleSelectReminder}
            handleToggleTodayReminderStatus={handleToggleTodayReminderStatus}
            hasUnsavedReminder={hasUnsavedReminder}
            lang={lang}
            loading={loading}
            noteList={noteList}
            reminderDraft={reminderDraft}
            reminderSearch={reminderSearch}
            reminders={reminders}
            selectedReminderId={selectedReminderId}
            setReminderDraft={setReminderDraft}
            setReminderSearch={setReminderSearch}
            t={t}
          />
        ) : (
          <section className="mobile-legacy-page" aria-label={mobileText(lang, "legacy")}>
            {legacyContent}
          </section>
        )}
      </main>

      <nav className="mobile-dock" data-testid="mobile-dock" aria-label="Mobile primary navigation">
        {mobileDockItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-dock__item ${currentView === item.id ? "is-active" : ""}`}
            onClick={() => openView(item.id)}
            aria-current={currentView === item.id ? "page" : undefined}
          >
            <span className="mobile-dock__icon" aria-hidden="true">
              {renderIcon(item.id)}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`mobile-dock__item ${moreOpen ? "is-active" : ""}`}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
        >
          <span className="mobile-dock__icon" aria-hidden="true">
            {renderIcon("more")}
          </span>
          <span>{mobileText(lang, "more")}</span>
        </button>
      </nav>

      <MobileSheet
        id="mobile-more-sheet"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "more")}
        eyebrow={mobileText(lang, "quickSettings")}
      >
        <div className="mobile-list">
          {moreItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="mobile-row"
              onClick={() => {
                openView(item.id);
                setMoreOpen(false);
              }}
            >
              <span className="mobile-row__icon" aria-hidden="true">{renderIcon(item.id)}</span>
              <span className="mobile-row__body">
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </span>
              <small>{item.badge}</small>
            </button>
          ))}
        </div>
        <div className="mobile-quick-settings">
          <div className="mobile-segmented" aria-label={mobileText(lang, "language")}>
            <button type="button" className={lang === "zh-CN" ? "is-active" : ""} onClick={() => setLang("zh-CN")}>
              中文
            </button>
            <button type="button" className={lang === "en-US" ? "is-active" : ""} onClick={() => setLang("en-US")}>
              EN
            </button>
          </div>
          <button
            type="button"
            className="mobile-secondary-action"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? t("app.theme.light") : t("app.theme.dark")}
          </button>
        </div>
      </MobileSheet>

      <MobileSheet
        id="mobile-inspector-sheet"
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "inspector")}
        eyebrow={currentMeta.title}
      >
        <div className="mobile-list">
          {capabilities.map((item) => (
            <div key={item.id} className="mobile-row">
              <span className="mobile-row__icon" aria-hidden="true">
                <PanelIcon type={item.id} />
              </span>
              <span className="mobile-row__body">
                <strong>{t(`app.capability.${item.id}.title`)}</strong>
                <span>{t(`app.capability.${item.id}.description`)}</span>
              </span>
              <small>{t(`app.status.${item.status}`)}</small>
            </div>
          ))}
          <div className="mobile-row">
            <span className="mobile-row__body">
              <strong>{mobileText(lang, "provider")}</strong>
              <span>{providerConfigured ? t("app.provider.configured") : t("app.provider.pending")}</span>
            </span>
          </div>
        </div>
      </MobileSheet>
      {mediaSlot}
    </div>
  );
}

export default MobileAppShell;
