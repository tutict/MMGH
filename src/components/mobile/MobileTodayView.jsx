import React from "react";
import { getMobileDaypart, mobileText } from "./mobileText";

function MobileTodayView({
  activeSession,
  busy,
  clockNow,
  completedTodayItems = [],
  continueSessionItems = [],
  dueReminderCount,
  formatShortClock,
  formatTime,
  handleSelectReminder,
  handleToggleTodayReminderStatus,
  lang,
  loading,
  openReminderCount,
  openView,
  recentCaptureItems = [],
  ruleActionRecommendations = [],
  ruleEffectivenessSignals = [],
  todayReminderItems = [],
  todayReviewSignals = [],
}) {
  const summaryItems = [
    { label: mobileText(lang, "openTasks"), value: openReminderCount },
    { label: mobileText(lang, "due"), value: dueReminderCount },
    { label: mobileText(lang, "today"), value: formatShortClock(clockNow, lang) },
  ];
  const signals = [...ruleEffectivenessSignals, ...todayReviewSignals].slice(0, 4);
  const captures = recentCaptureItems.slice(0, 3);
  const sessions = continueSessionItems.slice(0, 3);

  return (
    <div className="mobile-page mobile-page--today">
      <section className="mobile-section mobile-section--flush">
        <div className="mobile-section__head">
          <div>
            <span className="mobile-eyebrow">{getMobileDaypart(clockNow, lang)}</span>
            <h1>{activeSession?.session?.title || mobileText(lang, "today")}</h1>
          </div>
        </div>
        <div className="mobile-summary-grid">
          {summaryItems.map((item) => (
            <div key={item.label} className="mobile-summary-cell">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="mobile-action-row">
          <button type="button" className="mobile-primary-action" onClick={() => openView("agent")}>
            {mobileText(lang, "continueAgent")}
          </button>
          <button type="button" className="mobile-secondary-action" onClick={() => openView("reminders")}>
            {mobileText(lang, "openReminders")}
          </button>
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <h2>{mobileText(lang, "today")}</h2>
          <span>{todayReminderItems.length}</span>
        </div>
        <div className="mobile-list">
          {todayReminderItems.length === 0 ? (
            <p className="mobile-empty">{mobileText(lang, "emptyList")}</p>
          ) : (
            todayReminderItems.map((item) => (
              <div key={item.id} className="mobile-row mobile-row--interactive">
                <button
                  type="button"
                  className={`mobile-check ${item.status === "done" ? "is-done" : ""}`}
                  onClick={() => handleToggleTodayReminderStatus(item)}
                  disabled={busy !== "" || loading}
                  aria-label={item.status === "done" ? mobileText(lang, "completed") : mobileText(lang, "due")}
                >
                  <span aria-hidden="true">{item.status === "done" ? "✓" : ""}</span>
                </button>
                <button
                  type="button"
                  className="mobile-row__body"
                  onClick={() => {
                    void handleSelectReminder(item.id);
                    openView("reminders");
                  }}
                >
                  <strong>{item.title}</strong>
                  <span>{item.preview || item.detail || formatTime(item.dueAt, lang)}</span>
                </button>
                <time>{item.dueAt ? formatTime(item.dueAt, lang) : ""}</time>
              </div>
            ))
          )}
        </div>
      </section>

      {sessions.length > 0 ? (
        <section className="mobile-section">
          <div className="mobile-section__head mobile-section__head--line">
            <h2>{mobileText(lang, "sessionLibrary")}</h2>
          </div>
          <div className="mobile-list">
            {sessions.map((session) => (
              <button key={session.id} type="button" className="mobile-row" onClick={() => openView("agent")}>
                <span className="mobile-row__body">
                  <strong>{session.title}</strong>
                  <span>{session.lastMessagePreview}</span>
                </span>
                <time>{session.updatedAt ? formatTime(session.updatedAt, lang) : ""}</time>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <h2>{mobileText(lang, "flowSignals")}</h2>
        </div>
        <div className="mobile-list">
          {[...signals, ...ruleActionRecommendations].slice(0, 5).map((signal, index) => (
            <div key={`${signal.id || signal.title || index}`} className="mobile-row">
              <span className="mobile-row__body">
                <strong>{signal.title || signal.label || signal.name}</strong>
                <span>{signal.description || signal.summary || signal.detail || signal.reason}</span>
              </span>
            </div>
          ))}
          {signals.length === 0 && ruleActionRecommendations.length === 0 ? (
            <p className="mobile-empty">{mobileText(lang, "emptyList")}</p>
          ) : null}
        </div>
      </section>

      {completedTodayItems.length > 0 || captures.length > 0 ? (
        <section className="mobile-section">
          <div className="mobile-section__head mobile-section__head--line">
            <h2>{mobileText(lang, "doneToday")}</h2>
          </div>
          <div className="mobile-list">
            {[...completedTodayItems.slice(0, 3), ...captures].slice(0, 5).map((item, index) => (
              <div key={`${item.id || item.title || index}`} className="mobile-row">
                <span className="mobile-row__body">
                  <strong>{item.title || item.label}</strong>
                  <span>{item.preview || item.summary || item.detail || ""}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default MobileTodayView;
