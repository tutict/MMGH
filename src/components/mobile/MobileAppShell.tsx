import React, { useMemo, useState } from "react";
import MobileAgentView from "./MobileAgentView";
import MobileGalleryView from "./MobileGalleryView";
import MobileKnowledgeView from "./MobileKnowledgeView";
import MobileMusicView from "./MobileMusicView";
import MobileRemindersView from "./MobileRemindersView";
import MobileSettingsView from "./MobileSettingsView";
import MobileSkillsView from "./MobileSkillsView";
import MobileSheet from "./MobileSheet";
import MobileTodayView from "./MobileTodayView";
import MobileWeatherView from "./MobileWeatherView";
import { getMobileNavIconType, mobileText } from "./mobileText";
import { AppIconButton, MobileButton, MobileList, MobileRowBody, MobileRowButton, joinClassNames } from "../ui";

const MENU_IDS = ["skills", "gallery", "music", "weather", "settings"];

function MobileAppShell({
  agent = {},
  gallery = {},
  knowledge = {},
  legacy = {},
  music = {},
  navigation = {},
  reminders = {},
  settings = {},
  shell = {},
  skills = {},
  today = {},
  weather = {},
}: Record<string, any>) {
  const [menuOpen, setMenuOpen] = useState(false);
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
  const menuItems = useMemo(
    () => MENU_IDS.map((id) => allItems.find((item) => item.id === id)).filter(Boolean),
    [allItems]
  );
  const showBack = MENU_IDS.includes(currentView);
  const renderIcon = (viewId) => <PanelIcon type={getMobileNavIconType(viewId)} />;

  return (
    <div className={`agent-app mobile-app theme-${theme} view-${currentView}${menuOpen ? " is-sheet-open" : ""}`}>
      <header className="mobile-topbar" data-testid="mobile-topbar">
        {showBack ? (
          <MobileButton variant="text" onClick={() => openView("today")}>
            {mobileText(lang, "close")}
          </MobileButton>
        ) : null}
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
        <MobileButton variant="text" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          {t("app.nav.menu")}
        </MobileButton>
      </header>

      <main className="mobile-main">
        {notice ? <div className="mobile-banner mobile-banner--notice">{notice}</div> : null}
        {error ? <div className="mobile-banner mobile-banner--error">{error}</div> : null}
        {currentView === "today" ? (
          <MobileTodayView {...today} busy={busy} clockNow={clockNow} formatShortClock={formatShortClock} lang={lang} loading={loading} />
        ) : currentView === "agent" ? (
          <MobileAgentView {...agent} busy={busy} lang={lang} loading={loading} providerConfigured={providerConfigured} />
        ) : currentView === "knowledge" ? (
          <MobileKnowledgeView {...knowledge} busy={busy} lang={lang} />
        ) : currentView === "weather" ? (
          <MobileWeatherView {...weather} lang={lang} t={t} />
        ) : currentView === "settings" ? (
          <MobileSettingsView {...settings} busy={busy} lang={lang} providerConfigured={providerConfigured} setLang={shell.setLang} setTheme={setTheme} t={t} theme={theme} />
        ) : currentView === "reminders" ? (
          <MobileRemindersView {...reminders} busy={busy} clockNow={clockNow} lang={lang} loading={loading} t={t} />
        ) : currentView === "gallery" ? (
          <MobileGalleryView {...gallery} lang={lang} t={t} />
        ) : currentView === "music" ? (
          <MobileMusicView {...music} lang={lang} t={t} />
        ) : currentView === "skills" ? (
          <MobileSkillsView {...skills} busy={busy} lang={lang} loading={loading} t={t} />
        ) : (
          <section className="mobile-legacy-page" aria-label={mobileText(lang, "legacy")}>{legacy.content}</section>
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
            <span className="mobile-dock__icon" aria-hidden="true">{renderIcon(item.id)}</span>
            <span>{item.label}</span>
          </MobileButton>
        ))}
      </nav>

      <MobileSheet
        id="mobile-menu-sheet"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        closeLabel={mobileText(lang, "close")}
        title={t("app.nav.menu")}
      >
        <MobileList>
          {menuItems.map((item) => (
            <MobileRowButton
              key={item.id}
              onClick={() => {
                openView(item.id);
                setMenuOpen(false);
              }}
            >
              <span className="mobile-row__icon" aria-hidden="true">{renderIcon(item.id)}</span>
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

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M14.5 3.5a8.5 8.5 0 1 0 6 14.2A8.2 8.2 0 0 1 14.5 3.5z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

export default MobileAppShell;
