import React, { useMemo, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";
import { AppTextField, MobileButton, MobileStatusDot } from "../ui";

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
    <section className="mobile-page mobile-page--settings">
      <section className="mobile-section mobile-section--flush">
        <div className="mobile-section__head">
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
        </div>

        <div className="mobile-summary-grid" aria-label={t("app.settings.page.title")}>
          <article className="mobile-summary-cell">
            <span>{t("app.view.settings.badge.gateway")}</span>
            <strong>{t(`app.provider.${providerStateKey}`)}</strong>
          </article>
          <article className="mobile-summary-cell">
            <span>{t("app.view.settings.badge.state")}</span>
            <strong>{t(`app.common.${settingsStateKey}`)}</strong>
          </article>
          <article className="mobile-summary-cell">
            <span>{t("app.settings.cache.title")}</span>
            <strong>{t("app.settings.cache.groupCount", { count: cacheCount })}</strong>
          </article>
        </div>
      </section>

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <h2>{t("app.settings.title")}</h2>
          <MobileStatusDot tone={providerSecurityStatus || "ready"} />
        </div>
        <div className="mobile-list mobile-list--inset">
          <SummaryRow label={t("app.settings.providerName")} value={settingsForm.providerName} />
          <SummaryRow label={t("app.settings.model")} value={settingsForm.model} />
          <SummaryRow label={t("app.settings.baseUrl")} value={settingsForm.baseUrl} />
        </div>
        {providerSecurityMessage ? (
          <p
            className={`mobile-inline-warning ${
              providerSecurityStatus === "blocked" ? "is-danger" : ""
            }`}
          >
            {providerSecurityMessage}
          </p>
        ) : null}
      </section>

      <section className="mobile-section">
        <div className="mobile-section__head mobile-section__head--line">
          <div>
            <span className="mobile-eyebrow">{t("app.settings.cache.eyebrow")}</span>
            <h2>{t("app.settings.cache.title")}</h2>
          </div>
        </div>
        <p className="mobile-muted">{t("app.settings.cache.description")}</p>
        <div className="mobile-list">
          {cacheCards.map((card) => (
            <MobileButton
              key={card.id}
              variant="text"
              className={`mobile-row mobile-cache-row ${card.danger ? "is-danger" : ""}`}
              onClick={() => setCacheTarget(card)}
            >
              <span className="mobile-row__body">
                <strong>{card.title}</strong>
                <span>{card.summary}</span>
              </span>
              <small>{card.countLabel}</small>
            </MobileButton>
          ))}
        </div>
        <p className="mobile-muted">{t("app.settings.cache.safeNote")}</p>
      </section>

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
        <form
          id="mobile-settings-provider-form"
          className="mobile-form mobile-settings-form"
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
            <p
              className={`mobile-inline-warning ${
                providerSecurityStatus === "blocked" ? "is-danger" : ""
              }`}
            >
              {providerSecurityMessage}
            </p>
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
        </form>
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
          <p className="mobile-muted">{t("app.settings.cache.safeNote")}</p>
        </div>
      </MobileSheet>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="mobile-row mobile-summary-row">
      <span className="mobile-row__body">
        <strong>{label}</strong>
        <span>{value || "--"}</span>
      </span>
    </div>
  );
}

export default MobileSettingsView;



