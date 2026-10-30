import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import { useEffect, useRef } from "react";
import { AppButton, AppIconButton } from "../components/ui";

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
  const statusTone = loading || busy ? "running" : dirty ? "dirty" : providerConfigured ? "ready" : "idle";

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

  const nextThemeLabel = theme === "dark" ? t("app.theme.light") : t("app.theme.dark");

  return (
    <div className="desk" data-theme={theme}>
      <aside className="desk-nav">
        <div className="desk-brand">
          <p className="desk-brand__name">归流</p>
          <p className="desk-brand__tagline">本地工作台</p>
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
            <AppIconButton
              className="desk-nav__pref"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={nextThemeLabel}
              title={nextThemeLabel}
              size="small"
            >
              {theme === "dark" ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </AppIconButton>
            <AppIconButton
              className="desk-nav__pref"
              onClick={() => setLang(lang === "zh-CN" ? "en-US" : "zh-CN")}
              aria-label={t("app.language.label")}
              title={t("app.language.label")}
              size="small"
            >
              <TranslateRoundedIcon fontSize="small" />
            </AppIconButton>
          </div>
        </div>
      </aside>
      <div className="desk-main">
        <header className="desk-header">
          <h1 id="desk-page-title" tabIndex={-1} ref={titleRef}>{pageTitle}</h1>
          <p className="desk-header__status" data-status={statusTone}>
            <span className="desk-header__dot" aria-hidden="true" />
            <span>{status}</span>
          </p>
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
