import React, { useMemo, useState } from "react";
import MobileAgentView from "./MobileAgentView";
import MobileKnowledgeView from "./MobileKnowledgeView";
import MobileRemindersView from "./MobileRemindersView";
import MobileSettingsView from "./MobileSettingsView";
import MobileSheet from "./MobileSheet";
import MobileTodayView from "./MobileTodayView";
import MobileWeatherView from "./MobileWeatherView";
import { getMobileMoreItems } from "./mobileViewRegistry";
import { getMobileNavIconType, mobileText } from "./mobileText";
import { AppIconButton, MobileButton, MobileRowBody, joinClassNames } from "../ui";

function MobileAppShell({
  agent = {},
  knowledge = {},
  legacy = {},
  navigation = {},
  reminders = {},
  settings = {},
  shell = {},
  today = {},
  weather = {},
}: Record<string, any>) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const {
    busy = "",
    capabilities = [],
    clockNow,
    error = "",
    formatShortClock,
    lang,
    loading = false,
    mediaSlot,
    notice = "",
    PanelIcon,
    providerConfigured = false,
    setLang,
    setTheme,
    t,
    theme,
  } = shell;
  const {
    allItems = [],
    currentView = "today",
    dockItems = [],
    openView,
    viewMeta = {},
  } = navigation;
  const currentMeta = viewMeta[currentView] || viewMeta.today || {};
  const moreItems = useMemo(() => getMobileMoreItems(allItems), [allItems]);
  const renderIcon = (viewId) => <PanelIcon type={getMobileNavIconType(viewId)} />;

  return (
    <div className={`agent-app mobile-app theme-${theme} view-${currentView}`}>
      <header className="mobile-topbar" data-testid="mobile-topbar">
        <div className="mobile-topbar__title">
          <strong>归流 · {currentMeta.title || currentView}</strong>
        </div>
        <time>{formatShortClock(clockNow, lang)}</time>
        <AppIconButton
          type="button"
          className="mobile-icon-button"
          onClick={() => setMoreOpen(true)}
          aria-label={mobileText(lang, "more")}
          size="small"
        >
          <span aria-hidden="true">{renderIcon("more")}</span>
        </AppIconButton>
        <AppIconButton
          type="button"
          className="mobile-icon-button"
          onClick={() => setInspectorOpen(true)}
          aria-label={mobileText(lang, "inspector")}
          size="small"
        >
          <span aria-hidden="true">
            <PanelIcon type="trace" />
          </span>
        </AppIconButton>
      </header>

      <main className="mobile-main">
        {notice ? <div className="mobile-banner mobile-banner--notice">{notice}</div> : null}
        {error ? <div className="mobile-banner mobile-banner--error">{error}</div> : null}
        {currentView === "today" ? (
          <MobileTodayView
            {...today}
            busy={busy}
            clockNow={clockNow}
            formatShortClock={formatShortClock}
            lang={lang}
            loading={loading}
          />
        ) : currentView === "agent" ? (
          <MobileAgentView
            {...agent}
            busy={busy}
            lang={lang}
            loading={loading}
            providerConfigured={providerConfigured}
          />
        ) : currentView === "knowledge" ? (
          <MobileKnowledgeView
            {...knowledge}
            busy={busy}
            lang={lang}
          />
        ) : currentView === "weather" ? (
          <MobileWeatherView
            {...weather}
            lang={lang}
            t={t}
          />
        ) : currentView === "settings" ? (
          <MobileSettingsView
            {...settings}
            busy={busy}
            lang={lang}
            providerConfigured={providerConfigured}
            t={t}
          />
        ) : currentView === "reminders" ? (
          <MobileRemindersView
            {...reminders}
            busy={busy}
            clockNow={clockNow}
            lang={lang}
            loading={loading}
            t={t}
          />
        ) : (
          <section className="mobile-legacy-page" aria-label={mobileText(lang, "legacy")}>
            {legacy.content}
          </section>
        )}
      </main>

      <nav className="mobile-dock" data-testid="mobile-dock" aria-label="Mobile primary navigation">
        {dockItems.map((item) => (
          <MobileButton
            key={item.id}
            className={joinClassNames("mobile-dock__item", currentView === item.id ? "is-active" : null)}
            onClick={() => openView(item.id)}
            aria-current={currentView === item.id ? "page" : undefined}
            variant="text"
          >
            <span className="mobile-dock__icon" aria-hidden="true">
              {renderIcon(item.id)}
            </span>
            <span>{item.label}</span>
          </MobileButton>
        ))}
        <MobileButton
          className={joinClassNames("mobile-dock__item", moreOpen ? "is-active" : null)}
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          variant="text"
        >
          <span className="mobile-dock__icon" aria-hidden="true">
            {renderIcon("more")}
          </span>
          <span>{mobileText(lang, "more")}</span>
        </MobileButton>
      </nav>

      <MobileSheet
        id="mobile-more-sheet"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "more")}
        eyebrow={mobileText(lang, "quickSettings")}
      >
        <div className="mobile-list">
          {moreItems.map((item) => (
            <MobileButton
              key={item.id}
              className="mobile-row"
              onClick={() => {
                openView(item.id);
                setMoreOpen(false);
              }}
              variant="text"
            >
              <span className="mobile-row__icon" aria-hidden="true">
                {renderIcon(item.id)}
              </span>
              <MobileRowBody>
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </MobileRowBody>
              <small>{item.badge}</small>
            </MobileButton>
          ))}
        </div>
        <div className="mobile-quick-settings">
          <div className="mobile-segmented" role="group" aria-label={mobileText(lang, "language")}>
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
          <MobileButton
            variant="outlined"
            mobileAction="secondary"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? t("app.theme.light") : t("app.theme.dark")}
          </MobileButton>
        </div>
      </MobileSheet>

      <MobileSheet
        id="mobile-inspector-sheet"
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={mobileText(lang, "inspector")}
        eyebrow={currentMeta.title}
      >
        <div className="mobile-list">
          {capabilities.map((item) => (
            <div key={item.id} className="mobile-row">
              <span className="mobile-row__icon" aria-hidden="true">
                <PanelIcon type={item.id} />
              </span>
              <MobileRowBody>
                <strong>{t(`app.capability.${item.id}.title`)}</strong>
                <span>{t(`app.capability.${item.id}.description`)}</span>
              </MobileRowBody>
              <small>{t(`app.status.${item.status}`)}</small>
            </div>
          ))}
          <div className="mobile-row">
            <MobileRowBody>
              <strong>{mobileText(lang, "provider")}</strong>
              <span>{providerConfigured ? t("app.provider.configured") : t("app.provider.pending")}</span>
            </MobileRowBody>
          </div>
        </div>
      </MobileSheet>
      {mediaSlot}
    </div>
  );
}

export default MobileAppShell;


