import "./CSS/App.css";
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import React, { useEffect, useMemo, useState } from "react";
import {
  IonApp,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonPage,
  IonRouterOutlet,
  IonSearchbar,
  IonTitle,
  IonToast,
  IonToolbar,
} from "@ionic/react";
import { menuController } from "@ionic/core";
import { Route, Switch, useLocation } from "react-router-dom";
import {
  arrowBack,
  chatbubbles,
  chevronDownCircle,
  ellipse,
  moon,
} from "ionicons/icons";

import RoseSvg from "./homePage-model/RoseSvg";
import ParticlesComponent from "./homePage-model/ParticleEffect";
import Danmu from "./homePage-model/Danmu";
import TakePhoto from "./Menu-model/takePhoto";
import MySwiper from "./Menu-model/lunbotu";
import Clock from "./Menu-model/time";
import Album from "./Menu-model/Album";
import MusicPlayer from "./Menu-model/music";
import NavigationItem from "./Menu-model/NavigationItem";
import Menu from "./Menu-model/Menu";

import { setupIonicReact } from "@ionic/react";
import { useI18n } from "./i18n";

setupIonicReact();

function App() {
  const { t } = useI18n();
  const [colorClass, setColorClass] = useState("");
  const [shouldRotate, setShouldRotate] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showDanmu, setShowDanmu] = useState(false);
  const [theme, setTheme] = useState("night");
  const [toastConfig, setToastConfig] = useState({ open: false, message: "" });
  const [menuOpen, setMenuOpen] = useState(false);

  const [sidebarCollapse, setSidebarCollapse] = useState({
    intro: false,
    actions: false,
    links: false,
    footer: false,
  });

  const toggleSidebarSection = (key) => {
    setSidebarCollapse((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isLightTheme = theme === "dawn";
  useEffect(() => {
    document.body.classList.toggle("theme-light", isLightTheme);
    document.body.classList.toggle("theme-dark", !isLightTheme);
  }, [isLightTheme]);

  const showToast = (message) => {
    setToastConfig({ open: true, message });
  };

  const makeRed = () => {
    setColorClass("red");
    showToast(t("app.toast.red"));
  };

  const toggleRotation = () => {
    setShouldRotate((prev) => {
      const next = !prev;
      showToast(
        next ? t("app.toast.rotateOn") : t("app.toast.rotateOff")
      );
      return next;
    });
  };

  const toggleParticles = () => {
    setShowParticles((prev) => {
      const next = !prev;
      showToast(
        next ? t("app.toast.particlesOn") : t("app.toast.particlesOff")
      );
      return next;
    });
  };

  const toggleDanmu = () => {
    setShowDanmu((prev) => {
      const next = !prev;
      showToast(next ? t("app.toast.danmuOn") : t("app.toast.danmuOff"));
      return next;
    });
  };

  const toggleThemeMode = () => {
    setTheme((prev) => {
      const next = prev === "night" ? "dawn" : "night";
      showToast(
        next === "dawn"
          ? t("app.toast.themeDawn")
          : t("app.toast.themeNight")
      );
      return next;
    });
  };

  const toggleMenuDrawer = () => {
    menuController.toggle("first");
  };

  const heroStats = useMemo(
    () => [
      {
        label: t("app.stats.particles"),
        value: showParticles
          ? t("app.stats.onGuard")
          : t("app.stats.offGuard"),
      },
      {
        label: t("app.stats.heartbeat"),
        value: shouldRotate ? t("app.stats.rotating") : t("app.stats.idle"),
      },
      {
        label: t("app.stats.danmu"),
        value: showDanmu ? t("app.stats.danmuOn") : t("app.stats.danmuOff"),
      },
    ],
    [showParticles, shouldRotate, showDanmu, t]
  );

  const themeToggleLabel = isLightTheme
    ? t("app.actions.toggleThemeToNight")
    : t("app.actions.toggleThemeToDawn");
  const menuButtonLabel = menuOpen
    ? t("app.menu.toggle.close")
    : t("app.menu.toggle.open");

  const MENU_LINKS = [
    {
      id: "photo",
      to: "/page1",
      color: "danger",
      label: t("app.menu.link.photo.label"),
      subtitle: t("app.menu.link.photo.subtitle"),
    },
    {
      id: "carousel",
      to: "/page2",
      color: "tertiary",
      label: t("app.menu.link.carousel.label"),
      subtitle: t("app.menu.link.carousel.subtitle"),
    },
    {
      id: "time",
      to: "/page3",
      color: "success",
      label: t("app.menu.link.time.label"),
      subtitle: t("app.menu.link.time.subtitle"),
    },
    {
      id: "album",
      to: "/page4",
      color: "warning",
      label: t("app.menu.link.album.label"),
      subtitle: t("app.menu.link.album.subtitle"),
    },
    {
      id: "music",
      to: "/page5",
      color: "primary",
      label: t("app.menu.link.music.label"),
      subtitle: t("app.menu.link.music.subtitle"),
    },
    {
      id: "home",
      to: "/",
      color: "medium",
      label: t("app.menu.link.home.label"),
      subtitle: t("app.menu.link.home.subtitle"),
    },
  ];

  const menuStats = [
    {
      label: t("app.menu.stats.nodes"),
      value: MENU_LINKS.length.toString().padStart(2, "0"),
    },
    {
      label: t("app.menu.stats.theme"),
      value: isLightTheme
        ? t("app.menu.stats.theme.dawn")
        : t("app.menu.stats.theme.night"),
    },
    {
      label: t("app.menu.stats.danmu"),
      value: showDanmu
        ? t("app.menu.stats.danmu.on")
        : t("app.menu.stats.danmu.off"),
    },
  ];

  const MENU_TAGS = [
    t("app.menu.tag.0"),
    t("app.menu.tag.1"),
    t("app.menu.tag.2"),
    t("app.menu.tag.3"),
    t("app.menu.tag.4"),
  ];

  const quickActions = [
    {
      id: "theme",
      title: t("app.menu.quickActions.theme.title"),
      description: t("app.menu.quickActions.theme.desc"),
      action: toggleThemeMode,
      cta: themeToggleLabel,
      icon: moon,
    },
    {
      id: "danmu",
      title: t("app.menu.quickActions.danmu.title"),
      description: t("app.menu.quickActions.danmu.desc"),
      action: toggleDanmu,
      cta: showDanmu
        ? t("app.menu.quickActions.danmu.ctaOn")
        : t("app.menu.quickActions.danmu.ctaOff"),
      icon: chatbubbles,
    },
  ];

  return (
    <IonApp>
      <IonContent
        className={`content-background ${
          isLightTheme ? "theme-light" : "theme-dark"
        }`}
      >
        {isHomePage && showParticles ? (
          <ParticlesComponent
            id="homepage-particles"
            color={isLightTheme ? "rgba(28, 28, 30, 0.8)" : "#f5f7ff"}
            linkColor={isLightTheme ? "rgba(28, 28, 30, 0.45)" : "rgba(245, 247, 255, 0.6)"}
          />
        ) : null}

        <IonPage id="main-content">
          {isHomePage ? (
            <div className="home-shell route-transition">
              <div className="home-header">
                <Menu />
                <div className="home-header-actions">
                  <IonButton
                    fill="clear"
                    color="light"
                    size="small"
                    onClick={toggleThemeMode}
                  >
                    {themeToggleLabel}
                  </IonButton>
                  <IonButton
                    fill="clear"
                    color="light"
                    size="small"
                    onClick={toggleMenuDrawer}
                    className="menu-trigger-btn"
                  >
                    {menuButtonLabel}
                  </IonButton>
                </div>
              </div>

              <section className="hero-panel glass-panel">
                <div className="hero-copy">
                  <p className="panel-eyebrow">{t("app.hero.eyebrow")}</p>
                  <h1>{t("app.hero.title")}</h1>
                  <p className="hero-description">{t("app.hero.desc")}</p>
                  <div className="hero-actions">
                    <IonButton onClick={makeRed}>
                      {t("app.actions.makeRed")}
                    </IonButton>
                    <IonButton fill="outline" onClick={toggleRotation}>
                      {shouldRotate
                        ? t("app.actions.rotateOff")
                        : t("app.actions.rotateOn")}
                    </IonButton>
                    <IonButton
                      fill="clear"
                      color="light"
                      onClick={toggleThemeMode}
                    >
                      {themeToggleLabel}
                    </IonButton>
                  </div>
                  <div className="hero-stats">
                    {heroStats.map((stat) => (
                      <div className="hero-stat" key={stat.label}>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hero-visual">
                  <div className="rose-stage">
                    <RoseSvg colorClass={colorClass} shouldRotate={shouldRotate} />
                  </div>
                  <p className="hero-visual-caption">
                    {t("app.hero.visualCaption")}
                  </p>
                </div>
              </section>

              <section className="control-grid">
                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>{t("app.control.particles.title")}</h2>
                      <p>{t("app.control.particles.desc")}</p>
                    </div>
                    <span
                      className={`status-pill ${
                        showParticles ? "is-on" : "is-off"
                      }`}
                    >
                      {showParticles
                        ? t("app.control.status.on")
                        : t("app.control.status.off")}
                    </span>
                  </div>
                  <IonButton
                    fill="outline"
                    color="light"
                    onClick={toggleParticles}
                  >
                    <IonIcon icon={chevronDownCircle} slot="start" />
                    {showParticles
                      ? t("app.control.particles.buttonOn")
                      : t("app.control.particles.buttonOff")}
                  </IonButton>
                </article>

                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>{t("app.control.danmu.title")}</h2>
                      <p>{t("app.control.danmu.desc")}</p>
                    </div>
                    <span
                      className={`status-pill ${
                        showDanmu ? "is-on" : "is-off"
                      }`}
                    >
                      {showDanmu
                        ? t("app.control.status.on")
                        : t("app.control.status.off")}
                    </span>
                  </div>
                  <IonButton fill="outline" color="light" onClick={toggleDanmu}>
                    <IonIcon icon={chatbubbles} slot="start" />
                    {showDanmu
                      ? t("app.control.danmu.buttonOn")
                      : t("app.control.danmu.buttonOff")}
                  </IonButton>
                </article>

                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>{t("app.control.theme.title")}</h2>
                      <p>{t("app.control.theme.desc")}</p>
                    </div>
                    <span className="status-pill is-on">
                      {isLightTheme
                        ? t("app.actions.toggleTheme.dawn")
                        : t("app.actions.toggleTheme.night")}
                    </span>
                  </div>
                  <IonButton
                    fill="outline"
                    color="light"
                    onClick={toggleThemeMode}
                  >
                    <IonIcon icon={chevronDownCircle} slot="start" />
                    {themeToggleLabel}
                  </IonButton>
                </article>

                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>{t("app.control.menu.title")}</h2>
                      <p>{t("app.control.menu.desc")}</p>
                    </div>
                    <span className="status-pill is-on">
                      {t("app.control.menu.badge")}
                    </span>
                  </div>
                  <IonButton onClick={toggleMenuDrawer}>
                    <IonIcon icon={ellipse} slot="start" />
                    {menuButtonLabel}
                  </IonButton>
                </article>
              </section>

              {showDanmu && (
                <section className="danmu-panel glass-panel">
                  <div className="danmu-panel__head">
                    <h3>{t("app.danmu.title")}</h3>
                    <IonButton fill="clear" size="small" onClick={toggleDanmu}>
                      {t("app.danmu.hide")}
                    </IonButton>
                  </div>
                  <Danmu />
                </section>
              )}
            </div>
          ) : (
            <IonRouterOutlet id="app-routes" animated={false}>
              <Switch>
                <Route path="/page1" component={TakePhoto} exact />
                <Route path="/page2" component={MySwiper} exact />
                <Route path="/page3" component={Clock} exact />
                <Route path="/page4" component={Album} exact />
                <Route path="/page5" component={MusicPlayer} exact />
              </Switch>
            </IonRouterOutlet>
          )}
        </IonPage>

        <IonMenu
          menuId="first"
          type="overlay"
          contentId="main-content"
          className={`menu-root ${isLightTheme ? "theme-light" : "theme-dark"}${
            menuOpen ? " menu-open" : ""
          }`}
          onIonWillOpen={() => setMenuOpen(true)}
          onIonDidClose={() => setMenuOpen(false)}
        >
          <IonHeader>
            <IonToolbar className="menu-toolbar sidebar-toolbar">
              <IonTitle className="sidebar-title">{t("app.menu.title")}</IonTitle>
              <IonButtons slot="end">
                <IonMenuToggle>
                  <IonButton fill="clear" className="back-menu-top sidebar-close">
                    <IonIcon icon={arrowBack} slot="start" />
                    {t("app.menu.close")}
                  </IonButton>
                </IonMenuToggle>
              </IonButtons>
            </IonToolbar>
          </IonHeader>

          <IonContent className="menu-content sidebar-content">
            <div className="sidebar-shell">
              <section className="sidebar-card sidebar-intro">
                <button
                  type="button"
                  className="sidebar-section-header"
                  onClick={() => toggleSidebarSection("intro")}
                  aria-expanded={!sidebarCollapse.intro}
                  aria-controls="sidebar-intro-body"
                >
                  <span className="sidebar-section-title">
                    {t("app.menu.section.intro")}
                  </span>
                  <IonIcon
                    icon={chevronDownCircle}
                    className={
                      "sidebar-section-icon" +
                      (sidebarCollapse.intro ? " is-collapsed" : "")
                    }
                  />
                </button>
                <div
                  id="sidebar-intro-body"
                  className={
                    "sidebar-section-body" +
                    (sidebarCollapse.intro ? " is-collapsed" : "")
                  }
                >
                  <div className="sidebar-intro__copy">
                    <span className="sidebar-badge">{t("app.menu.badge")}</span>
                    <h3>{t("app.menu.intro.title")}</h3>
                    <p>{t("app.menu.intro.desc")}</p>
                  </div>
                  <div className="sidebar-stats">
                    {menuStats.map((stat) => (
                      <div className="sidebar-stat" key={stat.label}>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="sidebar-search">
                    <IonSearchbar
                      showClearButton="always"
                      placeholder={t("app.menu.search.placeholder")}
                      className="sidebar-searchbar"
                    />
                    <div className="sidebar-tags">
                      {MENU_TAGS.map((tag) => (
                        <IonChip key={tag} outline className="sidebar-tag">
                          #{tag}
                        </IonChip>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="sidebar-card sidebar-actions">
                <button
                  type="button"
                  className="sidebar-section-header"
                  onClick={() => toggleSidebarSection("actions")}
                  aria-expanded={!sidebarCollapse.actions}
                  aria-controls="sidebar-actions-body"
                >
                  <span className="sidebar-section-title">
                    {t("app.menu.section.actions")}
                  </span>
                  <IonIcon
                    icon={chevronDownCircle}
                    className={
                      "sidebar-section-icon" +
                      (sidebarCollapse.actions ? " is-collapsed" : "")
                    }
                  />
                </button>
                <div
                  id="sidebar-actions-body"
                  className={
                    "sidebar-section-body" +
                    (sidebarCollapse.actions ? " is-collapsed" : "")
                  }
                >
                  {quickActions.map((item) => (
                    <article className="sidebar-action-card" key={item.id}>
                      <div>
                        <IonIcon icon={item.icon} />
                        <small>{item.description}</small>
                        <h4>{item.title}</h4>
                      </div>
                      <IonButton fill="clear" size="small" onClick={item.action}>
                        {item.cta}
                      </IonButton>
                    </article>
                  ))}
                </div>
              </section>

              <section className="sidebar-card sidebar-links">
                <button
                  type="button"
                  className="sidebar-section-header"
                  onClick={() => toggleSidebarSection("links")}
                  aria-expanded={!sidebarCollapse.links}
                  aria-controls="sidebar-links-body"
                >
                  <span className="sidebar-section-title">
                    {t("app.menu.section.links")}
                  </span>
                  <IonIcon
                    icon={chevronDownCircle}
                    className={
                      "sidebar-section-icon" +
                      (sidebarCollapse.links ? " is-collapsed" : "")
                    }
                  />
                </button>
                <div
                  id="sidebar-links-body"
                  className={
                    "sidebar-section-body" +
                    (sidebarCollapse.links ? " is-collapsed" : "")
                  }
                >
                  {MENU_LINKS.map((link) => (
                    <IonMenuToggle key={link.id} autoHide={false}>
                      <NavigationItem {...link} />
                    </IonMenuToggle>
                  ))}
                </div>
              </section>

              <section className="sidebar-footer-card">
                <button
                  type="button"
                  className="sidebar-section-header"
                  onClick={() => toggleSidebarSection("footer")}
                  aria-expanded={!sidebarCollapse.footer}
                  aria-controls="sidebar-footer-body"
                >
                  <span className="sidebar-section-title">
                    {t("app.menu.section.footer")}
                  </span>
                  <IonIcon
                    icon={chevronDownCircle}
                    className={
                      "sidebar-section-icon" +
                      (sidebarCollapse.footer ? " is-collapsed" : "")
                    }
                  />
                </button>
                <div
                  id="sidebar-footer-body"
                  className={
                    "sidebar-section-body" +
                    (sidebarCollapse.footer ? " is-collapsed" : "")
                  }
                >
                  <div className="sidebar-footer-copy">
                    <span>{t("app.menu.footer.label")}</span>
                    <h4>{t("app.menu.footer.title")}</h4>
                    <p>{t("app.menu.footer.desc")}</p>
                  </div>
                  <IonButton fill="outline" onClick={toggleDanmu}>
                    {showDanmu
                      ? t("app.menu.footer.ctaOn")
                      : t("app.menu.footer.ctaOff")}
                  </IonButton>
                </div>
              </section>
              <IonNote color="medium" className="menu-note">
                {t("app.menu.note")}
              </IonNote>
            </div>
          </IonContent>
        </IonMenu>

        <IonToast
          isOpen={toastConfig.open}
          message={toastConfig.message}
          duration={2000}
          onDidDismiss={() =>
            setToastConfig((prev) => ({ ...prev, open: false }))
          }
        />
      </IonContent>
    </IonApp>
  );
}

export default App;
