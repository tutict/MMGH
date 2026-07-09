import React from "react";
import { getMobileDaypart, mobileText } from "./mobileText";
import { MobileActionRow, MobileButton, MobileCheckButton, MobileEmpty, MobileRowBody, MobileSummaryCell, MobileSummaryGrid } from "../ui";

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
}: Record<string, any>) {
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
        <MobileSummaryGrid>
          {summaryItems.map((item) => (
            <MobileSummaryCell key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </MobileSummaryCell>
          ))}
        </MobileSummaryGrid>
        <MobileActionRow>
          <MobileButton variant="contained" mobileAction="primary" onClick={() => openView("agent")}>
            {mobileText(lang, "continueAgent")}
          </MobileButton>
          <MobileButton variant="outlined" mobileAction="secondary" onClick={() => openView("reminders")}>
            {mobileText(lang, "openReminders")}
          </MobileButton>
        </MobileActionRow>
      </section>

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <h2>{mobileText(lang, "today")}</h2>
          <span>{todayReminderItems.length}</span>
        </div>
        <div className="mobile-list">
          {todayReminderItems.length === 0 ? (
            <MobileEmpty>{mobileText(lang, "emptyList")}</MobileEmpty>
          ) : (
            todayReminderItems.map((item) => (
              <div key={item.id} className="mobile-row mobile-row--interactive">
                <MobileCheckButton
                  type="button"
                  checked={item.status === "done"}
                  onClick={() => handleToggleTodayReminderStatus(item)}
                  disabled={busy !== "" || loading}
                  aria-label={item.status === "done" ? mobileText(lang, "completed") : mobileText(lang, "due")}
                  size="small"
                >
                  <span aria-hidden="true">{item.status === "done" ? "✓" : ""}</span>
                </MobileCheckButton>
                <MobileButton
                  variant="text"
                  className="mobile-row__body"
                  onClick={() => {
                    void handleSelectReminder(item.id);
                    openView("reminders");
                  }}
                >
                  <strong>{item.title}</strong>
                  <span>{item.preview || item.detail || formatTime(item.dueAt, lang)}</span>
                </MobileButton>
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
              <MobileButton key={session.id} variant="text" className="mobile-row" onClick={() => openView("agent")}>
                <MobileRowBody>
                  <strong>{session.title}</strong>
                  <span>{session.lastMessagePreview}</span>
                </MobileRowBody>
                <time>{session.updatedAt ? formatTime(session.updatedAt, lang) : ""}</time>
              </MobileButton>
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
              <MobileRowBody>
                <strong>{signal.title || signal.label || signal.name}</strong>
                <span>{signal.description || signal.summary || signal.detail || signal.reason}</span>
              </MobileRowBody>
            </div>
          ))}
          {signals.length === 0 && ruleActionRecommendations.length === 0 ? (
            <MobileEmpty>{mobileText(lang, "emptyList")}</MobileEmpty>
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
                <MobileRowBody>
                  <strong>{item.title || item.label}</strong>
                  <span>{item.preview || item.summary || item.detail || ""}</span>
                </MobileRowBody>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default MobileTodayView;


