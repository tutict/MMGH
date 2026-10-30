import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const lastPrimaryViewRef = useRef(showBack ? "today" : currentView);

  useEffect(() => {
    if (!showBack) {
      lastPrimaryViewRef.current = currentView;
    }
  }, [currentView, showBack]);

  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, [currentView]);

  const activeNavItem = allItems.find((item) => item.id === currentView);
  const activeSessionTitle = agent.activeSession?.session?.title;
  const topbarTitle =
    currentView === "agent"
      ? activeSessionTitle || activeNavItem?.label || mobileText(lang, "agent")
      : activeNavItem?.label || currentMeta.title || currentView;

  const closeToolView = () => openView(lastPrimaryViewRef.current || "today");

  return (
    <div className={joinClassNames("mobile-app", menuOpen ? "is-sheet-open" : null)}>
      <header className="mobile-topbar" data-testid="mobile-topbar">
        {showBack ? (
          <AppIconButton
            className="mobile-topbar__action"
            onClick={closeToolView}
            aria-label={mobileText(lang, "back")}
          >
            <ArrowBackRoundedIcon fontSize="small" aria-hidden="true" />
          </AppIconButton>
        ) : null}
        <h1 id="mobile-page-title" tabIndex={-1} ref={titleRef} className="mobile-topbar__title">
          {topbarTitle}
        </h1>
        <AppIconButton
          className="mobile-topbar__action"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-label={t("app.nav.menu")}
          onClick={() => setMenuOpen(true)}
        >
          <MenuRoundedIcon fontSize="small" aria-hidden="true" />
        </AppIconButton>
      </header>

      <main ref={mainRef} className="mobile-main" aria-labelledby="mobile-page-title">
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

      <nav className="mobile-dock" data-testid="mobile-dock" aria-label={t("app.nav.primary")}>
        {dockItems.map((item) => (
          <MobileButton
            key={item.id}
            className={joinClassNames("mobile-dock__item", currentView === item.id ? "is-active" : null)}
            onClick={() => openView(item.id)}
            aria-current={currentView === item.id ? "page" : undefined}
            variant="text"
            disableRipple
          >
            <span className="mobile-dock__icon" aria-hidden="true">{renderIcon(item.id)}</span>
            <span className="mobile-dock__label">{item.label}</span>
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
              className="mobile-menu-row"
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

export default MobileAppShell;
