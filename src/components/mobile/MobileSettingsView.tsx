import EditRoundedIcon from "@mui/icons-material/EditRounded";
import React, { useMemo, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";
import { AppIconButton, MobileTextField, MobileButton, MobileForm, MobileInlineWarning, MobileList, MobileMuted, MobilePage, MobileRow, MobileRowBody, MobileRowButton, MobileSection, MobileSectionHead, MobileStatusDot } from "../ui";

function MobileSettingsView({
  busy,
  cacheCards = [],
  handleClearApiKey,
  handleSaveSettings,
  hasUnsavedSettings,
  lang,
  providerConfigured,
  providerSecurityMessage,
  providerSecurityStatus,
  setLang,
  setTheme,
  settingsForm = {},
  setSettingsForm,
  t,
  theme,
}: Record<string, any>) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [cacheTarget, setCacheTarget] = useState(null);
  const providerStateKey = providerConfigured ? "configured" : "pending";
  const cacheCount = useMemo(() => cacheCards.length, [cacheCards]);

  const updateField = (field) => (event) => {
    const nextValue = event.target.value;
    setSettingsForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const updateApiKey = (event) => {
    const nextValue = event.target.value;
    setSettingsForm((prev) => ({
      ...prev,
      apiKey: nextValue,
      clearApiKey: false,
    }));
  };

  const clearCacheTarget = async () => {
    const target = cacheTarget;
    if (!target?.onClear) {
      setCacheTarget(null);
      return;
    }

    await target.onClear();
    setCacheTarget(null);
  };

  return (
    <MobilePage view="settings">
      {setLang || setTheme ? (
        <MobileSection>
          <MobileSectionHead line>
            <h2>{t("app.hero.appearance")}</h2>
          </MobileSectionHead>
          <MobileList variant="inset">
            {setLang ? (
              <MobileRow>
                <MobileRowBody>
                  <strong>{t("app.language.label")}</strong>
                </MobileRowBody>
                <div className="mobile-segmented" role="group" aria-label={t("app.language.label")}>
                  <MobileButton
                    className={lang === "zh-CN" ? "is-active" : ""}
                    variant="text"
                    aria-pressed={lang === "zh-CN"}
                    onClick={() => setLang("zh-CN")}
                  >
                    中文
                  </MobileButton>
                  <MobileButton
                    className={lang === "en-US" ? "is-active" : ""}
                    variant="text"
                    aria-pressed={lang === "en-US"}
                    onClick={() => setLang("en-US")}
                  >
                    EN
                  </MobileButton>
                </div>
              </MobileRow>
            ) : null}
            {setTheme ? (
              <MobileRow>
                <MobileRowBody>
                  <strong>{mobileText(lang, "theme")}</strong>
                </MobileRowBody>
                <div className="mobile-segmented" role="group" aria-label={mobileText(lang, "theme")}>
                  <MobileButton
                    className={theme === "light" ? "is-active" : ""}
                    variant="text"
                    aria-pressed={theme === "light"}
                    onClick={() => setTheme("light")}
                  >
                    {t("app.theme.light")}
                  </MobileButton>
                  <MobileButton
                    className={theme === "dark" ? "is-active" : ""}
                    variant="text"
                    aria-pressed={theme === "dark"}
                    onClick={() => setTheme("dark")}
                  >
                    {t("app.theme.dark")}
                  </MobileButton>
                </div>
              </MobileRow>
            ) : null}
          </MobileList>
        </MobileSection>
      ) : null}

      <MobileSection>
        <MobileSectionHead line>
          <div className="mobile-settings__provider-head">
            <h2>{t("app.settings.title")}</h2>
            <span className="mobile-settings__provider-state">
              <MobileStatusDot tone={providerConfigured ? "success" : "warning"} />
              <span>{t(`app.provider.${providerStateKey}`)}</span>
            </span>
          </div>
          <AppIconButton
            className="mobile-settings__edit"
            onClick={() => setProviderOpen(true)}
            aria-label={t("app.settings.title")}
          >
            <EditRoundedIcon fontSize="small" aria-hidden="true" />
          </AppIconButton>
        </MobileSectionHead>
        <MobileList variant="inset">
          <SummaryRow label={t("app.settings.providerName")} value={settingsForm.providerName} />
          <SummaryRow label={t("app.settings.model")} value={settingsForm.model} />
          <SummaryRow label={t("app.settings.baseUrl")} value={settingsForm.baseUrl} />
        </MobileList>
      </MobileSection>

      <MobileSection>
        <MobileSectionHead line>
          <div>
            <h2>{t("app.settings.cache.title")}</h2>
          </div>
          <span className="mobile-section__count">{cacheCount}</span>
        </MobileSectionHead>
        <MobileMuted>{t("app.settings.cache.description")}</MobileMuted>
        <MobileList>
          {cacheCards.map((card) => (
            <MobileRowButton
              key={card.id}
              onClick={() => setCacheTarget(card)}
              rowVariant="cache"
              className={card.danger ? "is-danger" : undefined}
            >
              <MobileRowBody>
                <strong>{card.title}</strong>
                <span>{card.summary}</span>
              </MobileRowBody>
              <small>{card.countLabel}</small>
            </MobileRowButton>
          ))}
        </MobileList>
        <MobileMuted>{t("app.settings.cache.safeNote")}</MobileMuted>
      </MobileSection>

      <MobileSheet
        id="mobile-settings-provider-sheet"
        open={providerOpen}
        onClose={() => setProviderOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={t("app.settings.title")}
        eyebrow={t("app.settings.eyebrow")}
        actions={
          <>
            <MobileButton
              mobileAction="secondary"
              onClick={() => setProviderOpen(false)}
              variant="outlined"
            >
              {t("app.common.cancel")}
            </MobileButton>
            <MobileButton
              type="submit"
              form="mobile-settings-provider-form"
              mobileAction="primary"
              disabled={busy !== "" || !hasUnsavedSettings}
              variant="contained"
            >
              {busy === "save-settings" ? t("app.common.saving") : t("app.settings.save")}
            </MobileButton>
          </>
        }
      >
        <MobileForm
          as="form"
          id="mobile-settings-provider-form"
          className="mobile-settings-form"
          onSubmit={handleSaveSettings}
        >
          <MobileTextField
            label={t("app.settings.providerName")}
            value={settingsForm.providerName || ""}
            onChange={updateField("providerName")}
            variant="outlined"
            size="small"
            fullWidth
          />
          <MobileTextField
            label={t("app.settings.model")}
            value={settingsForm.model || ""}
            onChange={updateField("model")}
            variant="outlined"
            size="small"
            fullWidth
          />
          <MobileTextField
            label={t("app.settings.baseUrl")}
            value={settingsForm.baseUrl || ""}
            onChange={updateField("baseUrl")}
            variant="outlined"
            size="small"
            fullWidth
          />
          {providerSecurityMessage ? (
            <MobileInlineWarning danger={providerSecurityStatus === "blocked"}>
              {providerSecurityMessage}
            </MobileInlineWarning>
          ) : null}
          <MobileTextField
            type="password"
            label={t("app.settings.apiKey")}
            value={settingsForm.apiKey || ""}
            placeholder={
              settingsForm.clearApiKey
                ? t("app.settings.apiKeyPlaceholder.clearing")
                : settingsForm.hasApiKey
                  ? t("app.settings.apiKeyPlaceholder.keep")
                  : t("app.settings.apiKeyPlaceholder.enter")
            }
            onChange={updateApiKey}
            variant="outlined"
            size="small"
            fullWidth
          />
          <div className="mobile-field-note">
            <span>
              {settingsForm.clearApiKey
                ? t("app.settings.apiKeyHint.clearing")
                : settingsForm.hasApiKey
                  ? t("app.settings.apiKeyHint.keep")
                  : t("app.settings.apiKeyHint.missing")}
            </span>
            {settingsForm.hasApiKey || settingsForm.clearApiKey ? (
              <MobileButton
                mobileAction="secondary"
                className={settingsForm.clearApiKey ? "is-danger" : undefined}
                onClick={handleClearApiKey}
                variant="outlined"
                color={settingsForm.clearApiKey ? "error" : "primary"}
                size="small"
              >
                {settingsForm.clearApiKey
                  ? t("app.settings.apiKeyAction.undoClear")
                  : t("app.settings.apiKeyAction.clear")}
              </MobileButton>
            ) : null}
          </div>
          <MobileTextField
            label={t("app.settings.systemPrompt")}
            value={settingsForm.systemPrompt || ""}
            onChange={updateField("systemPrompt")}
            variant="outlined"
            size="small"
            fullWidth
            multiline
            minRows={4}
          />
        </MobileForm>
      </MobileSheet>

      <MobileSheet
        id="mobile-settings-cache-sheet"
        open={Boolean(cacheTarget)}
        onClose={() => setCacheTarget(null)}
        closeLabel={mobileText(lang, "close")}
        title={cacheTarget?.title || t("app.settings.cache.title")}
        eyebrow={t("app.settings.cache.eyebrow")}
        actions={
          <>
            <MobileButton
              mobileAction="secondary"
              onClick={() => setCacheTarget(null)}
              variant="outlined"
            >
              {t("app.common.cancel")}
            </MobileButton>
            <MobileButton
              mobileAction={cacheTarget?.danger ? "danger" : "primary"}
              onClick={() => void clearCacheTarget()}
              disabled={busy !== ""}
              variant={cacheTarget?.danger ? "outlined" : "contained"}
              color={cacheTarget?.danger ? "error" : "primary"}
            >
              {cacheTarget?.buttonLabel || t("app.settings.cache.clear")}
            </MobileButton>
          </>
        }
      >
        <div className="mobile-cache-confirm">
          <strong>{cacheTarget?.summary}</strong>
          <p>{cacheTarget?.description}</p>
          <MobileMuted>{t("app.settings.cache.safeNote")}</MobileMuted>
        </div>
      </MobileSheet>
    </MobilePage>
  );
}

function SummaryRow({ label, value }) {
  return (
    <MobileRow>
      <MobileRowBody>
        <strong>{label}</strong>
        <span>{value || "--"}</span>
      </MobileRowBody>
    </MobileRow>
  );
}

export default MobileSettingsView;
