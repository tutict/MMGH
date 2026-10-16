import React from "react";
import { useI18n } from "../i18n";
import { AppButton, AppStatusChip } from "./ui";

function TodayWorkspace({
  activeSession,
  activeSessionId,
  activeWeatherCity: _activeWeatherCity,
  busy,
  clockNow,
  completedTodayItems,
  continueSessionItems,
  dueReminderCount: _dueReminderCount,
  formatShortClock: _formatShortClock,
  formatTime,
  handleOpenNote,
  handleOpenLinkedNote,
  handleOpenReminderPattern,
  handleOpenSession,
  handleOpenSkill,
  handlePromoteReminderPattern,
  handleSelectReminder,
  handleToggleSkillMounted,
  handleToggleTodayReminderStatus,
  lang,
  loading,
  noteList,
  openReminderCount,
  openView,
  providerConfigured: _providerConfigured,
  recentCaptureItems,
  recurringPatternInsights,
  resolvePatternStatusTone,
  resolveReminderUrgency,
  resolveRuleActionTone,
  resolveRuleEffectivenessTone,
  ruleActionRecommendations,
  ruleEffectivenessInsights,
  ruleEffectivenessSignals,
  todayReminderItems,
  todayReviewSignals,
  weatherStatus: _weatherStatus,
}) {
  const { t } = useI18n();
  const todayActionBusy = busy === "toggle-reminder-status";
  const hiddenReminderCount = Math.max(0, Number(openReminderCount) - todayReminderItems.length);
  const todayActionsDisabled = busy !== "" || loading;
  const activeSessionTitle = activeSession?.session?.title || t("app.session.defaultTitle");
  return (
    <section className="desk-today today-workspace">
      <div className="today-layout">
        <section className="today-primary-column">
          <section className="panel-surface today-section">
            <div className="today-section__head">
              <div>
                <span className="eyebrow">{t("app.today.focus.eyebrow")}</span>
                <h4>{t("app.today.focus.title")}</h4>
              </div>
              <AppButton className="ghost-button" onClick={() => openView("reminders")}>
                {t("app.mode.reminders")}
              </AppButton>
            </div>

            {todayReminderItems.length > 0 ? (
              <div className="today-focus-list">
                {todayReminderItems.map((reminder) => {
                  const urgency = resolveReminderUrgency(reminder, clockNow);
                  return (
                    <article
                      key={reminder.id}
                      className={`today-focus-item urgency-${urgency}`}
                    >
                      <AppButton
                        className="today-focus-item__body"
                        disabled={todayActionsDisabled}
                        onClick={async () => {
                          const opened = await handleSelectReminder(reminder.id);
                          if (opened) {
                            openView("reminders");
                          }
                        }}
                      >
                        <div className="today-focus-item__head">
                          <strong>{reminder.title}</strong>
                          <AppStatusChip tone={reminder.status}>
                            {t(`app.reminders.status.${reminder.status}`)}
                          </AppStatusChip>
                        </div>
                        <p>{reminder.preview || t("app.reminders.emptyBucket")}</p>
                        <div className="today-focus-item__meta">
                          <span className={`today-focus-item__urgency urgency-${urgency}`}>
                            {t(`app.today.urgency.${urgency}`)}
                          </span>
                          <span>
                            {reminder.dueAt
                              ? formatTime(reminder.dueAt, lang)
                              : t("app.reminders.noDueDate")}
                          </span>
                        </div>
                      </AppButton>
                      <div className="today-item__actions">
                        <AppButton
                          className="ghost-button today-inline-action"
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
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="today-empty-state">
                <strong>{t("app.today.focus.emptyTitle")}</strong>
                <p>{t("app.today.focus.emptyDescription")}</p>
              </div>
            )}
          </section>

          
            {hiddenReminderCount > 0 ? (
            <AppButton className="ghost-button" onClick={() => openView("reminders")}>
              {t("app.today.restCount", { count: hiddenReminderCount })}
            </AppButton>
          ) : null}
          <section className="panel-surface today-section">
              <div className="today-section__head">
                <div>
                  <span className="eyebrow">{t("app.today.sessions.eyebrow")}</span>
                  <h4>{t("app.today.sessions.title")}</h4>
                </div>
                <AppButton className="ghost-button" onClick={() => openView("agent")}>
                  {t("app.mode.agent")}
                </AppButton>
              </div>

              <div className="today-session-spotlight">
                <span className="section-note">{t("app.today.sessions.active")}</span>
                <strong>{activeSessionTitle}</strong>
                <div className="today-session-spotlight__actions">
                  <AppButton className="solid-button" onClick={() => openView("agent")}>
                    {t("app.today.sessions.continue")}
                  </AppButton>
                </div>
              </div>

              {continueSessionItems.length > 0 ? (
                <div className="today-session-list">
                  {continueSessionItems.map((session) => (
                    <AppButton
                      key={session.id}
                      className={`today-session-item ${session.id === activeSessionId ? "is-active" : ""}`}
                      onClick={async () => {
                        await handleOpenSession(session.id);
                        openView("agent");
                      }}
                    >
                      <div className="today-session-item__head">
                        <strong>{session.title}</strong>
                        <AppStatusChip tone={session.status}>
                          {t(`app.status.${session.status}`)}
                        </AppStatusChip>
                      </div>
                      <p>{session.lastMessagePreview || t("app.session.emptyMessages")}</p>
                      <span className="section-note">{formatTime(session.updatedAt, lang)}</span>
                    </AppButton>
                  ))}
                </div>
              ) : null}
            </section>
        </section>

        <aside className="today-sidebar">
          <section className="panel-surface today-section today-section--compact">
            <div className="today-section__head">
              <div>
                <span className="eyebrow">{t("app.today.review.summaryEyebrow")}</span>
                <h4>{t("app.today.review.summaryTitle")}</h4>
              </div>
            </div>

            <div className="today-review-grid">
              {todayReviewSignals.map((item) => (
                <article key={item.id} className="today-review-signal">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <details open className="today-rule-block">
              <summary>{t("app.today.review.rule.actionTitle")}</summary>
              {ruleActionRecommendations.length > 0 ? (
                <div className="today-rule-list">
                  {ruleActionRecommendations.map((item) => (
                    <article
                      key={`${item.actionType}-${item.matchedSkillId}-${item.title}`}
                      className={`today-pattern-item today-rule-item today-rule-item--${item.actionType}`}
                    >
                      <AppButton
                        className="today-pattern-item__body today-rule-item__body"
                        disabled={todayActionsDisabled}
                        onClick={async () => {
                          const opened = await handleOpenSkill(item.matchedSkillId);
                          if (opened) {
                            openView("skills");
                          }
                        }}
                      >
                        <div className="today-pattern-item__copy">
                          <div className="today-pattern-item__head">
                            <strong>{item.actionTitle}</strong>
                            <AppStatusChip tone={resolveRuleActionTone(item.actionType)}>
                              {t(`app.today.review.rule.action.${item.actionType}.badge`)}
                            </AppStatusChip>
                          </div>
                          <span>{item.matchedSkillName}</span>
                          <span>{t("app.today.review.rule.loop", { title: item.title })}</span>
                          <span>{item.reason}</span>
                        </div>
                      </AppButton>
                      <div className="today-item__actions">
                        {item.actionType === "tune" ? (
                          <AppButton
                            className="ghost-button today-inline-action"
                            disabled={todayActionsDisabled}
                            onClick={async () => {
                              const opened = await handleOpenSkill(item.matchedSkillId);
                              if (opened) {
                                openView("skills");
                              }
                            }}
                          >
                            {t("app.today.review.skill.open")}
                          </AppButton>
                        ) : (
                          <AppButton
                            className="ghost-button today-inline-action"
                            disabled={todayActionsDisabled}
                            onClick={() => {
                              void handleToggleSkillMounted(item.matchedSkillId);
                            }}
                          >
                            {busy === "save-session-skills"
                              ? t("app.common.saving")
                              : item.actionType === "unmount"
                                ? t("app.today.review.rule.action.unmount.button")
                                : t("app.skills.sessionMount.recommendedAction")}
                          </AppButton>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-note runtime-sidebar-copy">{t("app.today.review.rule.actionEmpty")}</p>
              )}
            </details>

            <details className="today-rule-block">
              <summary>{t("app.today.review.ruleTitle")}</summary>
              <div className="today-rule-grid">
                {ruleEffectivenessSignals.map((item) => (
                  <article key={item.id} className="today-review-signal today-rule-signal">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </div>
              {ruleEffectivenessInsights.length > 0 ? (
                <div className="today-rule-list">
                  {ruleEffectivenessInsights.map((item) => (
                    <article key={`rule-${item.title}`} className="today-pattern-item today-rule-item">
                      <AppButton
                        className="today-pattern-item__body today-rule-item__body"
                        disabled={todayActionsDisabled}
                        onClick={async () => {
                          const opened = await handleOpenSkill(item.matchedSkillId);
                          if (opened) {
                            openView("skills");
                          }
                        }}
                      >
                        <div className="today-pattern-item__copy">
                          <div className="today-pattern-item__head">
                            <strong>{item.matchedSkillName}</strong>
                            <AppStatusChip tone={resolveRuleEffectivenessTone(item.effectivenessState)}>
                              {t(`app.today.review.rule.state.${item.effectivenessState}`)}
                            </AppStatusChip>
                          </div>
                          <span>{t("app.today.review.rule.loop", { title: item.title })}</span>
                          <div className="today-rule-item__metrics">
                            <span>
                              {t("app.today.review.rule.helpedToday", {
                                count: item.closedTodayCount,
                              })}
                            </span>
                            <span>{t("app.today.review.rule.rate", { rate: item.closureRate })}</span>
                            <span>
                              {t("app.today.review.pattern.effect", {
                                closed: item.closedCount,
                                open: item.openCount,
                              })}
                            </span>
                          </div>
                        </div>
                      </AppButton>
                      <div className="today-item__actions">
                        {item.status === "available" ? (
                          <AppButton
                            className="ghost-button today-inline-action"
                            disabled={todayActionsDisabled}
                            onClick={() => {
                              void handleToggleSkillMounted(item.matchedSkillId);
                            }}
                          >
                            {busy === "save-session-skills"
                              ? t("app.common.saving")
                              : t("app.skills.sessionMount.recommendedAction")}
                          </AppButton>
                        ) : (
                          <AppButton
                            className="ghost-button today-inline-action"
                            disabled={todayActionsDisabled}
                            onClick={async () => {
                              const opened = await handleOpenSkill(item.matchedSkillId);
                              if (opened) {
                                openView("skills");
                              }
                            }}
                          >
                            {t("app.today.review.skill.open")}
                          </AppButton>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-note runtime-sidebar-copy">{t("app.today.review.ruleEmpty")}</p>
              )}
            </details>

            {recurringPatternInsights.length > 0 ? (
              <details className="today-pattern-list">
                <summary>{t("app.today.review.recurringTitle")}</summary>
                {recurringPatternInsights.map((item) => (
                  <article key={item.title} className="today-pattern-item">
                    <AppButton
                      className="today-pattern-item__body"
                      disabled={todayActionsDisabled}
                      onClick={() => {
                        void handleOpenReminderPattern(item.title);
                      }}
                    >
                      <div className="today-pattern-item__copy">
                        <div className="today-pattern-item__head">
                          <strong>{item.title}</strong>
                          <AppStatusChip tone={resolvePatternStatusTone(item.status)}>
                            {t(`app.today.review.pattern.${item.status}`)}
                          </AppStatusChip>
                        </div>
                        <span>{t("app.today.review.recurringCount", { count: item.count })}</span>
                        <span>
                          {t("app.today.review.pattern.effect", {
                            closed: item.closedCount,
                            open: item.openCount,
                          })}
                        </span>
                        <span>
                          {item.matchedSkillName
                            ? t("app.today.review.pattern.skillName", { title: item.matchedSkillName })
                            : t("app.today.review.pattern.noSkill")}
                        </span>
                      </div>
                    </AppButton>
                    <div className="today-item__actions">
                      {item.status === "missing" ? (
                        <AppButton
                          className="ghost-button today-inline-action"
                          disabled={todayActionsDisabled}
                          onClick={() => {
                            void handlePromoteReminderPattern(item);
                          }}
                        >
                          {busy === "promote-pattern-skill"
                            ? t("app.common.saving")
                            : t("app.today.review.skill.action")}
                        </AppButton>
                      ) : item.status === "available" ? (
                        <AppButton
                          className="ghost-button today-inline-action"
                          disabled={todayActionsDisabled}
                          onClick={() => {
                            void handleToggleSkillMounted(item.matchedSkillId);
                          }}
                        >
                          {busy === "save-session-skills"
                            ? t("app.common.saving")
                            : t("app.skills.sessionMount.recommendedAction")}
                        </AppButton>
                      ) : (
                        <AppButton
                          className="ghost-button today-inline-action"
                          disabled={todayActionsDisabled}
                          onClick={async () => {
                            const opened = await handleOpenSkill(item.matchedSkillId);
                            if (opened) {
                              openView("skills");
                            }
                          }}
                        >
                          {t("app.today.review.skill.open")}
                        </AppButton>
                      )}
                    </div>
                  </article>
                ))}
              </details>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.today.review.recurringEmpty")}
              </p>
            )}
          </section>

          <details className="today-disclosure">
            <summary>{t("app.today.completed.title")}</summary>

            {completedTodayItems.length > 0 ? (
              <div className="today-capture-list">
                {completedTodayItems.map((item) => {
                  const linkedNote =
                    noteList.find((note) => String(note.id) === String(item.linkedNoteId)) || null;
                  return (
                    <article key={item.id} className="today-capture-item today-completion-item">
                      <AppButton
                        className="today-capture-item__body"
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
                        <div className="today-capture-item__head">
                          <span className="today-capture-item__kind">
                            {t("app.reminders.status.done")}
                          </span>
                          <span className="section-note">{formatTime(item.updatedAt, lang)}</span>
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.preview || t("app.common.empty")}</p>
                        {linkedNote ? (
                          <span className="section-note">
                            {t("app.reminders.linked", { title: linkedNote.title })}
                          </span>
                        ) : null}
                      </AppButton>
                      <div className="today-item__actions">
                        <AppButton
                          className="ghost-button today-inline-action"
                          disabled={todayActionsDisabled}
                          onClick={() => {
                            void handleToggleTodayReminderStatus(item);
                          }}
                        >
                          {todayActionBusy
                            ? t("app.common.saving")
                            : t("app.today.action.reopen")}
                        </AppButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.today.completed.emptyDescription")}
              </p>
            )}
          </details>

          <details className="today-disclosure">
            <summary>{t("app.today.captures.title")}</summary>

            {recentCaptureItems.length > 0 ? (
              <div className="today-capture-list">
                {recentCaptureItems.map((item) => (
                  <AppButton
                    key={item.id}
                    className="today-capture-item"
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
                    <div className="today-capture-item__head">
                      <span className="today-capture-item__kind">
                        {t(`app.today.captureKind.${item.kind}`)}
                      </span>
                      <span className="section-note">{formatTime(item.updatedAt, lang)}</span>
                    </div>
                    <strong>{item.title}</strong>
                    <p>{item.detail || t("app.common.empty")}</p>
                  </AppButton>
                ))}
              </div>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.today.captures.emptyDescription")}
              </p>
            )}
          </details>

          
        </aside>
      </div>
    </section>
  );
}

export default TodayWorkspace;
