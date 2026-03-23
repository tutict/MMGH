import React, { useMemo } from "react";
import { useI18n } from "../i18n";

function SkillWorkspace({
  activeSkill,
  activeSkillId,
  activeSessionTitle,
  busy,
  filteredSkills,
  handleCreateSkill,
  handleDeleteSkill,
  handleOpenSkill,
  handleSaveSkill,
  handleToggleSkillMounted,
  hasUnsavedSkill,
  loading,
  mountedSkillIds,
  skillDraft,
  skillSearch,
  setSkillDraft,
  setSkillSearch,
}) {
  const { t } = useI18n();
  const enabledCount = useMemo(
    () => filteredSkills.filter((skill) => skill.enabled).length,
    [filteredSkills]
  );
  const mountedCount = useMemo(
    () => filteredSkills.filter((skill) => mountedSkillIds.includes(skill.id)).length,
    [filteredSkills, mountedSkillIds]
  );

  return (
    <section className="skill-panel panel-surface">
      <div className="skill-sidebar">
        <div className="section-head knowledge-head">
          <div>
            <span className="eyebrow">{t("app.skills.eyebrow")}</span>
            <h3>{t("app.skills.title")}</h3>
          </div>
          <button
            type="button"
            className="solid-button"
            onClick={handleCreateSkill}
            disabled={busy !== "" || loading}
          >
            {t("app.skills.newSkill")}
          </button>
        </div>

        <div className="skill-sidebar__status">
          <span className="section-note">{t("app.skills.total", { count: filteredSkills.length })}</span>
          <span className="section-note">{t("app.skills.enabledCount", { count: enabledCount })}</span>
          <span className="section-note">{t("app.skills.mountedCount", { count: mountedCount })}</span>
          <span className="priority-pill priority-low">{t("app.permission.low")}</span>
        </div>

        <input
          className="field-input"
          value={skillSearch}
          onChange={(event) => setSkillSearch(event.target.value)}
          placeholder={t("app.skills.search")}
        />

        <div className="skill-list">
          {filteredSkills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              className={`skill-card ${skill.id === activeSkillId ? "is-active" : ""}`}
              onClick={() => handleOpenSkill(skill.id)}
            >
              <div className="skill-card__head">
                <strong>{skill.name}</strong>
                <div className="skill-card__status-group">
                  <span className={`status-chip ${skill.enabled ? "status-completed" : "status-idle"}`}>
                    {skill.enabled ? t("app.skills.enabled") : t("app.skills.disabled")}
                  </span>
                  {mountedSkillIds.includes(skill.id) ? (
                    <span className="status-chip status-running">{t("app.skills.mounted")}</span>
                  ) : null}
                </div>
              </div>
              <p>{skill.summary}</p>
              <div className="skill-card__meta">
                <span>{skill.triggerHint || t("app.skills.noTriggerHint")}</span>
                <span>{t(`app.permission.${skill.permissionLevel}`)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="skill-editor">
        <div className="knowledge-editor__toolbar">
          <div className="knowledge-editor__stamp">
            <span className="eyebrow">{t("app.skills.editor.eyebrow")}</span>
            <p>
              {t("app.skills.editor.description")}
            </p>
          </div>
          <div className="knowledge-editor__actions">
            <button
              type="button"
              className="ghost-button"
              onClick={handleDeleteSkill}
              disabled={!activeSkill || busy !== "" || loading}
            >
              {t("app.common.delete")}
            </button>
            <button
              type="button"
              className="solid-button"
              onClick={handleSaveSkill}
              disabled={!hasUnsavedSkill || busy !== "" || loading}
            >
              {busy === "save-skill" ? t("app.common.saving") : t("app.skills.save")}
            </button>
          </div>
        </div>

        {activeSkill ? (
          <div className="skill-editor__form">
            <div className="reminder-editor__grid">
              <label className="settings-form__row">
                <span>{t("app.skills.form.name")}</span>
                <input
                  className="field-input"
                  value={skillDraft.name}
                  onChange={(event) =>
                    setSkillDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t("app.skills.form.namePlaceholder")}
                />
              </label>

              <label className="settings-form__row">
                <span>{t("app.skills.form.triggerHint")}</span>
                <input
                  className="field-input"
                  value={skillDraft.triggerHint}
                  onChange={(event) =>
                    setSkillDraft((prev) => ({
                      ...prev,
                      triggerHint: event.target.value,
                    }))
                  }
                  placeholder={t("app.skills.form.triggerHintPlaceholder")}
                />
              </label>

              <label className="settings-form__row">
                <span>{t("app.skills.form.permission")}</span>
                <input className="field-input" value={t("app.permission.low")} disabled />
              </label>

              <label className="settings-form__row skill-toggle-row">
                <span>{t("app.skills.form.enabled")}</span>
                <button
                  type="button"
                  className={`toggle-pill ${skillDraft.enabled ? "is-on" : ""}`}
                  onClick={() =>
                    setSkillDraft((prev) => ({
                      ...prev,
                      enabled: !prev.enabled,
                    }))
                  }
                >
                  <span />
                </button>
              </label>

              <label className="settings-form__row skill-toggle-row">
                <span>{t("app.skills.form.mountedOnSession")}</span>
                <button
                  type="button"
                  className={`toggle-pill ${mountedSkillIds.includes(activeSkill.id) ? "is-on" : ""}`}
                  onClick={() => handleToggleSkillMounted(activeSkill.id)}
                  disabled={busy !== "" || loading}
                >
                  <span />
                </button>
              </label>
            </div>

            <div className="skill-mount-banner">
              <span className="eyebrow">{t("app.skills.currentSession")}</span>
              <strong>{activeSessionTitle}</strong>
              <p>
                {mountedSkillIds.includes(activeSkill.id)
                  ? t("app.skills.attached")
                  : t("app.skills.notAttached")}
              </p>
            </div>

            <label className="settings-form__row">
              <span>{t("app.skills.form.description")}</span>
              <textarea
                className="field-area"
                rows={4}
                value={skillDraft.description}
                onChange={(event) =>
                  setSkillDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder={t("app.skills.form.descriptionPlaceholder")}
              />
            </label>

            <label className="settings-form__row">
              <span>{t("app.skills.form.instructions")}</span>
              <textarea
                className="knowledge-body-input reminder-detail-input"
                value={skillDraft.instructions}
                onChange={(event) =>
                  setSkillDraft((prev) => ({
                    ...prev,
                    instructions: event.target.value,
                  }))
                }
                placeholder={t("app.skills.form.instructionsPlaceholder")}
              />
            </label>
          </div>
        ) : (
          <div className="gallery-empty reminder-empty-state">
            <span className="eyebrow">{t("app.skills.title")}</span>
            <h3>{t("app.skills.emptyState.title")}</h3>
            <p>{t("app.skills.emptyState.description")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default SkillWorkspace;
