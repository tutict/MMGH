import React, { useMemo } from "react";
import { ButtonBase, TextField } from "@mui/material";
import { useI18n } from "../i18n";

function RuntimeWorkspace({
  activeSession,
  activeSessionId,
  activeSessionRecommendedSkills,
  activeSessionSkills,
  busy,
  captureDraft,
  draft,
  formatTime,
  handleCaptureSessionNote,
  handleCaptureSessionReminder,
  handleOpenSession,
  handleOpenSkill,
  handleRunAgent,
  handleToggleSkillMounted,
  isInspectorOpen,
  lang,
  loading,
  mountedSkillIds,
  normalizeActivityKind,
  openInspector,
  openView,
  PanelIcon,
  providerConfigured,
  sessionList,
  setDraft,
}) {
  const { t } = useI18n();
  const messages = activeSession?.messages || [];
  const activityItems = activeSession?.activity || [];
  const recentActivity = activityItems.slice(-4).reverse();
  const recentSessions = sessionList.slice(0, 6);
  const recommendedSkillsPreview = activeSessionRecommendedSkills.slice(0, 3);
  const activeStatus = activeSession?.session?.status || "idle";
  const activeTitle = activeSession?.session?.title || t("app.session.defaultTitle");
  const mountedSkillSet = useMemo(() => new Set(mountedSkillIds), [mountedSkillIds]);
  const updatedAt =
    activeSession?.session?.updatedAt || messages[messages.length - 1]?.createdAt || 0;
  const isRunning = busy === "run";
  const isCapturingNote = busy === "capture-note";
  const isCapturingReminder = busy === "capture-reminder";

  return (
    <section className="runtime-workspace">
      <section className="panel-surface runtime-status-panel">
        <div className="runtime-status-panel__identity">
          <span className="runtime-status-panel__label">{t("app.view.agent.badge.session")}</span>
          <strong>{activeTitle}</strong>
          <span>{updatedAt ? formatTime(updatedAt, lang) : t("app.common.loading")}</span>
        </div>

        <div className="runtime-status-panel__metrics" aria-label={t("app.agent.conversation.title")}>
          <div className="runtime-status-panel__metric runtime-status-panel__metric--state">
            <span className={`status-chip status-${activeStatus}`}>
              {t(`app.status.${activeStatus}`)}
            </span>
          </div>
          <div className="runtime-status-panel__metric">
            <span>{t("app.agent.conversation.title")}</span>
            <strong>{messages.length}</strong>
          </div>
          <div className="runtime-status-panel__metric">
            <span>{t("app.view.agent.badge.mounted")}</span>
            <strong>{activeSessionSkills.length}</strong>
          </div>
          <div className="runtime-status-panel__metric">
            <span>{t("app.view.agent.badge.gateway")}</span>
            <strong>{t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}</strong>
          </div>
        </div>
      </section>

      <div className="runtime-layout">
        <div className="runtime-main-column">
          <article className="panel-surface runtime-stage-card">
            <div className="section-head runtime-stage-card__head">
              <div>
                <span className="eyebrow">{t("app.agent.conversation.eyebrow")}</span>
                <h3>{t("app.agent.conversation.title")}</h3>
              </div>
              <div className="runtime-stage-card__meta">
                <span className={`status-chip status-${activeStatus}`}>
                  {t(`app.status.${activeStatus}`)}
                </span>
                <span className="section-note">
                  {updatedAt ? formatTime(updatedAt, lang) : t("app.common.loading")}
                </span>
              </div>
            </div>

            <div className="runtime-thread">
              <div className="message-list runtime-message-list runtime-thread__frame">
                {messages.length > 0 ? (
                  messages.map((message, index) => {
                    const messageRole = message.role === "user" ? "user" : "assistant";
                    const roleLabel = t(
                      messageRole === "user"
                        ? "app.agent.message.operator"
                        : "app.agent.message.agent"
                    );

                    return (
                      <article
                        key={message.id}
                        className={`message-card role-${messageRole}`}
                      >
                        <div className="message-card__meta">
                          <div className="message-card__identity">
                            <span className={`message-card__badge role-${messageRole}`}>
                              {roleLabel}
                            </span>
                            <span className="message-card__sequence">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>
                          <span className="message-card__time">
                            {formatTime(message.createdAt, lang)}
                          </span>
                        </div>
                        <div className="message-card__body">
                          <pre>{message.content}</pre>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="runtime-empty-state">
                    <strong>{t("app.session.emptyMessages")}</strong>
                    <p>{t("app.agent.composer.placeholder")}</p>
                  </div>
                )}
              </div>
            </div>
          </article>

          <form className="composer runtime-composer" onSubmit={handleRunAgent}>
            <div className="runtime-composer__head">
              <div>
                <span className="eyebrow">{t("app.agent.message.operator")}</span>
                <h4>{t("app.common.send")}</h4>
              </div>
              <span
                className={`status-chip ${
                  providerConfigured ? "status-completed" : "status-warning"
                }`}
              >
                {t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}
              </span>
            </div>
            <TextField
              className="mui-field runtime-composer__input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("app.agent.composer.placeholder")}
              multiline
              minRows={6}
              fullWidth
            />
            <div className="composer__actions runtime-composer__actions">
              <span className="runtime-composer__hint">
                {providerConfigured
                  ? t("app.agent.composer.providerConfigured")
                  : t("app.agent.composer.providerPending")}
              </span>
              <ButtonBase
                component="button"
                type="submit"
                className="solid-button"
                disabled={busy !== "" || loading || !draft.trim()}
              >
                {isRunning ? t("app.common.sending") : t("app.common.send")}
              </ButtonBase>
            </div>
          </form>
        </div>

        <aside className="runtime-sidebar runtime-sidebar--compact">
          <section className="panel-surface runtime-sidebar-card runtime-context-card">
            <div className="runtime-sidebar-card__head">
              <div>
                <span className="eyebrow">{t("app.agent.mount.eyebrow")}</span>
                <h4>
                  {activeSessionSkills.length > 0
                    ? t("app.agent.mount.title")
                    : t("app.agent.mount.emptyTitle")}
                </h4>
              </div>
              <ButtonBase
                component="button"
                type="button"
                className="ghost-button runtime-sidebar-card__action"
                onClick={() => openView("skills")}
              >
                {t("app.mode.skills")}
              </ButtonBase>
            </div>

            <div className="runtime-context-stack">
              <div className="runtime-context-row">
                <span className="runtime-context-label">{t("app.view.agent.badge.mounted")}</span>
                {activeSessionSkills.length > 0 ? (
                  <div className="runtime-chip-list">
                    {activeSessionSkills.map((skill) => (
                      <ButtonBase
                        component="button"
                        key={skill.id}
                        type="button"
                        className={`chip-button ${skill.enabled ? "is-active" : ""}`}
                        onClick={async () => {
                          const opened = await handleOpenSkill(skill.id);
                          if (opened) {
                            openView("skills");
                          }
                        }}
                      >
                        {skill.name}
                      </ButtonBase>
                    ))}
                  </div>
                ) : (
                  <p className="section-note runtime-sidebar-copy">
                    {t("app.agent.mount.emptyDescription")}
                  </p>
                )}
              </div>

              <div className="runtime-context-row">
                <span className="runtime-context-label">{t("app.agent.recommend.eyebrow")}</span>
                {recommendedSkillsPreview.length > 0 ? (
                  <div className="runtime-recommend-list runtime-recommend-list--compact">
                    {recommendedSkillsPreview.map((skill) => (
                      <article key={skill.id} className="runtime-recommend-card">
                        <ButtonBase
                          component="button"
                          type="button"
                          className="runtime-recommend-card__body"
                          onClick={async () => {
                            const opened = await handleOpenSkill(skill.id);
                            if (opened) {
                              openView("skills");
                            }
                          }}
                        >
                          <strong>{skill.name}</strong>
                          <span>{skill.recommendationReason || skill.triggerHint}</span>
                        </ButtonBase>
                        <div className="runtime-recommend-card__actions">
                          <ButtonBase
                            component="button"
                            type="button"
                            className="ghost-button runtime-sidebar-card__action"
                            disabled={mountedSkillSet.has(skill.id) || busy !== "" || loading}
                            onClick={() => {
                              void handleToggleSkillMounted(skill.id);
                            }}
                          >
                            {mountedSkillSet.has(skill.id)
                              ? t("app.skills.mounted")
                              : t("app.skills.sessionMount.recommendedAction")}
                          </ButtonBase>
                        </div>
                      </article>
                    ))}
                    {activeSessionRecommendedSkills.length > recommendedSkillsPreview.length ? (
                      <ButtonBase
                        component="button"
                        type="button"
                        className="runtime-inline-link"
                        onClick={() => openView("skills")}
                      >
                        {t("app.mode.skills")}
                      </ButtonBase>
                    ) : null}
                  </div>
                ) : (
                  <p className="section-note runtime-sidebar-copy">
                    {t("app.agent.recommend.emptyDescription")}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="panel-surface runtime-sidebar-card runtime-next-card">
            <div className="runtime-sidebar-card__head">
              <div>
                <span className="eyebrow">{t("app.agent.quick.eyebrow")}</span>
                <h4>
                  {captureDraft
                    ? t("app.agent.quick.title")
                    : t("app.agent.quick.emptyTitle")}
                </h4>
              </div>
            </div>

            {captureDraft ? (
              <>
                <div className="runtime-quick-summary">
                  <strong>{captureDraft.noteTitle}</strong>
                  <p>{captureDraft.summary}</p>
                  {captureDraft.userSummary ? (
                    <span className="section-note">{captureDraft.userSummary}</span>
                  ) : null}
                </div>
                <div className="runtime-quick-actions">
                  <ButtonBase
                    component="button"
                    type="button"
                    className="chip-button is-active"
                    disabled={busy !== "" || loading}
                    onClick={handleCaptureSessionNote}
                  >
                    {isCapturingNote ? t("app.common.saving") : t("app.agent.quick.saveNote")}
                  </ButtonBase>
                  <ButtonBase
                    component="button"
                    type="button"
                    className="chip-button"
                    disabled={busy !== "" || loading}
                    onClick={handleCaptureSessionReminder}
                  >
                    {isCapturingReminder
                      ? t("app.common.saving")
                      : t("app.agent.quick.saveReminder")}
                  </ButtonBase>
                </div>
              </>
            ) : (
              <p className="section-note runtime-sidebar-copy">
                {t("app.agent.quick.emptyDescription")}
              </p>
            )}

            <div className="runtime-mini-actions">
              <ButtonBase
                component="button"
                type="button"
                className={`ghost-button runtime-sidebar-card__action ${
                  isInspectorOpen ? "is-active" : ""
                }`}
                onClick={() => openInspector("activity")}
              >
                {t("app.activity.title")}
              </ButtonBase>
              <ButtonBase
                component="button"
                type="button"
                className="ghost-button runtime-sidebar-card__action"
                onClick={() => openView("skills")}
              >
                {t("app.mode.skills")}
              </ButtonBase>
            </div>

            <div className="runtime-disclosure-stack">
              <details className="runtime-disclosure">
                <summary>
                  <span>{t("app.activity.title")}</span>
                  <span className="section-note">{recentActivity.length}</span>
                </summary>
                {recentActivity.length > 0 ? (
                  <div className="runtime-activity-list">
                    {recentActivity.map((item) => {
                      const normalizedKind = normalizeActivityKind(item.kind);

                      return (
                        <article key={item.id} className="runtime-activity-item">
                          <div className="runtime-activity-item__head">
                            <div className="runtime-activity-item__title">
                              <span
                                className={`runtime-activity-item__icon runtime-activity-item__icon--${normalizedKind}`}
                              >
                                <PanelIcon type={normalizedKind} />
                              </span>
                              <div>
                                <strong>{item.title}</strong>
                                <span>{t(`app.activity.kind.${normalizedKind}`)}</span>
                              </div>
                            </div>
                            <span className={`status-chip status-${item.status}`}>
                              {t(`app.status.${item.status}`)}
                            </span>
                          </div>
                          <p>{item.detail}</p>
                          <span className="section-note">{formatTime(item.createdAt, lang)}</span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="section-note runtime-sidebar-copy">{t("app.status.idle")}</p>
                )}
              </details>

              <details className="runtime-disclosure">
                <summary>
                  <span>{t("app.agent.history.title")}</span>
                  <span className="section-note">
                    {t("app.agent.history.total", { count: sessionList.length })}
                  </span>
                </summary>
                <div className="runtime-session-list">
                  {recentSessions.map((session) => (
                    <ButtonBase
                      component="button"
                      key={session.id}
                      type="button"
                      className={`runtime-session-card ${
                        session.id === activeSessionId ? "is-active" : ""
                      }`}
                      onClick={() => handleOpenSession(session.id)}
                    >
                      <div className="runtime-session-card__head">
                        <strong>{session.title}</strong>
                        <span className={`status-chip status-${session.status}`}>
                          {t(`app.status.${session.status}`)}
                        </span>
                      </div>
                      <p>{session.lastMessagePreview || t("app.session.emptyMessages")}</p>
                      <span className="section-note">{formatTime(session.updatedAt, lang)}</span>
                    </ButtonBase>
                  ))}
                </div>
              </details>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default RuntimeWorkspace;
