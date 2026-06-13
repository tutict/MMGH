import React, { useMemo, useState } from "react";
import MobileSheet from "./MobileSheet";
import { mobileText } from "./mobileText";

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
}) {
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
          <button
            type="button"
            className="mobile-secondary-action"
            onClick={() => setProviderOpen(true)}
          >
            {t("app.settings.title")}
          </button>
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
          <span className={`mobile-status-dot is-${providerSecurityStatus || "ready"}`} />
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
            <button
              key={card.id}
              type="button"
              className={`mobile-row mobile-cache-row ${card.danger ? "is-danger" : ""}`}
              onClick={() => setCacheTarget(card)}
            >
              <span className="mobile-row__body">
                <strong>{card.title}</strong>
                <span>{card.summary}</span>
              </span>
              <small>{card.countLabel}</small>
            </button>
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
            <button
              type="button"
              className="mobile-secondary-action"
              onClick={() => setProviderOpen(false)}
            >
              {t("app.common.cancel")}
            </button>
            <button
              type="submit"
              form="mobile-settings-provider-form"
              className="mobile-primary-action"
              disabled={busy !== "" || !hasUnsavedSettings}
            >
              {busy === "save-settings" ? t("app.common.saving") : t("app.settings.save")}
            </button>
          </>
        }
      >
        <form
          id="mobile-settings-provider-form"
          className="mobile-form mobile-settings-form"
          onSubmit={handleSaveSettings}
        >
          <label>
            <span>{t("app.settings.providerName")}</span>
            <input value={settingsForm.providerName || ""} onChange={updateField("providerName")} />
          </label>
          <label>
            <span>{t("app.settings.model")}</span>
            <input value={settingsForm.model || ""} onChange={updateField("model")} />
          </label>
          <label>
            <span>{t("app.settings.baseUrl")}</span>
            <input value={settingsForm.baseUrl || ""} onChange={updateField("baseUrl")} />
          </label>
          {providerSecurityMessage ? (
            <p
              className={`mobile-inline-warning ${
                providerSecurityStatus === "blocked" ? "is-danger" : ""
              }`}
            >
              {providerSecurityMessage}
            </p>
          ) : null}
          <label>
            <span>{t("app.settings.apiKey")}</span>
            <input
              type="password"
              value={settingsForm.apiKey || ""}
              placeholder={
                settingsForm.clearApiKey
                  ? t("app.settings.apiKeyPlaceholder.clearing")
                  : settingsForm.hasApiKey
                    ? t("app.settings.apiKeyPlaceholder.keep")
                    : t("app.settings.apiKeyPlaceholder.enter")
              }
              onChange={updateApiKey}
            />
          </label>
          <div className="mobile-field-note">
            <span>
              {settingsForm.clearApiKey
                ? t("app.settings.apiKeyHint.clearing")
                : settingsForm.hasApiKey
                  ? t("app.settings.apiKeyHint.keep")
                  : t("app.settings.apiKeyHint.missing")}
            </span>
            {settingsForm.hasApiKey || settingsForm.clearApiKey ? (
              <button
                type="button"
                className={`mobile-secondary-action ${settingsForm.clearApiKey ? "is-danger" : ""}`}
                onClick={handleClearApiKey}
              >
                {settingsForm.clearApiKey
                  ? t("app.settings.apiKeyAction.undoClear")
                  : t("app.settings.apiKeyAction.clear")}
              </button>
            ) : null}
          </div>
          <label>
            <span>{t("app.settings.systemPrompt")}</span>
            <textarea
              value={settingsForm.systemPrompt || ""}
              onChange={updateField("systemPrompt")}
            />
          </label>
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
            <button
              type="button"
              className="mobile-secondary-action"
              onClick={() => setCacheTarget(null)}
            >
              {t("app.common.cancel")}
            </button>
            <button
              type="button"
              className={cacheTarget?.danger ? "mobile-danger-action" : "mobile-primary-action"}
              onClick={() => void clearCacheTarget()}
              disabled={busy !== ""}
            >
              {cacheTarget?.buttonLabel || t("app.settings.cache.clear")}
            </button>
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
