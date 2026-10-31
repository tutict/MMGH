import React, { useMemo } from "react";
import { useI18n } from "../i18n";
import { AppButton, AppStatusChip, AppTextField } from "./ui";

function RuntimeWorkspace({
  activeSession,
  activeSessionRecommendedSkills,
  activeSessionSkills,
  busy,
  captureDraft,
  draft,
  formatTime,
  handleCaptureSessionNote,
  handleCaptureSessionReminder,
  handleOpenSkill,
  handleRunAgent,
  handleToggleSkillMounted,
  lang,
  loading,
  mountedSkillIds,
  normalizeActivityKind,
  openView,
  PanelIcon,
  providerConfigured,
  setDraft,
}) {
  const { t } = useI18n();
  const messages = activeSession?.messages || [];
  const activityItems = activeSession?.activity || [];
  const recentActivity = activityItems.slice(-4).reverse();
  const recommendedSkillsPreview = activeSessionRecommendedSkills.slice(0, 3);
  const activeStatus = activeSession?.session?.status || "idle";
  const mountedSkillSet = useMemo(() => new Set(mountedSkillIds), [mountedSkillIds]);
  const updatedAt =
    activeSession?.session?.updatedAt || messages[messages.length - 1]?.createdAt || 0;
  const isRunning = busy === "run";
  const isCapturingNote = busy === "capture-note";
  const isCapturingReminder = busy === "capture-reminder";

  return (
    <section className="desk-runtime runtime-workspace">
      <div className="runtime-main-column">
        <h2 className="sr-only">{t("app.agent.conversation.title")}</h2>
        <div className="runtime-status-strip">
          <AppStatusChip tone={activeStatus}>{t(`app.status.${activeStatus}`)}</AppStatusChip>
          <span>
            {t("app.agent.conversation.title")} {messages.length}
          </span>
          <span>
            {t("app.view.agent.badge.mounted")} {activeSessionSkills.length}
          </span>
          <span>
            {t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}
          </span>
          {updatedAt ? (
            <span className="runtime-status-strip__time">{formatTime(updatedAt, lang)}</span>
          ) : null}
        </div>

        <div className="runtime-thread scroll-area">
          {messages.length > 0 ? (
            messages.map((message) => {
              const messageRole = message.role === "user" ? "user" : "assistant";
              const roleLabel = t(
                messageRole === "user" ? "app.agent.message.operator" : "app.agent.message.agent"
              );

              return (
                <article key={message.id} className={`message-card role-${messageRole}`}>
                  <div className="message-card__meta">
                    <span className="message-card__role">{roleLabel}</span>
                    <span>{formatTime(message.createdAt, lang)}</span>
                  </div>
                  <pre>{message.content}</pre>
                </article>
              );
            })
          ) : (
            <div className="desk-empty runtime-empty-state">
              <strong>{t("app.session.emptyMessages")}</strong>
              <p>{t("app.agent.composer.placeholder")}</p>
            </div>
          )}
        </div>

        <form className="runtime-composer" onSubmit={handleRunAgent}>
          <AppTextField
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("app.agent.composer.placeholder")}
            slotProps={{ htmlInput: { "aria-label": t("app.common.send") } }}
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
          />
          <div className="runtime-composer__actions">
            <span className="field-hint">
              {providerConfigured
                ? t("app.agent.composer.providerConfigured")
                : t("app.agent.composer.providerPending")}
            </span>
            <AppButton
              type="submit"
              className="solid-button"
              disabled={busy !== "" || loading || !draft.trim()}
            >
              {isRunning ? t("app.common.sending") : t("app.common.send")}
            </AppButton>
          </div>
        </form>
      </div>

      <aside className="runtime-sidebar">
        <section className="desk-section">
          <div className="section-head">
            <h2>
              {activeSessionSkills.length > 0
                ? t("app.agent.mount.title")
                : t("app.agent.mount.emptyTitle")}
            </h2>
            <AppButton className="ghost-button" onClick={() => openView("skills")}>
              {t("app.mode.skills")}
            </AppButton>
          </div>

          {activeSessionSkills.length > 0 ? (
            <div className="runtime-chip-list">
              {activeSessionSkills.map((skill) => (
                <AppButton
                  key={skill.id}
                  className={`chip-button ${skill.enabled ? "is-active" : ""}`}
                  onClick={async () => {
                    const opened = await handleOpenSkill(skill.id);
                    if (opened) {
                      openView("skills");
                    }
                  }}
                >
                  {skill.name}
                </AppButton>
              ))}
            </div>
          ) : (
            <p className="desk-empty">{t("app.agent.mount.emptyDescription")}</p>
          )}
        </section>

        <section className="desk-section">
          <div className="section-head">
            <h2>{t("app.agent.recommend.eyebrow")}</h2>
          </div>
          {recommendedSkillsPreview.length > 0 ? (
            <div className="desk-list">
              {recommendedSkillsPreview.map((skill) => (
                <article key={skill.id} className="desk-row">
                  <AppButton
                    className="desk-row__body"
                    onClick={async () => {
                      const opened = await handleOpenSkill(skill.id);
                      if (opened) {
                        openView("skills");
                      }
                    }}
                  >
                    <strong>{skill.name}</strong>
                    <span className="desk-row__meta">
                      <span>{skill.recommendationReason || skill.triggerHint}</span>
                    </span>
                  </AppButton>
                  <AppButton
                    className="ghost-button desk-row__action"
                    disabled={mountedSkillSet.has(skill.id) || busy !== "" || loading}
                    onClick={() => {
                      void handleToggleSkillMounted(skill.id);
                    }}
                  >
                    {mountedSkillSet.has(skill.id)
                      ? t("app.skills.mounted")
                      : t("app.skills.sessionMount.recommendedAction")}
                  </AppButton>
                </article>
              ))}
            </div>
          ) : (
            <p className="desk-empty">{t("app.agent.recommend.emptyDescription")}</p>
          )}
        </section>

        <section className="desk-section">
          <div className="section-head">
            <h2>
              {captureDraft ? t("app.agent.quick.title") : t("app.agent.quick.emptyTitle")}
            </h2>
          </div>

          {captureDraft ? (
            <>
              <div className="runtime-quick-summary">
                <strong>{captureDraft.noteTitle}</strong>
                <p>{captureDraft.summary}</p>
              </div>
              <div className="runtime-quick-actions">
                <AppButton
                  className="ghost-button"
                  disabled={busy !== "" || loading}
                  onClick={handleCaptureSessionNote}
                >
                  {isCapturingNote ? t("app.common.saving") : t("app.agent.quick.saveNote")}
                </AppButton>
                <AppButton
                  className="ghost-button"
                  disabled={busy !== "" || loading}
                  onClick={handleCaptureSessionReminder}
                >
                  {isCapturingReminder ? t("app.common.saving") : t("app.agent.quick.saveReminder")}
                </AppButton>
              </div>
            </>
          ) : (
            <p className="desk-empty">{t("app.agent.quick.emptyDescription")}</p>
          )}
        </section>

        <details className="runtime-disclosure">
          <summary>
            <span>{t("app.activity.title")}</span>
            <span className="desk-count">{recentActivity.length}</span>
          </summary>
          {recentActivity.length > 0 ? (
            <div className="runtime-activity-list">
              {recentActivity.map((item) => {
                const normalizedKind = normalizeActivityKind(item.kind);

                return (
                  <article key={item.id} className="runtime-activity-item">
                    <div className="runtime-activity-item__head">
                      <span
                        className="runtime-activity-item__icon"
                      >
                        <PanelIcon type={normalizedKind} />
                      </span>
                      <strong>{item.title}</strong>
                      <span className="desk-row__meta">{formatTime(item.createdAt, lang)}</span>
                    </div>
                    <p>{item.detail}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="desk-empty">{t("app.status.idle")}</p>
          )}
        </details>
      </aside>
    </section>
  );
}

export default RuntimeWorkspace;
