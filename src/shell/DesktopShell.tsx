import { useEffect, useRef } from "react";
import { AppButton } from "../components/ui";

const PRIMARY_IDS = ["today", "agent", "knowledge", "reminders"];
const TOOL_IDS = ["skills", "gallery", "music", "weather"];

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export default function DesktopShell({ model, children }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const {
    allNavigationItems = [],
    busy = "",
    currentView,
    dueReminderCount = 0,
    hasUnsavedNote,
    hasUnsavedReminder,
    hasUnsavedSettings,
    hasUnsavedSkill,
    isPlaying,
    lang,
    loading,
    openView,
    providerConfigured,
    railPresenceStatus = "idle",
    setLang,
    setTheme,
    t,
    theme,
    viewMeta = {},
  } = model;
  const items = new Map<string, { id: string; label: string }>(allNavigationItems.map((item) => [item.id, item]));
  const pageTitle = viewMeta[currentView]?.title || currentView;
  const dirty =
    (currentView === "knowledge" && hasUnsavedNote) ||
    (currentView === "reminders" && hasUnsavedReminder) ||
    (currentView === "skills" && hasUnsavedSkill) ||
    (currentView === "settings" && hasUnsavedSettings);
  const status = loading || busy
    ? t("app.status.running")
    : dirty
      ? t("app.common.dirty")
      : t(`app.status.${providerConfigured ? "ready" : railPresenceStatus}`);

  useEffect(() => {
    titleRef.current?.focus();
  }, [currentView]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditableTarget(event.target)) {
        return;
      }
      const order = [...PRIMARY_IDS, ...TOOL_IDS];
      if (event.key === ",") {
        event.preventDefault();
        openView("settings");
        return;
      }
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && order[index]) {
        event.preventDefault();
        openView(order[index]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openView]);

  const renderItem = (id: string) => {
    const item = items.get(id);
    if (!item) {
      return null;
    }
    const showCount = (id === "today" || id === "reminders") && Number(dueReminderCount) > 0;
    const dot =
      (id === "agent" && busy === "run") ||
      (id === "knowledge" && hasUnsavedNote) ||
      (id === "reminders" && hasUnsavedReminder) ||
      (id === "skills" && hasUnsavedSkill) ||
      (id === "settings" && hasUnsavedSettings) ||
      (id === "music" && isPlaying);
    return (
      <AppButton
        key={id}
        className={`desk-nav__item ${currentView === id ? "is-active" : ""}`}
        aria-current={currentView === id ? "page" : undefined}
        onClick={() => openView(id)}
      >
        <span>{item.label}</span>
        {showCount ? <span className="desk-nav__badge">{dueReminderCount}</span> : null}
        {!showCount && dot ? <span className="desk-nav__dot" data-tone={id === "music" && isPlaying ? "running" : "dirty"} /> : null}
      </AppButton>
    );
  };

  return (
    <div className={`desk theme-${theme} view-${currentView}`} data-theme={theme}>
      <aside className="desk-nav">
        <div className="desk-brand">
          <h1>归流</h1>
          <p>本地工作台</p>
          <p className="desk-presence" data-status={railPresenceStatus}>
            <span className="desk-presence__dot" aria-hidden="true" />
            <span>{t(`app.status.${railPresenceStatus}`)}</span>
          </p>
        </div>
        <nav aria-label={t("app.nav.title")}>
          <p className="desk-nav__group">{t("app.nav.group.workspace")}</p>
          <div className="desk-nav__list">{PRIMARY_IDS.map(renderItem)}</div>
          <p className="desk-nav__group">{t("app.nav.group.operations")}</p>
          <div className="desk-nav__list">{TOOL_IDS.map(renderItem)}</div>
        </nav>
        <div className="desk-nav__footer">
          {renderItem("settings")}
          <div className="desk-nav__prefs">
            <AppButton className="ghost-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? t("app.theme.light") : t("app.theme.dark")}
            </AppButton>
            <AppButton className="ghost-button" onClick={() => setLang(lang === "zh-CN" ? "en-US" : "zh-CN")}>
              {t("app.language.label")}
            </AppButton>
          </div>
        </div>
      </aside>
      <div className="desk-main">
        <header className="desk-header">
          <h1 id="desk-page-title" tabIndex={-1} ref={titleRef}>{pageTitle}</h1>
          <p>{status}</p>
        </header>
        {model.notice ? <div className="notice-banner" role="status">{model.notice}</div> : null}
        {model.error ? <div className="error-banner" role="alert">{model.error}</div> : null}
        <div className={`desk-stage ${currentView === "agent" ? "is-agent" : ""}`}>{children}</div>
        {model.showMiniPlayer ? model.miniPlayer : null}
        {model.audioSlot}
      </div>
    </div>
  );
}
