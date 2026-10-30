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
  setLang = undefined,
  setSettingsForm,
  setTheme = undefined,
  theme = "light",
}) {
  const { lang, t } = useI18n();
  const showPreferences = Boolean(setTheme || setLang);

  return (
    <section className="settings-workspace">
      <div className="desk-settings">
        {showPreferences ? (
          <section className="settings-section">
            <div className="section-head">
              <h2>{t("app.settings.appearance.title")}</h2>
            </div>

            <div className="settings-pref-row">
              <span className="settings-pref-row__label">{t("app.settings.appearance.theme")}</span>
              <div className="settings-segments" role="group" aria-label={t("app.settings.appearance.theme")}>
                {setTheme ? (
                  <>
                    <AppButton
                      className={`settings-segment ${theme === "light" ? "is-selected" : ""}`}
                      aria-pressed={theme === "light"}
                      onClick={() => setTheme("light")}
                    >
                      {t("app.theme.light")}
                    </AppButton>
                    <AppButton
                      className={`settings-segment ${theme === "dark" ? "is-selected" : ""}`}
                      aria-pressed={theme === "dark"}
                      onClick={() => setTheme("dark")}
                    >
                      {t("app.theme.dark")}
                    </AppButton>
                  </>
                ) : null}
              </div>
            </div>

            <div className="settings-pref-row">
              <span className="settings-pref-row__label">{t("app.language.label")}</span>
              <div className="settings-segments" role="group" aria-label={t("app.language.label")}>
                {setLang ? (
                  <>
                    <AppButton
                      className={`settings-segment ${lang === "zh-CN" ? "is-selected" : ""}`}
                      aria-pressed={lang === "zh-CN"}
                      onClick={() => setLang("zh-CN")}
                    >
                      中文
                    </AppButton>
                    <AppButton
                      className={`settings-segment ${lang === "en-US" ? "is-selected" : ""}`}
                      aria-pressed={lang === "en-US"}
                      onClick={() => setLang("en-US")}
                    >
                      English
                    </AppButton>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="settings-section">
          <div className="section-head">
            <h2>{t("app.settings.title")}</h2>
            <AppStatusChip tone={providerConfigured ? "completed" : "warning"}>
              {t(`app.provider.${providerConfigured ? "configured" : "pending"}`)}
            </AppStatusChip>
          </div>

          <form className="settings-form" onSubmit={handleSaveSettings}>
            <div className="settings-form__grid">
              <label className="settings-field">
                <span className="field-label">{t("app.settings.providerName")}</span>
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
              <label className="settings-field">
                <span className="field-label">{t("app.settings.model")}</span>
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
              <label className="settings-field settings-field--wide">
                <span className="field-label">{t("app.settings.baseUrl")}</span>
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
                    className={`field-hint ${
                      providerSecurityStatus === "blocked" ? "danger-copy" : ""
                    }`}
                  >
                    {providerSecurityMessage}
                  </span>
                ) : null}
              </label>
              <label className="settings-field settings-field--wide">
                <span className="field-label">{t("app.settings.apiKey")}</span>
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
                <span className="field-hint">
                  {settingsForm.clearApiKey
                    ? t("app.settings.apiKeyHint.clearing")
                    : settingsForm.hasApiKey
                    ? t("app.settings.apiKeyHint.keep")
                    : t("app.settings.apiKeyHint.missing")}
                </span>
                {settingsForm.hasApiKey || settingsForm.clearApiKey ? (
                  <span className="settings-key-actions">
                    <AppButton
                      className={`ghost-button ${settingsForm.clearApiKey ? "danger-button" : ""}`}
                      onClick={handleClearApiKey}
                    >
                      {settingsForm.clearApiKey
                        ? t("app.settings.apiKeyAction.undoClear")
                        : t("app.settings.apiKeyAction.clear")}
                    </AppButton>
                  </span>
                ) : null}
              </label>
            </div>

            <label className="settings-field">
              <span className="field-label">{t("app.settings.systemPrompt")}</span>
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
              <span className="field-hint">{t("app.hero.settingsHint")}</span>
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

        <section className="settings-section">
          <div className="section-head">
            <h2>{t("app.settings.cache.title")}</h2>
          </div>
          <p className="section-note">{t("app.settings.cache.description")}</p>

          <div className="desk-list">
            {cacheCards.map((card) => (
              <div key={card.id} className="desk-row settings-cache-row">
                <div className="settings-cache-row__copy">
                  <strong>{card.title}</strong>
                  <span className="desk-row__meta">
                    <span>{card.summary}</span>
                    <span>{card.countLabel}</span>
                  </span>
                </div>
                <AppButton
                  className={`ghost-button ${card.danger ? "danger-button" : ""}`}
                  onClick={card.onClear}
                >
                  {card.buttonLabel}
                </AppButton>
              </div>
            ))}
          </div>

          <p className="field-hint">{t("app.settings.cache.safeNote")}</p>
        </section>
      </div>
    </section>
  );
}

export default React.memo(SettingsWorkspace);
