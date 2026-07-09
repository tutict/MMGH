import React from "react";
import { useI18n } from "../i18n";
import { AppButton, AppStatusChip, AppTextField } from "./ui";

function SettingsWorkspace({
  busy,
  cacheCards,
  handleSaveSettings,
  handleClearApiKey,
  hasUnsavedSettings,
  providerConfigured,
  providerSecurityMessage,
  providerSecurityStatus,
  settingsForm,
  setSettingsForm,
}) {
  const { t } = useI18n();

  return (
    <section className="settings-workspace">
      <div className="settings-workspace__hero panel-surface">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t("app.settings.page.eyebrow")}</span>
            <h3>{t("app.settings.page.title")}</h3>
          </div>
          <div className="settings-summary__chips">
            <AppStatusChip tone={providerConfigured ? "completed" : "warning"}>
              {t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}
            </AppStatusChip>
            <AppStatusChip tone={hasUnsavedSettings ? "running" : "idle"}>
              {t(`app.common.${hasUnsavedSettings ? "dirty" : "saved"}`)}
            </AppStatusChip>
          </div>
        </div>
        <p className="section-note settings-workspace__note">
          {t("app.settings.page.description")}
        </p>
      </div>

      <div className="settings-workspace__grid">
        <section className="panel-surface settings-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.settings.eyebrow")}</span>
              <h3>{t("app.settings.title")}</h3>
            </div>
          </div>

          <form className="settings-form" onSubmit={handleSaveSettings}>
            <div className="settings-form__grid">
              <label className="settings-form__card settings-form__card--compact">
                <span>{t("app.settings.providerName")}</span>
                <AppTextField
                  value={settingsForm.providerName || ""}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      providerName: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </label>
              <label className="settings-form__card settings-form__card--compact">
                <span>{t("app.settings.model")}</span>
                <AppTextField
                  value={settingsForm.model || ""}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      model: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
              </label>
              <label className="settings-form__card settings-form__card--wide">
                <span>{t("app.settings.baseUrl")}</span>
                <AppTextField
                  value={settingsForm.baseUrl || ""}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      baseUrl: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
                {providerSecurityMessage ? (
                  <span
                    className={`section-note ${
                      providerSecurityStatus === "blocked" ? "danger-copy" : ""
                    }`}
                  >
                    {providerSecurityMessage}
                  </span>
                ) : null}
              </label>
              <label className="settings-form__card settings-form__card--wide">
                <span>{t("app.settings.apiKey")}</span>
                <AppTextField
                  type="password"
                  value={settingsForm.apiKey || ""}
                  placeholder={
                    settingsForm.clearApiKey
                      ? t("app.settings.apiKeyPlaceholder.clearing")
                      : settingsForm.hasApiKey
                      ? t("app.settings.apiKeyPlaceholder.keep")
                      : t("app.settings.apiKeyPlaceholder.enter")
                  }
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      clearApiKey: false,
                      apiKey: event.target.value,
                    }))
                  }
                  size="small"
                  fullWidth
                />
                <span className="section-note">
                  {settingsForm.clearApiKey
                    ? t("app.settings.apiKeyHint.clearing")
                    : settingsForm.hasApiKey
                    ? t("app.settings.apiKeyHint.keep")
                    : t("app.settings.apiKeyHint.missing")}
                </span>
                {(settingsForm.hasApiKey || settingsForm.clearApiKey) && (
                  <AppButton
                    className={`ghost-button ${settingsForm.clearApiKey ? "danger-button" : ""}`}
                    onClick={handleClearApiKey}
                  >
                    {settingsForm.clearApiKey
                      ? t("app.settings.apiKeyAction.undoClear")
                      : t("app.settings.apiKeyAction.clear")}
                  </AppButton>
                )}
              </label>
            </div>

            <label className="settings-form__card settings-form__card--prompt">
              <span>{t("app.settings.systemPrompt")}</span>
              <AppTextField
                className="settings-form__prompt"
                value={settingsForm.systemPrompt || ""}
                onChange={(event) =>
                  setSettingsForm((prev) => ({
                    ...prev,
                    systemPrompt: event.target.value,
                  }))
                }
                multiline
                minRows={6}
                fullWidth
              />
            </label>

            <div className="settings-form__footer">
              <p className="section-note">{t("app.hero.settingsHint")}</p>
              <AppButton
                type="submit"
                className="solid-button"
                disabled={busy !== "" || !hasUnsavedSettings}
              >
                {busy === "save-settings" ? t("app.common.saving") : t("app.settings.save")}
              </AppButton>
            </div>
          </form>
        </section>

        <section className="panel-surface settings-cache-panel">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t("app.settings.cache.eyebrow")}</span>
              <h3>{t("app.settings.cache.title")}</h3>
            </div>
          </div>

          <p className="section-note settings-cache-panel__description">
            {t("app.settings.cache.description")}
          </p>

          <div className="cache-grid">
            {cacheCards.map((card) => (
              <article key={card.id} className="cache-card">
                <div className="cache-card__head">
                  <div>
                    <strong>{card.title}</strong>
                    <span className="section-note">{card.summary}</span>
                  </div>
                  <AppStatusChip tone="idle">{card.countLabel}</AppStatusChip>
                </div>
                <p>{card.description}</p>
                <AppButton
                  className={`ghost-button ${card.danger ? "danger-button" : ""}`}
                  onClick={card.onClear}
                >
                  {card.buttonLabel}
                </AppButton>
              </article>
            ))}
          </div>

          <p className="section-note settings-cache-panel__safe-note">
            {t("app.settings.cache.safeNote")}
          </p>
        </section>
      </div>
    </section>
  );
}

export default React.memo(SettingsWorkspace);
