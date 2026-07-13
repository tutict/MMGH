import React, { useDeferredValue, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { AppButton, AppFileInput, AppStatusChip, AppTextField } from "./ui";
import {
  buildDraftDisplay,
  buildSkillDisplay,
  buildTemplateNameMap,
  createSkillTemplates,
  findInstalledStarterSkill,
  formatSkillDate,
  formatSkillDateTime,
  getSkillMeta,
  isStarterSkill,
  normalizeStarterTemplates,
  toHistoryReasonKey,
} from "./skillWorkspaceModel";

const FILTER_MODES = ["all", "enabled", "mounted", "starter", "workspace"];
const TOOL_MODES = ["session", "generate", "history", "templates"];

function SkillWorkspace({
  activeSkill,
  activeSkillId,
  activeSkillVersions,
  activeSessionRecommendedSkills,
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
}: Record<string, any>) {
  const { lang, t } = useI18n();
  const [filterMode, setFilterMode] = useState("all");
  const [toolMode, setToolMode] = useState("session");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [forgePrompt, setForgePrompt] = useState("");
  const deferredSkillSearch = useDeferredValue(skillSearch);
  const deferredCatalogSearch = useDeferredValue(catalogSearch);

  const templates = useMemo(() => normalizeStarterTemplates(createSkillTemplates(t)), [t]);
  const templateNameMap = useMemo(() => buildTemplateNameMap(templates), [templates]);
  const mountedSkillSet = useMemo(() => new Set(mountedSkillIds), [mountedSkillIds]);

  const skillEntries = useMemo(
    () =>
      skillList.map((skill) => ({
        skill,
        display: buildSkillDisplay(skill, templateNameMap),
      })),
    [skillList, templateNameMap]
  );

  const visibleSkillEntries = useMemo(() => {
    const needle = deferredSkillSearch.trim().toLowerCase();
    return skillEntries.filter(({ skill, display }) => {
      const matchesSearch =
        !needle ||
        [display.name, display.summary, display.description, display.triggerHint]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      if (!matchesSearch) {
        return false;
      }
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
    });
  }, [deferredSkillSearch, filterMode, mountedSkillSet, skillEntries, templateNameMap]);

  const mountedSkillEntries = useMemo(
    () => skillEntries.filter(({ skill }) => mountedSkillSet.has(skill.id)),
    [mountedSkillSet, skillEntries]
  );

  const enabledCount = useMemo(
    () => skillList.filter((skill) => skill.enabled).length,
    [skillList]
  );
  const mountedCount = mountedSkillEntries.length;
  const starterCount = useMemo(
    () => skillList.filter((skill) => isStarterSkill(skill, templateNameMap)).length,
    [skillList, templateNameMap]
  );

  const catalogSkills = useMemo(() => {
    const needle = deferredCatalogSearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (!needle) {
        return true;
      }
      return [template.name, template.description, template.triggerHint]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [deferredCatalogSearch, templates]);

  const activeSkillMeta = activeSkill
    ? getSkillMeta(activeSkill, mountedSkillSet, templateNameMap, t)
    : null;
  const activeSkillDisplay = activeSkill
    ? buildSkillDisplay(activeSkill, templateNameMap)
    : null;
  const draftDisplay = activeSkill
    ? buildDraftDisplay(skillDraft, activeSkill, activeSkillMeta?.starterTemplate)
    : skillDraft;

  return (
    <section className="skills-workbench">
      <div className="skills-workbench__layout">
      <aside className="skills-registry">
        <div className="skills-registry__header">
          <div className="skills-registry__intro">
            <span className="skills-eyebrow">{t("app.skills.eyebrow")}</span>
            <h3>{t("app.skills.centerTitle")}</h3>
            <p>{t("app.skills.editor.description")}</p>
          </div>
          <div className="skills-registry__actions">
            <AppButton
              className="skills-button skills-button--secondary"
              onClick={() => skillImportInputRef.current?.click()}
              disabled={busy !== "" || loading}
            >
              {t("app.skills.import.button")}
            </AppButton>
            <AppButton
              className="skills-button skills-button--primary"
              onClick={handleCreateSkill}
              disabled={busy !== "" || loading}
            >
              {t("app.skills.newSkill")}
            </AppButton>
          </div>
        </div>

        <div className="skills-stats">
          <article className="skills-stat">
            <span>{t("app.skills.totalLabel")}</span>
            <strong>{skillList.length}</strong>
          </article>
          <article className="skills-stat">
            <span>{t("app.skills.enabledLabel")}</span>
            <strong>{enabledCount}</strong>
          </article>
          <article className="skills-stat">
            <span>{t("app.skills.mountedLabel")}</span>
            <strong>{mountedCount}</strong>
          </article>
          <article className="skills-stat">
            <span>{t("app.skills.starterLabel")}</span>
            <strong>{starterCount}</strong>
          </article>
        </div>

        <AppTextField fieldClassName="skills-input"
          value={skillSearch}
          onChange={(event) => setSkillSearch(event.target.value)}
          placeholder={t("app.skills.search")}
          size="small"
          fullWidth
        />

        <div className="skills-filters" aria-label={t("app.skills.title")}>
          {FILTER_MODES.map((mode) => (
            <AppButton
              key={mode}
              className={"skills-filter " + (filterMode === mode ? "is-selected" : "")}
              onClick={() => setFilterMode(mode)}
            >
              {t(`app.skills.filter.${mode}`)}
            </AppButton>
          ))}
        </div>

        <div className="skills-list">
          {visibleSkillEntries.length > 0 ? (
            visibleSkillEntries.map(({ skill, display }) => {
              const meta = getSkillMeta(skill, mountedSkillSet, templateNameMap, t);
              return (
                <AppButton
                  key={skill.id}
                  className={"skills-entry " + (
                    skill.id === activeSkillId ? "is-selected" : ""
                  )}
                  onClick={() => handleOpenSkill(skill.id)}
                  disabled={busy !== "" || loading}
                >
                  <div className="skills-entry__header">
                    <strong>{display.name}</strong>
                    <div className="skills-entry__badges">
                      <AppStatusChip className="skills-badge" tone={skill.enabled ? "completed" : "idle"}>
                        {skill.enabled ? t("app.skills.enabled") : t("app.skills.disabled")}
                      </AppStatusChip>
                      {meta.mounted ? (
                        <AppStatusChip className="skills-badge" tone="running">{t("app.skills.mounted")}</AppStatusChip>
                      ) : null}
                    </div>
                  </div>

                  <p>{display.summary}</p>

                  <div className="skills-entry__meta">
                    <span>{display.triggerHint || t("app.skills.noTriggerHint")}</span>
                    <span>{t("app.skills.updatedAt", { date: formatSkillDate(skill.updatedAt, lang) })}</span>
                  </div>
                </AppButton>
              );
            })
          ) : (
            <div className="skills-empty">
              <span className="skills-eyebrow">{t("app.skills.title")}</span>
              <strong>{t("app.skills.filteredEmpty.title")}</strong>
              <p>{t("app.skills.filteredEmpty.description")}</p>
            </div>
          )}
        </div>
      </aside>

      <div className="skills-editor-pane">
        <div className="skills-editor-pane__toolbar">
          <div className="skills-editor-pane__intro">
            <span className="skills-eyebrow">{t("app.skills.editor.eyebrow")}</span>
            <p>{t("app.skills.editor.description")}</p>
          </div>
          <div className="skills-editor-pane__actions">
            <AppButton
              className="skills-button skills-button--secondary"
              onClick={() => handleExportSkill(activeSkill)}
              disabled={!activeSkill || busy !== "" || loading}
            >
              {t("app.skills.export.selected")}
            </AppButton>
            <AppButton
              className="skills-button skills-button--secondary"
              onClick={handleDeleteSkill}
              disabled={!activeSkill || busy !== "" || loading}
            >
              {t("app.common.delete")}
            </AppButton>
            <AppButton
              className="skills-button skills-button--primary"
              onClick={handleSaveSkill}
              disabled={!hasUnsavedSkill || busy !== "" || loading}
            >
              {busy === "save-skill" ? t("app.common.saving") : t("app.skills.save")}
            </AppButton>
          </div>
        </div>

        {activeSkill && activeSkillMeta && activeSkillDisplay ? (
          <div className="skills-editor-pane__body">
            <section className="skills-profile">
              <div className="skills-profile__header">
                <div>
                  <span className="skills-eyebrow">{t("app.skills.profile.eyebrow")}</span>
                  <h4>{activeSkillDisplay.name}</h4>
                </div>
                <div className="skills-badges">
                  <span className="skills-badge">{activeSkillMeta.sourceLabel}</span>
                  <span className="skills-badge">{activeSkillMeta.categoryLabel}</span>
                  <span className="skills-badge">{t(`app.permission.${activeSkill.permissionLevel}`)}</span>
                </div>
              </div>
              <p>{activeSkillDisplay.description || t("app.skills.form.descriptionPlaceholder")}</p>
            </section>

            <div className="skills-controls">
              <div className="skills-controls__toggles">
                <div className="skills-control">
                  <span>{t("app.skills.form.enabled")}</span>
                  <strong>
                    {skillDraft.enabled ? t("app.skills.enabled") : t("app.skills.disabled")}
                  </strong>
                  <AppButton
                    className={"skills-switch " + (skillDraft.enabled ? "is-on" : "")}
                    aria-pressed={skillDraft.enabled}
                    disableRipple
                    onClick={() =>
                      setSkillDraft((prev) => ({
                        ...prev,
                        enabled: !prev.enabled,
                      }))
                    }
                    disabled={busy !== "" || loading}
                    aria-label={t("app.skills.form.enabled")}
                  >
                    <span />
                  </AppButton>
                </div>

                <div className="skills-control">
                  <span>{t("app.skills.form.mountedOnSession")}</span>
                  <strong>
                    {mountedSkillSet.has(activeSkill.id)
                      ? t("app.skills.mounted")
                      : t("app.skills.unmounted")}
                  </strong>
                  <AppButton
                    className={"skills-switch " + (mountedSkillSet.has(activeSkill.id) ? "is-on" : "")}
                    aria-pressed={mountedSkillSet.has(activeSkill.id)}
                    disableRipple
                    onClick={() => handleToggleSkillMounted(activeSkill.id)}
                    disabled={busy !== "" || loading || !activeSkill.enabled}
                    aria-label={t("app.skills.form.mountedOnSession")}
                  >
                    <span />
                  </AppButton>
                </div>
              </div>

              <div className="skills-session-card">
                <span className="skills-eyebrow">{t("app.skills.currentSession")}</span>
                <strong>{activeSessionTitle}</strong>
                <p>
                  {mountedSkillSet.has(activeSkill.id)
                    ? t("app.skills.attached")
                    : t("app.skills.notAttached")}
                </p>
              </div>
            </div>

            <div className="skills-field-grid">
              <label className="skills-field">
                <span>{t("app.skills.form.name")}</span>
                <AppTextField fieldClassName="skills-input"
                  value={draftDisplay.name}
                  disabled={busy !== "" || loading}
                  onChange={(event) =>
                    setSkillDraft((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t("app.skills.form.namePlaceholder")}
                  size="small"
                  fullWidth
                />
              </label>

              <label className="skills-field">
                <span>{t("app.skills.form.triggerHint")}</span>
                <AppTextField fieldClassName="skills-input"
                  value={draftDisplay.triggerHint}
                  disabled={busy !== "" || loading}
                  onChange={(event) =>
                    setSkillDraft((prev) => ({
                      ...prev,
                      triggerHint: event.target.value,
                    }))
                  }
                  placeholder={t("app.skills.form.triggerHintPlaceholder")}
                  size="small"
                  fullWidth
                />
              </label>
            </div>

            <label className="skills-field">
              <span>{t("app.skills.form.description")}</span>
              <AppTextField fieldClassName="skills-input"
                value={draftDisplay.description}
                disabled={busy !== "" || loading}
                onChange={(event) =>
                  setSkillDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder={t("app.skills.form.descriptionPlaceholder")}
                multiline
                minRows={3}
                fullWidth
              />
            </label>

            <label className="skills-field">
              <span>{t("app.skills.form.instructions")}</span>
              <AppTextField fieldClassName="skills-input"
                className="skills-input--instructions"
                value={draftDisplay.instructions}
                disabled={busy !== "" || loading}
                onChange={(event) =>
                  setSkillDraft((prev) => ({
                    ...prev,
                    instructions: event.target.value,
                  }))
                }
                placeholder={t("app.skills.form.instructionsPlaceholder")}
                multiline
                minRows={10}
                fullWidth
              />
            </label>
          </div>
        ) : (
          <div className="skills-empty skills-empty--editor">
            <span className="skills-eyebrow">{t("app.skills.title")}</span>
            <h3>{t("app.skills.emptyState.title")}</h3>
            <p>{t("app.skills.emptyState.description")}</p>
          </div>
        )}
      </div>

      <aside className="skills-toolbox">
        <div className="skills-toolbox__tabs" role="group" aria-label={t("app.skills.tools.label")}>
          {TOOL_MODES.map((mode) => (
            <AppButton
              key={mode}
              aria-pressed={toolMode === mode}
              className={"skills-toolbox__tab " + (toolMode === mode ? "is-selected" : "")}
              onClick={() => setToolMode(mode)}
            >
              {t(`app.skills.tools.${mode}`)}
            </AppButton>
          ))}
        </div>

        {toolMode === "session" ? (
          <section className="skills-toolbox__panel">
            <div className="skills-section-header">
              <div>
                <span className="skills-eyebrow">{t("app.skills.currentSession")}</span>
                <h3>{t("app.skills.sessionMount.title")}</h3>
              </div>
              <AppButton
                className="skills-button skills-button--secondary"
                onClick={handleExportAllSkills}
                disabled={!skillList.length || busy !== "" || loading}
              >
                {t("app.skills.export.all")}
              </AppButton>
            </div>
            <p className="skills-note skills-toolbox__summary">
              {t("app.skills.sessionMount.description")}
            </p>
            {activeSessionRecommendedSkills.length > 0 ? (
              <div className="skills-recommendations">
                <div className="skills-recommendations__header">
                  <span className="skills-eyebrow">{t("app.skills.sessionMount.recommendedEyebrow")}</span>
                  <strong>{t("app.skills.sessionMount.recommendedTitle")}</strong>
                </div>
                <div className="skills-recommendations__list">
                  {activeSessionRecommendedSkills.map((skill) => {
                    const meta = getSkillMeta(skill, mountedSkillSet, templateNameMap, t);
                    const display = buildSkillDisplay(skill, templateNameMap);
                    return (
                      <article key={skill.id} className="skills-recommendation">
                        <div>
                          <strong>{display.name}</strong>
                          <p>{skill.recommendationReason || display.triggerHint || t("app.skills.noTriggerHint")}</p>
                        </div>
                        <div className="skills-action-row">
                          <span className="skills-badge">{meta.categoryLabel}</span>
                          <AppButton
                            className="skills-button skills-button--primary"
                            disabled={mountedSkillSet.has(skill.id) || busy !== "" || loading}
                            onClick={() => handleToggleSkillMounted(skill.id)}
                          >
                            {mountedSkillSet.has(skill.id)
                              ? t("app.skills.mounted")
                              : t("app.skills.sessionMount.recommendedAction")}
                          </AppButton>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="skills-mounted-list">
              {mountedSkillEntries.length > 0 ? (
                mountedSkillEntries.map(({ skill, display }) => {
                  const meta = getSkillMeta(skill, mountedSkillSet, templateNameMap, t);
                  return (
                    <AppButton
                      key={skill.id}
                      className={"skills-mounted-entry " + (
                        skill.id === activeSkillId ? "is-selected" : ""
                      )}
                      onClick={() => handleOpenSkill(skill.id)}
                      disabled={busy !== "" || loading}
                    >
                      <strong>{display.name}</strong>
                      <span>{meta.categoryLabel}</span>
                    </AppButton>
                  );
                })
              ) : (
                <div className="skills-empty skills-empty--compact">
                  <strong>{t("app.skills.sessionMount.emptyTitle")}</strong>
                  <p>{t("app.skills.sessionMount.emptyDescription")}</p>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {toolMode === "generate" ? (
          <section className="skills-toolbox__panel">
            <div className="skills-section-header">
              <div>
                <span className="skills-eyebrow">{t("app.skills.forge.eyebrow")}</span>
                <h3>{t("app.skills.forge.title")}</h3>
              </div>
              <AppStatusChip className="skills-badge" tone={providerConfigured ? "running" : "idle"}>
                {providerConfigured ? t("app.skills.forge.status.ai") : t("app.skills.forge.status.local")}
              </AppStatusChip>
            </div>
            <p className="skills-note skills-toolbox__summary">
              {providerConfigured
                ? t("app.skills.forge.description.ai")
                : t("app.skills.forge.description.local")}
            </p>
            <AppTextField fieldClassName="skills-input"
              className="skills-input--forge"
              value={forgePrompt}
              disabled={busy !== "" || loading}
              onChange={(event) => setForgePrompt(event.target.value)}
              placeholder={t("app.skills.forge.placeholder")}
              multiline
              minRows={7}
              fullWidth
            />
            <div className="skills-action-row">
              <AppButton
                className="skills-button skills-button--primary"
                disabled={!forgePrompt.trim() || busy !== "" || loading}
                onClick={() => handleForgeSkill({ prompt: forgePrompt, mode: "new" })}
              >
                {busy === "forge-skill"
                  ? t("app.skills.forge.generating")
                  : t("app.skills.forge.generate")}
              </AppButton>
              <AppButton
                className="skills-button skills-button--secondary"
                disabled={!forgePrompt.trim() || !activeSkill || busy !== "" || loading}
                onClick={() => handleForgeSkill({ prompt: forgePrompt, mode: "rewrite" })}
              >
                {t("app.skills.forge.rewrite")}
              </AppButton>
            </div>
          </section>
        ) : null}

        {toolMode === "history" ? (
          <section className="skills-toolbox__panel skills-toolbox__panel--scroll">
            <div className="skills-section-header">
              <div>
                <span className="skills-eyebrow">{t("app.skills.history.eyebrow")}</span>
                <h3>{t("app.skills.history.title")}</h3>
              </div>
              <span className="skills-note">
                {t("app.skills.history.count", { count: activeSkillVersions.length })}
              </span>
            </div>
            <p className="skills-note skills-toolbox__summary">
              {t("app.skills.history.description")}
            </p>
            <div className="skills-history-list">
              {activeSkill && activeSkillVersions.length > 0 ? (
                activeSkillVersions.map((version) => (
                  <article key={version.versionId} className="skills-history-entry">
                    <div className="skills-history-entry__header">
                      <div>
                        <strong>{version.name || t("app.skills.defaultTitle")}</strong>
                        <span className="skills-note">
                          {t(`app.skills.history.reason.${toHistoryReasonKey(version.reason)}`)}
                        </span>
                      </div>
                      <span className="skills-badge">
                        {formatSkillDateTime(version.savedAt, lang)}
                      </span>
                    </div>

                    <p>{version.description || t("app.skills.form.descriptionPlaceholder")}</p>

                    <div className="skills-entry__meta">
                      <span>{version.triggerHint || t("app.skills.noTriggerHint")}</span>
                      <span>
                        {t("app.skills.history.savedAt", {
                          date: formatSkillDateTime(version.savedAt, lang),
                        })}
                      </span>
                    </div>

                    <div className="skills-action-row">
                      <AppButton
                        className="skills-button skills-button--secondary"
                        onClick={() => handleLoadSkillVersion(version)}
                        disabled={busy !== "" || loading}
                      >
                        {t("app.skills.history.loadDraft")}
                      </AppButton>
                      <AppButton
                        className="skills-button skills-button--primary"
                        onClick={() => handleRestoreSkillVersion(version)}
                        disabled={busy !== "" || loading}
                      >
                        {busy === "restore-skill-version"
                          ? t("app.common.saving")
                          : t("app.skills.history.restore")}
                      </AppButton>
                    </div>
                  </article>
                ))
              ) : (
                <div className="skills-empty">
                  <span className="skills-eyebrow">{t("app.skills.history.eyebrow")}</span>
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
        ) : null}

        {toolMode === "templates" ? (
          <section className="skills-toolbox__panel skills-toolbox__panel--scroll">
            <div className="skills-section-header">
              <div>
                <span className="skills-eyebrow">{t("app.skills.catalog.eyebrow")}</span>
                <h3>{t("app.skills.catalog.title")}</h3>
              </div>
              <span className="skills-note">
                {t("app.skills.catalog.count", { count: templates.length })}
              </span>
            </div>
            <AppTextField fieldClassName="skills-input"
              value={catalogSearch}
              onChange={(event) => setCatalogSearch(event.target.value)}
              placeholder={t("app.skills.catalog.search")}
              size="small"
              fullWidth
            />
            <div className="skills-template-list">
              {catalogSkills.length > 0 ? (
                catalogSkills.map((template) => {
                  const installedSkill = findInstalledStarterSkill(template, skillList);

                  return (
                    <article key={template.id} className="skills-template">
                      <div className="skills-template__header">
                        <div>
                          <strong>{template.name}</strong>
                          <p>{template.description}</p>
                        </div>
                        <div className="skills-badges">
                          <span className="skills-badge">{t("app.skills.source.starter")}</span>
                          <span className="skills-badge">
                            {t(`app.skills.category.${template.category}`)}
                          </span>
                        </div>
                      </div>
                      <div className="skills-action-row">
                        <span className="skills-note">
                          {t("app.skills.catalog.triggerHint", {
                            trigger: template.triggerHint,
                          })}
                        </span>
                        <AppButton
                          className={"skills-button " + (installedSkill ? "skills-button--secondary" : "skills-button--primary")}
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
                        </AppButton>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="skills-empty">
                  <span className="skills-eyebrow">{t("app.skills.catalog.title")}</span>
                  <strong>{t("app.skills.catalog.emptyTitle")}</strong>
                  <p>{t("app.skills.catalog.emptyDescription")}</p>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </aside>
      </div>

      <AppFileInput ref={skillImportInputRef}
        accept="application/json,.json,.skill"
        onChange={handleImportSkills}
      />
    </section>
  );
}

function areSkillWorkspacePropsEqual(previousProps: Record<string, any>, nextProps: Record<string, any>) {
  return (
    previousProps.activeSkill === nextProps.activeSkill &&
    previousProps.activeSkillId === nextProps.activeSkillId &&
    previousProps.activeSkillVersions === nextProps.activeSkillVersions &&
    previousProps.activeSessionRecommendedSkills === nextProps.activeSessionRecommendedSkills &&
    previousProps.activeSessionTitle === nextProps.activeSessionTitle &&
    previousProps.busy === nextProps.busy &&
    previousProps.hasUnsavedSkill === nextProps.hasUnsavedSkill &&
    previousProps.loading === nextProps.loading &&
    previousProps.mountedSkillIds === nextProps.mountedSkillIds &&
    previousProps.providerConfigured === nextProps.providerConfigured &&
    previousProps.skillActionContextKey === nextProps.skillActionContextKey &&
    previousProps.skillDraft === nextProps.skillDraft &&
    previousProps.skillImportInputRef === nextProps.skillImportInputRef &&
    previousProps.skillList === nextProps.skillList &&
    previousProps.skillSearch === nextProps.skillSearch
  );
}

export default React.memo(SkillWorkspace, areSkillWorkspacePropsEqual);



