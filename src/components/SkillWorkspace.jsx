import React, { useMemo, useState } from "react";
import { useI18n } from "../i18n";

const FILTER_MODES = ["all", "enabled", "mounted", "starter", "workspace"];

function SkillWorkspace({
  activeSkill,
  activeSkillId,
  activeSkillVersions,
  activeSessionTitle,
  busy,
  handleCreateSkill,
  handleDeleteSkill,
  handleExportAllSkills,
  handleExportSkill,
  handleInstallSkillTemplate,
  handleForgeSkill,
  handleImportSkills,
  handleLoadSkillVersion,
  handleOpenSkill,
  handleRestoreSkillVersion,
  handleSaveSkill,
  handleToggleSkillMounted,
  hasUnsavedSkill,
  loading,
  mountedSkillIds,
  providerConfigured,
  setSkillDraft,
  setSkillSearch,
  skillImportInputRef,
  skillDraft,
  skillList,
  skillSearch,
}) {
  const { lang, t } = useI18n();
  const [filterMode, setFilterMode] = useState("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [forgePrompt, setForgePrompt] = useState("");

  const templates = useMemo(() => createSkillTemplates(t), [t]);
  const templateNameMap = useMemo(
    () =>
      new Map(
        templates.map((template) => [normalizeName(template.name), template])
      ),
    [templates]
  );

  const mountedSkillSet = useMemo(() => new Set(mountedSkillIds), [mountedSkillIds]);

  const searchedSkills = useMemo(() => {
    const needle = skillSearch.trim().toLowerCase();
    if (!needle) {
      return skillList;
    }
    return skillList.filter((skill) =>
      [skill.name, skill.summary, skill.triggerHint]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [skillList, skillSearch]);

  const visibleSkills = useMemo(
    () =>
      searchedSkills.filter((skill) => {
        if (filterMode === "enabled") {
          return skill.enabled;
        }
        if (filterMode === "mounted") {
          return mountedSkillSet.has(skill.id);
        }
        if (filterMode === "starter") {
          return isStarterSkill(skill, templateNameMap);
        }
        if (filterMode === "workspace") {
          return !isStarterSkill(skill, templateNameMap);
        }
        return true;
      }),
    [filterMode, mountedSkillSet, searchedSkills, templateNameMap]
  );

  const mountedSkills = useMemo(
    () => skillList.filter((skill) => mountedSkillSet.has(skill.id)),
    [mountedSkillSet, skillList]
  );

  const enabledCount = useMemo(
    () => skillList.filter((skill) => skill.enabled).length,
    [skillList]
  );
  const mountedCount = mountedSkills.length;
  const starterCount = useMemo(
    () => skillList.filter((skill) => isStarterSkill(skill, templateNameMap)).length,
    [skillList, templateNameMap]
  );

  const catalogSkills = useMemo(() => {
    const needle = catalogSearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (!needle) {
        return true;
      }
      return [template.name, template.description, template.triggerHint]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [catalogSearch, templates]);

  const activeSkillMeta = activeSkill
    ? getSkillMeta(activeSkill, mountedSkillSet, templateNameMap, t)
    : null;

  return (
    <section className="skill-panel panel-surface">
      <div className="skill-sidebar">
        <div className="section-head knowledge-head">
          <div>
            <span className="eyebrow">{t("app.skills.eyebrow")}</span>
            <h3>{t("app.skills.centerTitle")}</h3>
          </div>
          <div className="skill-header-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => skillImportInputRef.current?.click()}
              disabled={busy !== "" || loading}
            >
              {t("app.skills.import.button")}
            </button>
            <button
              type="button"
              className="solid-button"
              onClick={handleCreateSkill}
              disabled={busy !== "" || loading}
            >
              {t("app.skills.newSkill")}
            </button>
          </div>
        </div>

        <div className="skill-sidebar__status skill-sidebar__status--grid">
          <article className="skill-stat-card">
            <span>{t("app.skills.totalLabel")}</span>
            <strong>{skillList.length}</strong>
          </article>
          <article className="skill-stat-card">
            <span>{t("app.skills.enabledLabel")}</span>
            <strong>{enabledCount}</strong>
          </article>
          <article className="skill-stat-card">
            <span>{t("app.skills.mountedLabel")}</span>
            <strong>{mountedCount}</strong>
          </article>
          <article className="skill-stat-card">
            <span>{t("app.skills.starterLabel")}</span>
            <strong>{starterCount}</strong>
          </article>
        </div>

        <input
          className="field-input"
          value={skillSearch}
          onChange={(event) => setSkillSearch(event.target.value)}
          placeholder={t("app.skills.search")}
        />

        <div className="skill-filter-row">
          {FILTER_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`skill-filter-chip ${filterMode === mode ? "is-active" : ""}`}
              onClick={() => setFilterMode(mode)}
            >
              {t(`app.skills.filter.${mode}`)}
            </button>
          ))}
        </div>

        <div className="skill-list">
          {visibleSkills.length > 0 ? (
            visibleSkills.map((skill) => {
              const meta = getSkillMeta(skill, mountedSkillSet, templateNameMap, t);
              return (
                <button
                  key={skill.id}
                  type="button"
                  className={`skill-card skill-card--library ${
                    skill.id === activeSkillId ? "is-active" : ""
                  }`}
                  onClick={() => handleOpenSkill(skill.id)}
                >
                  <div className="skill-card__head">
                    <strong>{skill.name}</strong>
                    <div className="skill-card__status-group">
                      <span className={`status-chip ${skill.enabled ? "status-completed" : "status-idle"}`}>
                        {skill.enabled ? t("app.skills.enabled") : t("app.skills.disabled")}
                      </span>
                      {meta.mounted ? (
                        <span className="status-chip status-running">{t("app.skills.mounted")}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="skill-card__pill-row">
                    <span className="skill-meta-pill">{meta.sourceLabel}</span>
                    <span className="skill-meta-pill">{meta.categoryLabel}</span>
                    <span className="skill-meta-pill">{t(`app.permission.${skill.permissionLevel}`)}</span>
                  </div>

                  <p>{skill.summary}</p>

                  <div className="skill-card__meta">
                    <span>{skill.triggerHint || t("app.skills.noTriggerHint")}</span>
                    <span>{t("app.skills.updatedAt", { date: formatSkillDate(skill.updatedAt, lang) })}</span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="skill-empty-panel">
              <span className="eyebrow">{t("app.skills.title")}</span>
              <strong>{t("app.skills.filteredEmpty.title")}</strong>
              <p>{t("app.skills.filteredEmpty.description")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="skill-editor">
        <div className="knowledge-editor__toolbar">
          <div className="knowledge-editor__stamp">
            <span className="eyebrow">{t("app.skills.editor.eyebrow")}</span>
            <p>{t("app.skills.editor.description")}</p>
          </div>
          <div className="knowledge-editor__actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => handleExportSkill(activeSkill)}
              disabled={!activeSkill || busy !== "" || loading}
            >
              {t("app.skills.export.selected")}
            </button>
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

        {activeSkill && activeSkillMeta ? (
          <div className="skill-editor__form skill-editor__form--dense">
            <section className="skill-profile-card">
              <div className="skill-profile-card__head">
                <div>
                  <span className="eyebrow">{t("app.skills.profile.eyebrow")}</span>
                  <h4>{activeSkill.name}</h4>
                </div>
                <div className="skill-card__pill-row">
                  <span className="skill-meta-pill">{activeSkillMeta.sourceLabel}</span>
                  <span className="skill-meta-pill">{activeSkillMeta.categoryLabel}</span>
                </div>
              </div>
              <p>{activeSkill.description || t("app.skills.form.descriptionPlaceholder")}</p>
              <div className="skill-profile-grid">
                <article className="skill-profile-metric">
                  <span>{t("app.skills.meta.permission")}</span>
                  <strong>{t(`app.permission.${activeSkill.permissionLevel}`)}</strong>
                </article>
                <article className="skill-profile-metric">
                  <span>{t("app.skills.meta.source")}</span>
                  <strong>{activeSkillMeta.sourceLabel}</strong>
                </article>
                <article className="skill-profile-metric">
                  <span>{t("app.skills.meta.category")}</span>
                  <strong>{activeSkillMeta.categoryLabel}</strong>
                </article>
                <article className="skill-profile-metric">
                  <span>{t("app.skills.meta.updated")}</span>
                  <strong>{formatSkillDate(activeSkill.updatedAt, lang)}</strong>
                </article>
              </div>
            </section>

            <div className="skill-profile-actions">
              <div className="skill-toggle-card">
                <span>{t("app.skills.form.enabled")}</span>
                <strong>
                  {skillDraft.enabled ? t("app.skills.enabled") : t("app.skills.disabled")}
                </strong>
                <p>{t("app.skills.toggle.enabledHelp")}</p>
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
              </div>

              <div className="skill-toggle-card">
                <span>{t("app.skills.form.mountedOnSession")}</span>
                <strong>
                  {mountedSkillSet.has(activeSkill.id)
                    ? t("app.skills.mounted")
                    : t("app.skills.unmounted")}
                </strong>
                <p>{t("app.skills.toggle.mountedHelp")}</p>
                <button
                  type="button"
                  className={`toggle-pill ${mountedSkillSet.has(activeSkill.id) ? "is-on" : ""}`}
                  onClick={() => handleToggleSkillMounted(activeSkill.id)}
                  disabled={busy !== "" || loading}
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="skill-mount-banner">
              <span className="eyebrow">{t("app.skills.currentSession")}</span>
              <strong>{activeSessionTitle}</strong>
              <p>
                {mountedSkillSet.has(activeSkill.id)
                  ? t("app.skills.attached")
                  : t("app.skills.notAttached")}
              </p>
            </div>

            <div className="skill-form-grid">
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

      <aside className="skill-catalog">
        <section className="skill-catalog__panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.skills.forge.eyebrow")}</span>
              <h3>{t("app.skills.forge.title")}</h3>
            </div>
            <span className={`status-chip ${providerConfigured ? "status-running" : "status-idle"}`}>
              {providerConfigured ? t("app.skills.forge.status.ai") : t("app.skills.forge.status.local")}
            </span>
          </div>
          <p className="section-note skill-catalog__summary">
            {providerConfigured
              ? t("app.skills.forge.description.ai")
              : t("app.skills.forge.description.local")}
          </p>
          <textarea
            className="field-area skill-forge-input"
            rows={7}
            value={forgePrompt}
            onChange={(event) => setForgePrompt(event.target.value)}
            placeholder={t("app.skills.forge.placeholder")}
          />
          <div className="skill-template-card__body">
            <button
              type="button"
              className="solid-button"
              disabled={!forgePrompt.trim() || busy !== "" || loading}
              onClick={() => handleForgeSkill({ prompt: forgePrompt, mode: "new" })}
            >
              {busy === "forge-skill"
                ? t("app.skills.forge.generating")
                : t("app.skills.forge.generate")}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={!forgePrompt.trim() || !activeSkill || busy !== "" || loading}
              onClick={() => handleForgeSkill({ prompt: forgePrompt, mode: "rewrite" })}
            >
              {t("app.skills.forge.rewrite")}
            </button>
          </div>
        </section>

        <section className="skill-catalog__panel skill-catalog__panel--scroll">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.skills.history.eyebrow")}</span>
              <h3>{t("app.skills.history.title")}</h3>
            </div>
            <span className="section-note">
              {t("app.skills.history.count", { count: activeSkillVersions.length })}
            </span>
          </div>
          <p className="section-note skill-catalog__summary">
            {t("app.skills.history.description")}
          </p>
          <div className="skill-version-list">
            {activeSkill && activeSkillVersions.length > 0 ? (
              activeSkillVersions.map((version) => (
                <article key={version.versionId} className="skill-version-card">
                  <div className="skill-version-card__head">
                    <div>
                      <strong>{version.name || t("app.skills.defaultTitle")}</strong>
                      <span className="section-note">
                        {t(`app.skills.history.reason.${toHistoryReasonKey(version.reason)}`)}
                      </span>
                    </div>
                    <span className="skill-meta-pill">
                      {formatSkillDateTime(version.savedAt, lang)}
                    </span>
                  </div>

                  <p>{version.description || t("app.skills.form.descriptionPlaceholder")}</p>

                  <div className="skill-card__meta">
                    <span>{version.triggerHint || t("app.skills.noTriggerHint")}</span>
                    <span>
                      {t("app.skills.history.savedAt", {
                        date: formatSkillDateTime(version.savedAt, lang),
                      })}
                    </span>
                  </div>

                  <div className="skill-template-card__body">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleLoadSkillVersion(version)}
                      disabled={busy !== "" || loading}
                    >
                      {t("app.skills.history.loadDraft")}
                    </button>
                    <button
                      type="button"
                      className="solid-button"
                      onClick={() => handleRestoreSkillVersion(version)}
                      disabled={busy !== "" || loading}
                    >
                      {busy === "restore-skill-version"
                        ? t("app.common.saving")
                        : t("app.skills.history.restore")}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="skill-empty-panel">
                <span className="eyebrow">{t("app.skills.history.eyebrow")}</span>
                <strong>
                  {activeSkill
                    ? t("app.skills.history.emptyTitle")
                    : t("app.skills.history.selectTitle")}
                </strong>
                <p>
                  {activeSkill
                    ? t("app.skills.history.emptyDescription")
                    : t("app.skills.history.selectDescription")}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="skill-catalog__panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.skills.currentSession")}</span>
              <h3>{t("app.skills.sessionMount.title")}</h3>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={handleExportAllSkills}
              disabled={!skillList.length || busy !== "" || loading}
            >
              {t("app.skills.export.all")}
            </button>
          </div>
          <p className="section-note skill-catalog__summary">
            {t("app.skills.sessionMount.description")}
          </p>
          <div className="skill-mounted-list">
            {mountedSkills.length > 0 ? (
              mountedSkills.map((skill) => {
                const meta = getSkillMeta(skill, mountedSkillSet, templateNameMap, t);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    className="skill-mounted-card"
                    onClick={() => handleOpenSkill(skill.id)}
                  >
                    <strong>{skill.name}</strong>
                    <span>{meta.categoryLabel}</span>
                  </button>
                );
              })
            ) : (
              <div className="skill-empty-panel skill-empty-panel--compact">
                <strong>{t("app.skills.sessionMount.emptyTitle")}</strong>
                <p>{t("app.skills.sessionMount.emptyDescription")}</p>
              </div>
            )}
          </div>
        </section>

        <section className="skill-catalog__panel skill-catalog__panel--scroll">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.skills.catalog.eyebrow")}</span>
              <h3>{t("app.skills.catalog.title")}</h3>
            </div>
            <span className="section-note">
              {t("app.skills.catalog.count", { count: templates.length })}
            </span>
          </div>
          <input
            className="field-input"
            value={catalogSearch}
            onChange={(event) => setCatalogSearch(event.target.value)}
            placeholder={t("app.skills.catalog.search")}
          />
          <div className="skill-template-list">
            {catalogSkills.length > 0 ? (
              catalogSkills.map((template) => {
                const installedSkill = skillList.find(
                  (skill) => normalizeName(skill.name) === normalizeName(template.name)
                );

                return (
                  <article key={template.id} className="skill-template-card">
                    <div className="skill-template-card__head">
                      <div>
                        <strong>{template.name}</strong>
                        <p>{template.description}</p>
                      </div>
                      <div className="skill-card__pill-row">
                        <span className="skill-meta-pill">{t("app.skills.source.starter")}</span>
                        <span className="skill-meta-pill">
                          {t(`app.skills.category.${template.category}`)}
                        </span>
                      </div>
                    </div>
                    <div className="skill-template-card__body">
                      <span className="section-note">
                        {t("app.skills.catalog.triggerHint", {
                          trigger: template.triggerHint,
                        })}
                      </span>
                      <button
                        type="button"
                        className={installedSkill ? "ghost-button" : "solid-button"}
                        disabled={busy !== "" || loading}
                        onClick={() =>
                          installedSkill
                            ? handleOpenSkill(installedSkill.id)
                            : handleInstallSkillTemplate(template)
                        }
                      >
                        {installedSkill
                          ? t("app.skills.catalog.openInstalled")
                          : busy === "install-skill-template"
                            ? t("app.skills.catalog.installing")
                            : t("app.skills.catalog.install")}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="skill-empty-panel">
                <span className="eyebrow">{t("app.skills.catalog.title")}</span>
                <strong>{t("app.skills.catalog.emptyTitle")}</strong>
                <p>{t("app.skills.catalog.emptyDescription")}</p>
              </div>
            )}
          </div>
        </section>
      </aside>

      <input
        ref={skillImportInputRef}
        className="upload-input"
        type="file"
        accept="application/json,.json,.skill"
        onChange={handleImportSkills}
      />
    </section>
  );
}

function createSkillTemplates(t) {
  return [
    {
      id: "starter-note-recall",
      name: t("app.skills.templates.noteRecall.name"),
      description: t("app.skills.templates.noteRecall.description"),
      triggerHint: t("app.skills.templates.noteRecall.trigger"),
      instructions: t("app.skills.templates.noteRecall.instructions"),
      category: "memory",
    },
    {
      id: "starter-release-guard",
      name: t("app.skills.templates.releaseGuard.name"),
      description: t("app.skills.templates.releaseGuard.description"),
      triggerHint: t("app.skills.templates.releaseGuard.trigger"),
      instructions: t("app.skills.templates.releaseGuard.instructions"),
      category: "safety",
    },
    {
      id: "starter-ui-polish",
      name: t("app.skills.templates.uiPolish.name"),
      description: t("app.skills.templates.uiPolish.description"),
      triggerHint: t("app.skills.templates.uiPolish.trigger"),
      instructions: t("app.skills.templates.uiPolish.instructions"),
      category: "ui",
    },
    {
      id: "starter-research-mode",
      name: t("app.skills.templates.researchMode.name"),
      description: t("app.skills.templates.researchMode.description"),
      triggerHint: t("app.skills.templates.researchMode.trigger"),
      instructions: t("app.skills.templates.researchMode.instructions"),
      category: "research",
    },
    {
      id: "starter-task-router",
      name: t("app.skills.templates.taskRouter.name"),
      description: t("app.skills.templates.taskRouter.description"),
      triggerHint: t("app.skills.templates.taskRouter.trigger"),
      instructions: t("app.skills.templates.taskRouter.instructions"),
      category: "workflow",
    },
  ];
}

function getSkillMeta(skill, mountedSkillSet, templateNameMap, t) {
  const normalized = normalizeName(skill.name);
  const starterTemplate = templateNameMap.get(normalized);
  return {
    mounted: mountedSkillSet.has(skill.id),
    sourceLabel: starterTemplate ? t("app.skills.source.starter") : t("app.skills.source.workspace"),
    categoryLabel: starterTemplate
      ? t(`app.skills.category.${starterTemplate.category}`)
      : t(`app.skills.category.${inferCategory(skill)}`),
  };
}

function inferCategory(skill) {
  const haystack = [skill.name, skill.summary, skill.triggerHint].join(" ").toLowerCase();
  if (/(note|memory|knowledge|context|recall)/.test(haystack)) {
    return "memory";
  }
  if (/(ui|design|frontend|css|layout|motion)/.test(haystack)) {
    return "ui";
  }
  if (/(release|safe|risk|guard|migrate|destructive|security)/.test(haystack)) {
    return "safety";
  }
  if (/(research|source|cite|docs|verify)/.test(haystack)) {
    return "research";
  }
  return "workflow";
}

function isStarterSkill(skill, templateNameMap) {
  return templateNameMap.has(normalizeName(skill.name));
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function formatSkillDate(value, lang) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleDateString(lang, {
    month: "short",
    day: "numeric",
  });
}

function formatSkillDateTime(value, lang) {
  if (!value) {
    return "--";
  }

  return new Date(value).toLocaleString(lang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toHistoryReasonKey(reason) {
  if (reason === "ai-rewrite") {
    return "aiRewrite";
  }
  if (reason === "restore") {
    return "restore";
  }
  return "manualSave";
}

export default SkillWorkspace;
