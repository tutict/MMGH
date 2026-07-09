import React from "react";
import { getMobileDaypart, mobileText } from "./mobileText";
import { MobileActionRow, MobileButton, MobileCheckButton, MobileEmpty, MobileList, MobileRow, MobileRowBody, MobileSectionHead, MobileSummaryCell, MobileSummaryGrid } from "../ui";

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
        <MobileSectionHead>
          <div>
            <span className="mobile-eyebrow">{getMobileDaypart(clockNow, lang)}</span>
            <h1>{activeSession?.session?.title || mobileText(lang, "today")}</h1>
          </div>
        </MobileSectionHead>
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
        <MobileSectionHead line>
          <h2>{mobileText(lang, "today")}</h2>
          <span>{todayReminderItems.length}</span>
        </MobileSectionHead>
        <MobileList>
          {todayReminderItems.length === 0 ? (
            <MobileEmpty>{mobileText(lang, "emptyList")}</MobileEmpty>
          ) : (
            todayReminderItems.map((item) => (
              <MobileRow key={item.id} interactive>
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
              </MobileRow>
            ))
          )}
        </MobileList>
      </section>

      {sessions.length > 0 ? (
        <section className="mobile-section">
          <MobileSectionHead line>
            <h2>{mobileText(lang, "sessionLibrary")}</h2>
          </MobileSectionHead>
          <MobileList>
            {sessions.map((session) => (
              <MobileButton key={session.id} variant="text" className="mobile-row" onClick={() => openView("agent")}>
                <MobileRowBody>
                  <strong>{session.title}</strong>
                  <span>{session.lastMessagePreview}</span>
                </MobileRowBody>
                <time>{session.updatedAt ? formatTime(session.updatedAt, lang) : ""}</time>
              </MobileButton>
            ))}
          </MobileList>
        </section>
      ) : null}

      <section className="mobile-section">
        <MobileSectionHead line>
          <h2>{mobileText(lang, "flowSignals")}</h2>
        </MobileSectionHead>
        <MobileList>
          {[...signals, ...ruleActionRecommendations].slice(0, 5).map((signal, index) => (
            <MobileRow key={`${signal.id || signal.title || index}`}>
              <MobileRowBody>
                <strong>{signal.title || signal.label || signal.name}</strong>
                <span>{signal.description || signal.summary || signal.detail || signal.reason}</span>
              </MobileRowBody>
            </MobileRow>
          ))}
          {signals.length === 0 && ruleActionRecommendations.length === 0 ? (
            <MobileEmpty>{mobileText(lang, "emptyList")}</MobileEmpty>
          ) : null}
        </MobileList>
      </section>

      {completedTodayItems.length > 0 || captures.length > 0 ? (
        <section className="mobile-section">
          <MobileSectionHead line>
            <h2>{mobileText(lang, "doneToday")}</h2>
          </MobileSectionHead>
          <MobileList>
            {[...completedTodayItems.slice(0, 3), ...captures].slice(0, 5).map((item, index) => (
              <MobileRow key={`${item.id || item.title || index}`}>
                <MobileRowBody>
                  <strong>{item.title || item.label}</strong>
                  <span>{item.preview || item.summary || item.detail || ""}</span>
                </MobileRowBody>
              </MobileRow>
            ))}
          </MobileList>
        </section>
      ) : null}
    </div>
  );
}

export default MobileTodayView;


