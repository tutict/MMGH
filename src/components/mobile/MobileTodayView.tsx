import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
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
  todayReminderItems = [],
}: Record<string, any>) {
  const sessionTitle = activeSession?.session?.title || "";
  const dueCount = Number(dueReminderCount) || 0;
  const openCount = Number(openReminderCount) || 0;
  const sessions = continueSessionItems.slice(0, 3);
  const doneItems = completedTodayItems.slice(0, 5);
  const hasAgenda = todayReminderItems.length > 0 || sessions.length > 0 || doneItems.length > 0;
  const primaryOpensReminders = dueCount > 0 || openCount > 0;

  return (
    <MobilePage view="today">
      <section className="mobile-today__hero">
        <p className="mobile-today__greeting">{getMobileDaypart(clockNow, lang)}</p>
        <p className="mobile-today__meta">
          {sessionTitle || mobileText(lang, "emptyTodayHint")}
        </p>
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
            <span className="mobile-section__count">{todayReminderItems.length}</span>
          </MobileSectionHead>
          <MobileList>
            {todayReminderItems.map((item) => (
              <MobileRow key={item.id} variant="reminder">
                <MobileCheckButton
                  type="button"
                  checked={item.status === "done"}
                  onClick={() => handleToggleTodayReminderStatus(item)}
                  disabled={busy !== "" || loading}
                  aria-label={item.status === "done" ? mobileText(lang, "completed") : mobileText(lang, "due")}
                >
                  <span aria-hidden="true">
                    <CheckRoundedIcon fontSize="inherit" />
                  </span>
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
                  <span className="mobile-row__meta">
                    {item.dueAt ? formatTime(item.dueAt, lang) : mobileText(lang, "due")}
                  </span>
                </MobileButton>
              </MobileRow>
            ))}
          </MobileList>
        </MobileSection>
      ) : null}

      {sessions.length > 0 ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{mobileText(lang, "continueAgent")}</h2>
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

      {doneItems.length > 0 ? (
        <details className="mobile-today__done">
          <summary>
            {mobileText(lang, "doneToday")}
            <span>{doneItems.length}</span>
          </summary>
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
        </details>
      ) : null}
    </MobilePage>
  );
}

export default MobileTodayView;
