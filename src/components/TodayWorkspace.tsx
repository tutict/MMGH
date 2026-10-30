import React from "react";
import { useI18n } from "../i18n";
import { AppButton, AppStatusChip } from "./ui";

function TodayWorkspace({
  activeSession,
  activeSessionId,
  busy,
  clockNow,
  completedTodayItems,
  continueSessionItems,
  formatTime,
  handleOpenLinkedNote,
  handleOpenNote,
  handleOpenSession,
  handleOpenSkill,
  handleSelectReminder,
  handleToggleSkillMounted,
  handleToggleTodayReminderStatus,
  lang,
  loading,
  noteList,
  openReminderCount,
  openView,
  recentCaptureItems,
  resolveReminderUrgency,
  resolveRuleActionTone,
  ruleActionRecommendations,
  todayReminderItems,
  todayReviewSignals,
}) {
  const { t } = useI18n();
  const todayActionBusy = busy === "toggle-reminder-status";
  const hiddenReminderCount = Math.max(0, Number(openReminderCount) - todayReminderItems.length);
  const todayActionsDisabled = busy !== "" || loading;
  const activeSessionTitle = activeSession?.session?.title || t("app.session.defaultTitle");
  const ruleActionBusy = busy === "save-session-skills" || busy === "open-skill";
  const resolveRuleActionLabel = (actionType) => {
    if (ruleActionBusy) {
      return t("app.common.saving");
    }
    if (actionType === "tune") {
      return t("app.today.review.skill.open");
    }
    if (actionType === "unmount") {
      return t("app.today.review.rule.action.unmount.button");
    }
    return t("app.skills.sessionMount.recommendedAction");
  };

  return (
    <section className="desk-today">
      <div className="today-layout">
        <div className="today-primary-column">
          <p className="today-intro">{t("app.view.today.description")}</p>

          <section className="desk-section today-section">
            <div className="section-head">
              <h2>{t("app.today.focus.title")}</h2>
              <AppButton className="ghost-button" onClick={() => openView("reminders")}>
                {t("app.mode.reminders")}
              </AppButton>
            </div>

            {todayReminderItems.length > 0 ? (
              <div className="desk-list">
                {todayReminderItems.map((reminder) => {
                  const urgency = resolveReminderUrgency(reminder, clockNow);
                  return (
                    <article key={reminder.id} className="desk-row today-focus-item">
                      <span className={`desk-status-dot urgency-${urgency}`} aria-hidden="true" />
                      <AppButton
                        className="desk-row__body"
                        disabled={todayActionsDisabled}
                        onClick={async () => {
                          const opened = await handleSelectReminder(reminder.id);
                          if (opened) {
                            openView("reminders");
                          }
                        }}
                      >
                        <strong>{reminder.title}</strong>
                        <span className="desk-row__meta">
                          <span>{t(`app.today.urgency.${urgency}`)}</span>
                          <span>
                            {reminder.dueAt
                              ? formatTime(reminder.dueAt, lang)
                              : t("app.reminders.noDueDate")}
                          </span>
                        </span>
                      </AppButton>
                      <AppButton
                        className="ghost-button desk-row__action"
                        disabled={todayActionsDisabled}
                        onClick={() => {
                          void handleToggleTodayReminderStatus(reminder);
                        }}
                      >
                        {todayActionBusy
                          ? t("app.common.saving")
                          : t(
                              `app.today.action.${
                                reminder.status === "done" ? "reopen" : "markDone"
                              }`
                            )}
                      </AppButton>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="desk-empty">{t("app.today.focus.emptyTitle")}</p>
            )}

            {hiddenReminderCount > 0 ? (
              <AppButton className="ghost-button today-rest-link" onClick={() => openView("reminders")}>
                {t("app.today.restCount", { count: hiddenReminderCount })}
              </AppButton>
            ) : null}
          </section>

          <section className="desk-section today-section">
            <div className="section-head">
              <h2>{t("app.today.sessions.title")}</h2>
              <AppButton className="ghost-button" onClick={() => openView("agent")}>
                {t("app.mode.agent")}
              </AppButton>
            </div>

            <div className="desk-row today-session-spotlight">
              <div className="today-session-spotlight__copy">
                <span className="desk-row__meta">{t("app.today.sessions.active")}</span>
                <strong>{activeSessionTitle}</strong>
              </div>
              <AppButton className="solid-button" onClick={() => openView("agent")}>
                {t("app.today.sessions.continue")}
              </AppButton>
            </div>

            {continueSessionItems.length > 0 ? (
              <div className="desk-list">
                {continueSessionItems.map((session) => (
                  <AppButton
                    key={session.id}
                    className={`desk-row desk-row--button ${
                      session.id === activeSessionId ? "is-active" : ""
                    }`}
                    onClick={async () => {
                      await handleOpenSession(session.id);
                      openView("agent");
                    }}
                  >
                    <strong>{session.title}</strong>
                    <span className="desk-row__meta">
                      <span>{session.lastMessagePreview || t("app.session.emptyMessages")}</span>
                      <span>{formatTime(session.updatedAt, lang)}</span>
                    </span>
                  </AppButton>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="today-sidebar">
          <section className="desk-section today-section">
            <div className="section-head">
              <h2>{t("app.today.review.summaryTitle")}</h2>
            </div>
            <div className="desk-list today-review-list">
              {todayReviewSignals.slice(0, 3).map((item) => (
                <div key={item.id} className="desk-row today-review-signal">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          {ruleActionRecommendations.length > 0 ? (
            <section className="desk-section today-section">
              <div className="section-head">
                <h2>{t("app.today.review.rule.actionTitle")}</h2>
              </div>
              <div className="desk-list">
                {ruleActionRecommendations.map((item) => (
                  <article
                    key={`${item.actionType}-${item.matchedSkillId}-${item.title}`}
                    className="desk-row today-rule-item"
                  >
                    <div className="today-rule-item__copy">
                      <div className="today-rule-item__head">
                        <strong>{item.actionTitle}</strong>
                        <AppStatusChip tone={resolveRuleActionTone(item.actionType)}>
                          {t(`app.today.review.rule.action.${item.actionType}.badge`)}
                        </AppStatusChip>
                      </div>
                      <span className="desk-row__meta">
                        <span>{item.matchedSkillName}</span>
                        <span>{t("app.today.review.rule.loop", { title: item.title })}</span>
                      </span>
                      <span className="today-rule-item__reason">{item.reason}</span>
                    </div>
                    <AppButton
                      className="ghost-button desk-row__action"
                      disabled={todayActionsDisabled}
                      onClick={async () => {
                        if (item.actionType === "tune") {
                          const opened = await handleOpenSkill(item.matchedSkillId);
                          if (opened) {
                            openView("skills");
                          }
                          return;
                        }
                        void handleToggleSkillMounted(item.matchedSkillId);
                      }}
                    >
                      {resolveRuleActionLabel(item.actionType)}
                    </AppButton>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <details className="today-disclosure desk-section">
            <summary>
              <span>{t("app.today.completed.title")}</span>
              <span className="desk-count">{completedTodayItems.length}</span>
            </summary>
            {completedTodayItems.length > 0 ? (
              <div className="desk-list">
                {completedTodayItems.map((item) => {
                  const linkedNote =
                    noteList.find((note) => String(note.id) === String(item.linkedNoteId)) || null;
                  return (
                    <article key={item.id} className="desk-row">
                      <AppButton
                        className="desk-row__body"
                        disabled={todayActionsDisabled}
                        onClick={async () => {
                          if (linkedNote) {
                            await handleOpenLinkedNote(linkedNote.id);
                            return;
                          }
                          const opened = await handleSelectReminder(item.id);
                          if (opened) {
                            openView("reminders");
                          }
                        }}
                      >
                        <strong>{item.title}</strong>
                        <span className="desk-row__meta">
                          <span>{formatTime(item.updatedAt, lang)}</span>
                          {linkedNote ? (
                            <span>{t("app.reminders.linked", { title: linkedNote.title })}</span>
                          ) : null}
                        </span>
                      </AppButton>
                      <AppButton
                        className="ghost-button desk-row__action"
                        disabled={todayActionsDisabled}
                        onClick={() => {
                          void handleToggleTodayReminderStatus(item);
                        }}
                      >
                        {todayActionBusy ? t("app.common.saving") : t("app.today.action.reopen")}
                      </AppButton>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="desk-empty">{t("app.today.completed.emptyDescription")}</p>
            )}
          </details>

          <details className="today-disclosure desk-section">
            <summary>
              <span>{t("app.today.captures.title")}</span>
              <span className="desk-count">{recentCaptureItems.length}</span>
            </summary>
            {recentCaptureItems.length > 0 ? (
              <div className="desk-list">
                {recentCaptureItems.map((item) => (
                  <AppButton
                    key={item.id}
                    className="desk-row desk-row--button"
                    onClick={async () => {
                      if (item.kind === "note") {
                        const opened = await handleOpenNote(item.targetId);
                        if (opened) {
                          openView("knowledge");
                        }
                        return;
                      }
                      const opened = await handleSelectReminder(item.targetId);
                      if (opened) {
                        openView("reminders");
                      }
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span className="desk-row__meta">
                      <span>{t(`app.today.captureKind.${item.kind}`)}</span>
                      <span>{formatTime(item.updatedAt, lang)}</span>
                    </span>
                  </AppButton>
                ))}
              </div>
            ) : (
              <p className="desk-empty">{t("app.today.captures.emptyDescription")}</p>
            )}
          </details>
        </aside>
      </div>
    </section>
  );
}

export default TodayWorkspace;
