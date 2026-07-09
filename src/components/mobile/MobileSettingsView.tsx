import React, { useMemo, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";
import { AppTextField, MobileButton, MobileForm, MobileInlineWarning, MobileList, MobileMuted, MobilePage, MobileRow, MobileRowBody, MobileRowButton, MobileSection, MobileSectionHead, MobileStatusDot, MobileSummaryCell, MobileSummaryGrid } from "../ui";

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
  settingsForm = {},
  setSettingsForm,
  t,
}: Record<string, any>) {
  const [providerOpen, setProviderOpen] = useState(false);
  const [cacheTarget, setCacheTarget] = useState(null);
  const providerStateKey = providerConfigured ? "configured" : "pending";
  const settingsStateKey = hasUnsavedSettings ? "dirty" : "saved";
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
      <MobileSection flush>
        <MobileSectionHead>
          <div>
            <span className="mobile-eyebrow">{t("app.settings.page.eyebrow")}</span>
            <h1>{t("app.settings.page.title")}</h1>
          </div>
          <MobileButton
            mobileAction="secondary"
            onClick={() => setProviderOpen(true)}
            variant="outlined"
            size="small"
          >
            {t("app.settings.title")}
          </MobileButton>
        </MobileSectionHead>

        <MobileSummaryGrid aria-label={t("app.settings.page.title")}>
          <MobileSummaryCell>
            <span>{t("app.view.settings.badge.gateway")}</span>
            <strong>{t(`app.provider.${providerStateKey}`)}</strong>
          </MobileSummaryCell>
          <MobileSummaryCell>
            <span>{t("app.view.settings.badge.state")}</span>
            <strong>{t(`app.common.${settingsStateKey}`)}</strong>
          </MobileSummaryCell>
          <MobileSummaryCell>
            <span>{t("app.settings.cache.title")}</span>
            <strong>{t("app.settings.cache.groupCount", { count: cacheCount })}</strong>
          </MobileSummaryCell>
        </MobileSummaryGrid>
      </MobileSection>

      <MobileSection>
        <MobileSectionHead line>
          <h2>{t("app.settings.title")}</h2>
          <MobileStatusDot tone={providerSecurityStatus || "ready"} />
        </MobileSectionHead>
        <MobileList variant="inset">
          <SummaryRow label={t("app.settings.providerName")} value={settingsForm.providerName} />
          <SummaryRow label={t("app.settings.model")} value={settingsForm.model} />
          <SummaryRow label={t("app.settings.baseUrl")} value={settingsForm.baseUrl} />
        </MobileList>
        {providerSecurityMessage ? (
          <MobileInlineWarning danger={providerSecurityStatus === "blocked"}>
            {providerSecurityMessage}
          </MobileInlineWarning>
        ) : null}
      </MobileSection>

      <MobileSection>
        <MobileSectionHead line>
          <div>
            <span className="mobile-eyebrow">{t("app.settings.cache.eyebrow")}</span>
            <h2>{t("app.settings.cache.title")}</h2>
          </div>
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
          <AppTextField fieldClassName="mobile-field"
            label={t("app.settings.providerName")}
            value={settingsForm.providerName || ""}
            onChange={updateField("providerName")}
            variant="outlined"
            size="small"
            fullWidth
          />
          <AppTextField fieldClassName="mobile-field"
            label={t("app.settings.model")}
            value={settingsForm.model || ""}
            onChange={updateField("model")}
            variant="outlined"
            size="small"
            fullWidth
          />
          <AppTextField fieldClassName="mobile-field"
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
          <AppTextField fieldClassName="mobile-field"
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
          <AppTextField fieldClassName="mobile-field"
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
    <MobileRow variant="summary">
      <MobileRowBody>
        <strong>{label}</strong>
        <span>{value || "--"}</span>
      </MobileRowBody>
    </MobileRow>
  );
}

export default MobileSettingsView;



