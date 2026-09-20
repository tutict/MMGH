import React from "react";
import { getMobileDaypart, mobileText } from "./mobileText";
import {
  MobileButton,
  MobileCheckButton,
  MobileList,
  MobilePage,
  MobileRow,
  MobileRowBody,
  MobileRowButton,
  MobileSection,
  MobileSectionHead,
} from "../ui";

function MobileTodayView({
  activeSession,
  busy,
  clockNow,
  completedTodayItems = [],
  continueSessionItems = [],
  dueReminderCount,
  formatTime,
  handleSelectReminder,
  handleToggleTodayReminderStatus,
  lang,
  loading,
  openReminderCount,
  openView,
  ruleActionRecommendations = [],
  ruleEffectivenessSignals = [],
  todayReminderItems = [],
  todayReviewSignals = [],
}: Record<string, any>) {
  const sessionTitle = activeSession?.session?.title || "";
  const dueCount = Number(dueReminderCount) || 0;
  const openCount = Number(openReminderCount) || 0;
  const sessions = continueSessionItems.slice(0, 2);
  const doneItems = completedTodayItems.slice(0, 3);
  const signalCards = [
    ...[...ruleEffectivenessSignals, ...todayReviewSignals]
      .filter((item) => String(item?.value ?? "") !== "" && String(item.value) !== "0")
      .filter((item) => item.id !== "notes")
      .map((item) => ({
        id: item.id,
        kind: "metric",
        label: item.label || item.title,
        value: item.value,
      })),
    ...ruleActionRecommendations
      .filter((item) => item.actionTitle || item.title)
      .map((item, index) => ({
        id: item.id || item.actionType || `action-${index}`,
        kind: "action",
        label: item.actionTitle || item.title,
        value: item.reason || item.detail || item.summary || "",
      })),
  ].slice(0, 4);
  const hasAgenda = todayReminderItems.length > 0 || sessions.length > 0 || signalCards.length > 0 || doneItems.length > 0;
  const primaryOpensReminders = dueCount > 0 || openCount > 0;

  return (
    <MobilePage view="today">
      <section className="mobile-today-hero">
        <h1>{getMobileDaypart(clockNow, lang)}</h1>
        {sessionTitle ? <p>{sessionTitle}</p> : null}
        <MobileButton
          variant="contained"
          mobileAction="primary"
          onClick={() => openView(primaryOpensReminders ? "reminders" : "agent")}
        >
          {primaryOpensReminders ? mobileText(lang, "openReminders") : mobileText(lang, "continueAgent")}
        </MobileButton>
      </section>

      {!hasAgenda ? (
        <section className="mobile-empty-hero mobile-empty-hero--compact">
          <strong>{mobileText(lang, "emptyToday")}</strong>
          <p>{mobileText(lang, "emptyTodayHint")}</p>
        </section>
      ) : null}

      {todayReminderItems.length > 0 ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{mobileText(lang, "inbox")}</h2>
            <span>{todayReminderItems.length}</span>
          </MobileSectionHead>
          <MobileList>
            {todayReminderItems.map((item) => (
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
            ))}
          </MobileList>
        </MobileSection>
      ) : null}

      {sessions.length > 0 ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{mobileText(lang, sessions.length > 1 ? "sessionLibrary" : "currentSession")}</h2>
          </MobileSectionHead>
          <MobileList>
            {sessions.map((session) => (
              <MobileRowButton key={session.id} onClick={() => openView("agent")}>
                <MobileRowBody>
                  <strong>{session.title}</strong>
                  <span>{session.lastMessagePreview}</span>
                </MobileRowBody>
              </MobileRowButton>
            ))}
          </MobileList>
        </MobileSection>
      ) : null}

      {signalCards.length > 0 ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{mobileText(lang, "flowSignals")}</h2>
          </MobileSectionHead>
          <div className="mobile-signal-grid">
            {signalCards.map((card) => (
              <article
                key={card.id}
                className={`mobile-signal-card${card.kind === "action" ? " mobile-signal-card--action" : ""}`}
              >
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>
        </MobileSection>
      ) : null}

      {doneItems.length > 0 ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{mobileText(lang, "doneToday")}</h2>
          </MobileSectionHead>
          <MobileList>
            {doneItems.map((item, index) => (
              <MobileRowButton
                key={`${item.id || item.title || index}`}
                onClick={() => openView(item.kind === "reminder" ? "reminders" : "knowledge")}
              >
                <MobileRowBody>
                  <strong>{item.title || item.label}</strong>
                </MobileRowBody>
              </MobileRowButton>
            ))}
          </MobileList>
        </MobileSection>
      ) : null}
    </MobilePage>
  );
}

export default MobileTodayView;


