import "./CSS/App.css";
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import React, { useMemo, useState } from "react";
import {
  IonApp,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonList,
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

setupIonicReact();

function App() {
  const [colorClass, setColorClass] = useState("");
  const [shouldRotate, setShouldRotate] = useState(false);
  const [showParticles, setShowParticles] = useState(true);
  const [showDanmu, setShowDanmu] = useState(false);
  const [theme, setTheme] = useState("night");
  const [toastConfig, setToastConfig] = useState({ open: false, message: "" });
  const [menuOpen, setMenuOpen] = useState(false);

  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isLightTheme = theme === "dawn";

  const showToast = (message) => {
    setToastConfig({ open: true, message });
  };

  const makeRed = () => {
    setColorClass("red");
    showToast("花瓣悄悄染上心动的暖红");
  };

  const toggleRotation = () => {
    setShouldRotate((prev) => {
      const next = !prev;
      showToast(next ? "玫瑰旋转，像我们的星河" : "玫瑰静静等待下一次心动");
      return next;
    });
  };

  const toggleParticles = () => {
    setShowParticles((prev) => {
      const next = !prev;
      showToast(next ? "星屑为你亮起" : "星屑轻轻熄灭");
      return next;
    });
  };

  const toggleDanmu = () => {
    setShowDanmu((prev) => {
      const next = !prev;
      showToast(next ? "心事弹幕展开，快写下想说的话" : "心事轻落，弹幕暂别");
      return next;
    });
  };

  const toggleThemeMode = () => {
    setTheme((prev) => {
      const next = prev === "night" ? "dawn" : "night";
      showToast(next === "dawn" ? "晨曦模式为你亮起" : "夜色模式轻覆四周");
      return next;
    });
  };

  const toggleMenuDrawer = () => {
    menuController.toggle("first");
  };

  const heroStats = useMemo(
    () => [
      {
        label: "流光特效",
        value: showParticles ? "守护中" : "待唤醒",
      },
      {
        label: "玫瑰心跳",
        value: shouldRotate ? "旋转中" : "静静盛放",
      },
      {
        label: "心事弹幕",
        value: showDanmu ? "星海飞行" : "温柔收藏",
      },
    ],
    [showParticles, shouldRotate, showDanmu]
  );

  const themeToggleLabel = isLightTheme ? "切换到夜色" : "切换到晨曦";
  const menuButtonLabel = menuOpen ? "隐藏菜单" : "打开菜单";

  const MENU_LINKS = [
    {
      to: "/page1",
      color: "danger",
      label: "拍照",
      subtitle: "把此刻的心动收进胶卷",
    },
    {
      to: "/page2",
      color: "tertiary",
      label: "轮播图",
      subtitle: "给我们的回忆一段流动的光影",
    },
    {
      to: "/page3",
      color: "success",
      label: "时间",
      subtitle: "让日常每一秒都被好好记录",
    },
    {
      to: "/page4",
      color: "warning",
      label: "相册",
      subtitle: "汇集我们想说的浪漫瞬间",
    },
    {
      to: "/page5",
      color: "primary",
      label: "音乐",
      subtitle: "换上一首歌，换一种心情",
    },
    {
      to: "/",
      color: "medium",
      label: "返回主页",
      subtitle: "回到玫瑰庭院，再次出发",
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
          <ParticlesComponent id="homepage-particles" />
        ) : null}

        <IonPage id="main-content">
          {isHomePage ? (
            <div className="home-shell">
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
                  <p className="panel-eyebrow">写给未来的你</p>
                  <h1>等你来到这里，我把星河与玫瑰都交给你</h1>
                  <p className="hero-description">
                    在这片数字庭院里，我偷偷排练我们未到来的故事。玫瑰替我旋转，粒子替我发光，当你按下开启的那刻，所有温柔都会自动播放。
                  </p>
                  <div className="hero-actions">
                    <IonButton onClick={makeRed}>玫瑰变红</IonButton>
                    <IonButton fill="outline" onClick={toggleRotation}>
                      {shouldRotate ? "停止旋转" : "玫瑰旋转"}
                    </IonButton>
                    <IonButton fill="clear" color="light" onClick={toggleThemeMode}>
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
                    <RoseSvg
                      colorClass={colorClass}
                      shouldRotate={shouldRotate}
                    />
                  </div>
                  <p className="hero-visual-caption">
                    右侧菜单里藏着拍照、轮播、音乐等小宇宙，都是写给未来女朋友的彩蛋。
                  </p>
                </div>
              </section>

              <section className="control-grid">
                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>星屑护卫</h2>
                      <p>流星绕着玫瑰，像我想为你围成的宇宙。</p>
                    </div>
                    <span
                      className={`status-pill ${
                        showParticles ? "is-on" : "is-off"
                      }`}
                    >
                      {showParticles ? "ON" : "OFF"}
                    </span>
                  </div>
                  <IonButton
                    fill="outline"
                    color="light"
                    onClick={toggleParticles}
                  >
                    <IonIcon icon={chevronDownCircle} slot="start" />
                    {showParticles ? "轻按熄灯" : "轻按点亮"}
                  </IonButton>
                </article>

                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>心事弹幕</h2>
                      <p>把悄悄话写给未来的自己，也写给我。</p>
                    </div>
                    <span
                      className={`status-pill ${
                        showDanmu ? "is-on" : "is-off"
                      }`}
                    >
                      {showDanmu ? "ON" : "OFF"}
                    </span>
                  </div>
                  <IonButton
                    fill="outline"
                    color="light"
                    onClick={toggleDanmu}
                  >
                    <IonIcon icon={chatbubbles} slot="start" />
                    {showDanmu ? "收起呢喃" : "展开呢喃"}
                  </IonButton>
                </article>

                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>光影模式</h2>
                      <p>夜色与晨曦我都留好，看你想走哪段旅程。</p>
                    </div>
                    <span className="status-pill is-on">
                      {isLightTheme ? "晨曦" : "夜色"}
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
                      <h2>功能面板</h2>
                      <p>拍照、轮播、音乐……都是为你准备的彩蛋。</p>
                    </div>
                    <span className="status-pill is-on">MENU</span>
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
                      <h3>弹幕互动区</h3>
                      <IonButton fill="clear" size="small" onClick={toggleDanmu}>
                        隐藏
                      </IonButton>
                    </div>
                    <Danmu />
                  </section>
                )}
              </div>
            ) : (
              <IonRouterOutlet id="main-content">
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
              contentId="main-content"
          >
              <IonHeader>
                  <IonToolbar className="menu-toolbar">
                      <IonTitle>菜单选项</IonTitle>
                      <IonButtons slot="end">
                          <IonMenuToggle>
                              <IonButton fill="clear" className="back-menu-top">
                                  <IonIcon icon={arrowBack} slot="start" />
                                  关闭
                              </IonButton>
                          </IonMenuToggle>
                      </IonButtons>
                  </IonToolbar>
              </IonHeader>

                      <IonContent className="menu-content">
          <div className="menu-shell">
            <div className="menu-hero">
              <span className="menu-hero__badge">旅程精选</span>
              <h3>给未来的你挑一个旅程</h3>
              <p>拍照、散步、听歌……每一道选项都替你提前装进心里。</p>
              <IonSearchbar
                showClearButton="always"
                placeholder="输入你想搜索的内容"
                className="menu-search"
              />
            </div>
            <div className="menu-grid">
              {MENU_LINKS.map((link) => (
                <NavigationItem key={link.label} {...link} />
              ))}
            </div>
            <div className="menu-footer-card">
              <div className="menu-footer-copy">
                <h4>今日提示</h4>
                <p>写几句弹幕给未来的自己，它们会永远在星海里闪烁。</p>
              </div>
              <IonButton fill="clear" size="small" onClick={toggleDanmu}>
                开启弹幕
              </IonButton>
            </div>
            <IonNote color="medium" className="menu-note">
              写给未来的你 · by HGL
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
