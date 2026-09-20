import React, { useMemo, useState } from "react";
import MobileAgentView from "./MobileAgentView";
import MobileKnowledgeView from "./MobileKnowledgeView";
import MobileRemindersView from "./MobileRemindersView";
import MobileSettingsView from "./MobileSettingsView";
import MobileSheet from "./MobileSheet";
import MobileTodayView from "./MobileTodayView";
import MobileWeatherView from "./MobileWeatherView";
import { getMobileMoreItems, isPrimaryMobileView } from "./mobileViewRegistry";
import { getMobileNavIconType, mobileText } from "./mobileText";
import { AppIconButton, MobileButton, MobileList, MobileRowBody, MobileRowButton, joinClassNames } from "../ui";

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
  const {
    busy = "",
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
  const moreIsCurrent = moreOpen || !isPrimaryMobileView(currentView);
  const renderIcon = (viewId) => <PanelIcon type={getMobileNavIconType(viewId)} />;

  return (
    <div
      className={`agent-app mobile-app theme-${theme} view-${currentView}${
        mediaSlot ? " agent-app--with-mini-player" : ""
      }${moreOpen ? " is-sheet-open" : ""}`}
    >
      <header className="mobile-topbar" data-testid="mobile-topbar">
        <div className="mobile-topbar__title">
          <strong>{currentMeta.title || currentView}</strong>
        </div>
        <time>{formatShortClock(clockNow, lang)}</time>
        {setTheme ? (
          <AppIconButton
            className="mobile-topbar__theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t("app.theme.light") : t("app.theme.dark")}
            size="small"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </AppIconButton>
        ) : null}
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
            setLang={setLang}
            setTheme={setTheme}
            t={t}
            theme={theme}
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
          className={joinClassNames("mobile-dock__item", moreIsCurrent ? "is-active" : null)}
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
      >
        <MobileList>
          {moreItems.map((item) => (
            <MobileRowButton
              key={item.id}
              onClick={() => {
                openView(item.id);
                setMoreOpen(false);
              }}
            >
              <span className="mobile-row__icon" aria-hidden="true">
                {renderIcon(item.id)}
              </span>
              <MobileRowBody>
                <strong>{item.label}</strong>
              </MobileRowBody>
            </MobileRowButton>
          ))}
        </MobileList>
      </MobileSheet>
      {mediaSlot}
    </div>
  );
}

export default MobileAppShell;

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.1 3.1A8.4 8.4 0 1 0 20 14.6 7 7 0 0 1 12.1 3.1Z"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 4h2v3h-2V4Zm0 13h2v3h-2v-3ZM4 11h3v2H4v-2Zm13 0h3v2h-3v-2ZM6.3 6.3l1.8 1.8-1.4 1.4-1.8-1.8 1.4-1.4Zm10.6 10.6 1.8 1.8-1.4 1.4-1.8-1.8 1.4-1.4ZM6.3 17.7l1.4 1.4-1.8 1.8-1.4-1.4 1.8-1.8Zm10.6-10.6 1.4 1.4-1.8 1.8-1.4-1.4 1.8-1.8ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
      />
    </svg>
  );
}
