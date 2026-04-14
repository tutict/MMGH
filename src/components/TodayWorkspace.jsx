import React, { useMemo } from "react";
import { useI18n } from "../i18n";

function TodayWorkspace({
  activeSession,
  activeSessionId,
  activeWeatherCity,
  busy,
  clockNow,
  completedTodayItems,
  continueSessionItems,
  dueReminderCount,
  formatShortClock,
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
  providerConfigured,
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
  weatherStatus,
}) {
  const { t } = useI18n();
  const todayActionBusy = busy === "toggle-reminder-status";
  const todayActionsDisabled = busy !== "" || loading;
  const dayPeriod = useMemo(() => {
    const hour = new Date(clockNow).getHours();
    if (hour < 12) {
      return t("app.today.daypart.morning");
    }
    if (hour < 18) {
      return t("app.today.daypart.afternoon");
    }
    return t("app.today.daypart.evening");
  }, [clockNow, t]);
  const activeSessionTitle = activeSession?.session?.title || t("app.session.defaultTitle");
  const weatherLabel =
    weatherStatus === "error"
      ? t("app.weather.status.error")
      : t(activeWeatherCity?.conditionKey || "app.weather.status.loading");

  return (
    <section className="today-workspace">
      <div className="today-layout">
        <section className="panel-surface today-hero">
          <div className="today-hero__copy">
            <span className="eyebrow">{t("app.today.eyebrow")}</span>
            <h3>{t("app.today.title", { dayPeriod })}</h3>
            <p>{t("app.today.description")}</p>
          </div>
          <div className="today-hero__stats">
            <div className="today-stat">
              <span>{t("app.today.stat.open")}</span>
              <strong>{openReminderCount}</strong>
            </div>
            <div className="today-stat">
              <span>{t("app.today.stat.due")}</span>
              <strong>{dueReminderCount}</strong>
            </div>
            <div className="today-stat">
              <span>{t("app.today.stat.clock")}</span>
              <strong>{formatShortClock(clockNow, lang)}</strong>
            </div>
          </div>
          <div className="today-hero__meta">
            <span className="today-meta-pill">
              {activeWeatherCity?.nameKey ? t(activeWeatherCity.nameKey) : activeWeatherCity?.name}
            </span>
            <span className="today-meta-pill">{weatherLabel}</span>
            <span className="today-meta-pill">
              {t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}
            </span>
          </div>
          <div className="today-hero__actions">
            <button type="button" className="solid-button" onClick={() => openView("agent")}>
              {t("app.today.action.resume")}
            </button>
            <button type="button" className="ghost-button" onClick={() => openView("reminders")}>
              {t("app.today.action.reminders")}
            </button>
          </div>
        </section>

        <section className="today-primary-column">
          <section className="panel-surface today-section">
            <div className="today-section__head">
              <div>
                <span className="eyebrow">{t("app.today.focus.eyebrow")}</span>
                <h4>{t("app.today.focus.title")}</h4>
              </div>
              <button type="button" className="ghost-button" onClick={() => openView("reminders")}>
                {t("app.mode.reminders")}
              </button>
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
                      <button
                        type="button"
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
                          <span className={`status-chip status-${reminder.status}`}>
                            {t(`app.reminders.status.${reminder.status}`)}
                          </span>
                        </div>
                        <p>{reminder.preview || t("app.reminders.emptyBucket")}</p>
                        <div className="today-focus-item__meta">
                          <span>{t(`app.today.urgency.${urgency}`)}</span>
                          <span>
                            {reminder.dueAt
                              ? formatTime(reminder.dueAt, lang)
                              : t("app.reminders.noDueDate")}
                          </span>
                        </div>
                      </button>
                      <div className="today-item__actions">
                        <button
                          type="button"
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
                        </button>
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

          <section className="panel-surface today-section">
            <div className="today-section__head">
              <div>
                <span className="eyebrow">{t("app.today.sessions.eyebrow")}</span>
                <h4>{t("app.today.sessions.title")}</h4>
              </div>
              <button type="button" className="ghost-button" onClick={() => openView("agent")}>
                {t("app.mode.agent")}
              </button>
            </div>

            <div className="today-session-spotlight">
              <span className="section-note">{t("app.today.sessions.active")}</span>
              <strong>{activeSessionTitle}</strong>
              <div className="today-session-spotlight__actions">
                <button type="button" className="solid-button" onClick={() => openView("agent")}>
                  {t("app.today.sessions.continue")}
                </button>
              </div>
            </div>

            {continueSessionItems.length > 0 ? (
              <div className="today-session-list">
                {continueSessionItems.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className={`today-session-item ${session.id === activeSessionId ? "is-active" : ""}`}
                    onClick={async () => {
                      await handleOpenSession(session.id);
                      openView("agent");
                    }}
                  >
                    <div className="today-session-item__head">
                      <strong>{session.title}</strong>
                      <span className={`status-chip status-${session.status}`}>
                        {t(`app.status.${session.status}`)}
                      </span>
                    </div>
                    <p>{session.lastMessagePreview || t("app.session.emptyMessages")}</p>
                    <span className="section-note">{formatTime(session.updatedAt, lang)}</span>
                  </button>
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

            <div className="today-rule-block">
              <span className="section-note">{t("app.today.review.rule.actionTitle")}</span>
              {ruleActionRecommendations.length > 0 ? (
                <div className="today-rule-list">
                  {ruleActionRecommendations.map((item) => (
                    <article
                      key={`${item.actionType}-${item.matchedSkillId}-${item.title}`}
                      className={`today-pattern-item today-rule-item today-rule-item--${item.actionType}`}
                    >
                      <button
                        type="button"
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
                            <span className={`status-chip status-${resolveRuleActionTone(item.actionType)}`}>
                              {t(`app.today.review.rule.action.${item.actionType}.badge`)}
                            </span>
                          </div>
                          <span>{item.matchedSkillName}</span>
                          <span>{t("app.today.review.rule.loop", { title: item.title })}</span>
                          <span>{item.reason}</span>
                        </div>
                      </button>
                      <div className="today-item__actions">
                        {item.actionType === "tune" ? (
                          <button
                            type="button"
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
                          </button>
                        ) : (
                          <button
                            type="button"
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
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-note runtime-sidebar-copy">{t("app.today.review.rule.actionEmpty")}</p>
              )}
            </div>

            <div className="today-rule-block">
              <span className="section-note">{t("app.today.review.ruleTitle")}</span>
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
                      <button
                        type="button"
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
                            <span
                              className={`status-chip status-${resolveRuleEffectivenessTone(item.effectivenessState)}`}
                            >
                              {t(`app.today.review.rule.state.${item.effectivenessState}`)}
                            </span>
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
                      </button>
                      <div className="today-item__actions">
                        {item.status === "available" ? (
                          <button
                            type="button"
                            className="ghost-button today-inline-action"
                            disabled={todayActionsDisabled}
                            onClick={() => {
                              void handleToggleSkillMounted(item.matchedSkillId);
                            }}
                          >
                            {busy === "save-session-skills"
                              ? t("app.common.saving")
                              : t("app.skills.sessionMount.recommendedAction")}
                          </button>
                        ) : (
                          <button
                            type="button"
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
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="section-note runtime-sidebar-copy">{t("app.today.review.ruleEmpty")}</p>
              )}
            </div>

            {recurringPatternInsights.length > 0 ? (
              <div className="today-pattern-list">
                <span className="section-note">{t("app.today.review.recurringTitle")}</span>
                {recurringPatternInsights.map((item) => (
                  <article key={item.title} className="today-pattern-item">
                    <button
                      type="button"
                      className="today-pattern-item__body"
                      disabled={todayActionsDisabled}
                      onClick={() => {
                        void handleOpenReminderPattern(item.title);
                      }}
                    >
                      <div className="today-pattern-item__copy">
                        <div className="today-pattern-item__head">
                          <strong>{item.title}</strong>
                          <span className={`status-chip status-${resolvePatternStatusTone(item.status)}`}>
                            {t(`app.today.review.pattern.${item.status}`)}
                          </span>
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
                    </button>
                    <div className="today-item__actions">
                      {item.status === "missing" ? (
                        <button
                          type="button"
                          className="ghost-button today-inline-action"
                          disabled={todayActionsDisabled}
                          onClick={() => {
                            void handlePromoteReminderPattern(item);
                          }}
                        >
                          {busy === "promote-pattern-skill"
                            ? t("app.common.saving")
                            : t("app.today.review.skill.action")}
                        </button>
                      ) : item.status === "available" ? (
                        <button
                          type="button"
                          className="ghost-button today-inline-action"
                          disabled={todayActionsDisabled}
                          onClick={() => {
                            void handleToggleSkillMounted(item.matchedSkillId);
                          }}
                        >
                          {busy === "save-session-skills"
                            ? t("app.common.saving")
                            : t("app.skills.sessionMount.recommendedAction")}
                        </button>
                      ) : (
                        <button
                          type="button"
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
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.today.review.recurringEmpty")}
              </p>
            )}
          </section>

          <section className="panel-surface today-section today-section--compact">
            <div className="today-section__head">
              <div>
                <span className="eyebrow">{t("app.today.completed.eyebrow")}</span>
                <h4>{t("app.today.completed.title")}</h4>
              </div>
            </div>

            {completedTodayItems.length > 0 ? (
              <div className="today-capture-list">
                {completedTodayItems.map((item) => {
                  const linkedNote =
                    noteList.find((note) => String(note.id) === String(item.linkedNoteId)) || null;
                  return (
                    <article key={item.id} className="today-capture-item today-completion-item">
                      <button
                        type="button"
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
                      </button>
                      <div className="today-item__actions">
                        <button
                          type="button"
                          className="ghost-button today-inline-action"
                          disabled={todayActionsDisabled}
                          onClick={() => {
                            void handleToggleTodayReminderStatus(item);
                          }}
                        >
                          {todayActionBusy
                            ? t("app.common.saving")
                            : t("app.today.action.reopen")}
                        </button>
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
          </section>

          <section className="panel-surface today-section today-section--compact">
            <div className="today-section__head">
              <div>
                <span className="eyebrow">{t("app.today.captures.eyebrow")}</span>
                <h4>{t("app.today.captures.title")}</h4>
              </div>
            </div>

            {recentCaptureItems.length > 0 ? (
              <div className="today-capture-list">
                {recentCaptureItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
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
                  </button>
                ))}
              </div>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.today.captures.emptyDescription")}
              </p>
            )}
          </section>

          <section className="panel-surface today-section today-section--compact">
            <div className="today-section__head">
              <div>
                <span className="eyebrow">{t("app.today.shortcuts.eyebrow")}</span>
                <h4>{t("app.today.shortcuts.title")}</h4>
              </div>
            </div>
            <div className="today-shortcut-grid">
              <button type="button" className="today-shortcut" onClick={() => openView("knowledge")}>
                <strong>{t("app.mode.knowledge")}</strong>
                <span>{t("app.today.shortcuts.knowledge")}</span>
              </button>
              <button type="button" className="today-shortcut" onClick={() => openView("skills")}>
                <strong>{t("app.mode.skills")}</strong>
                <span>{t("app.today.shortcuts.skills")}</span>
              </button>
              <button type="button" className="today-shortcut" onClick={() => openView("weather")}>
                <strong>{t("app.mode.weather")}</strong>
                <span>{t("app.today.shortcuts.weather")}</span>
              </button>
              <button type="button" className="today-shortcut" onClick={() => openView("settings")}>
                <strong>{t("app.mode.settings")}</strong>
                <span>{t("app.today.shortcuts.settings")}</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default TodayWorkspace;
