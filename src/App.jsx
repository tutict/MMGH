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
    showToast("花瓣悄悄染上心动的暖红。");
  };

  const toggleRotation = () => {
    setShouldRotate((prev) => {
      const next = !prev;
      showToast(
        next
          ? "珊瑚开始旋转，像我们的小银河。"
          : "珊瑚慢慢停下，等待下一次心动。",
      );
      return next;
    });
  };

  const toggleParticles = () => {
    setShowParticles((prev) => {
      const next = !prev;
      showToast(next ? "星尘为你亮起。" : "星尘轻轻熄灭。");
      return next;
    });
  };

  const toggleDanmu = () => {
    setShowDanmu((prev) => {
      const next = !prev;
      showToast(
        next
          ? "心事弹幕展开，快写下一句悄悄话。"
          : "心事安静落下，弹幕暂时折叠。",
      );
      return next;
    });
  };

  const toggleThemeMode = () => {
    setTheme((prev) => {
      const next = prev === "night" ? "dawn" : "night";
      showToast(
        next === "dawn"
          ? "晨曦模式为你点亮整个庭院。"
          : "夜色模式轻轻落在四周。",
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
        label: "流光特效",
        value: showParticles ? "守护中" : "待唤醒",
      },
      {
        label: "珊瑚心跳",
        value: shouldRotate ? "旋转中" : "静待中",
      },
      {
        label: "心事弹幕",
        value: showDanmu ? "星海飞行" : "温柔收纳",
      },
    ],
    [showParticles, shouldRotate, showDanmu],
  );

  const themeToggleLabel = isLightTheme ? "切换到夜色" : "切换到晨曦";
  const menuButtonLabel = menuOpen ? "隐藏菜单" : "打开菜单";

  const MENU_LINKS = [
    {
      to: "/page1",
      color: "danger",
      label: "拍照",
      subtitle: "把此刻心动收进胶卷",
    },
    {
      to: "/page2",
      color: "tertiary",
      label: "轮播",
      subtitle: "回放我们流动的光影",
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
      subtitle: "收集那些浪漫的瞬间",
    },
    {
      to: "/page5",
      color: "primary",
      label: "音乐",
      subtitle: "换上一首歌，换一个心情",
    },
    {
      to: "/",
      color: "medium",
      label: "返回主页",
      subtitle: "回到珊瑚庭院，再次出发",
    },
  ];

  const menuStats = [
    {
      label: "旅程节点",
      value: MENU_LINKS.length.toString().padStart(2, "0"),
    },
    {
      label: "当前主题",
      value: isLightTheme ? "晨曦模式" : "夜色模式",
    },
    {
      label: "互动状态",
      value: showDanmu ? "弹幕已开" : "弹幕待启",
    },
  ];

  const MENU_TAGS = [
    "心动分部",
    "胶片日记",
    "星河音乐",
    "才兴投影",
    "弹幕贴纸",
  ];

  const quickActions = [
    {
      title: "主题格调",
      description: "晨曦/夜色二选一",
      action: toggleThemeMode,
      cta: themeToggleLabel,
      icon: moon,
    },
    {
      title: "弹幕互动",
      description: "写下一句想说的话",
      action: toggleDanmu,
      cta: showDanmu ? "收起弹幕" : "开启弹幕",
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
                  <h1>等你来到这里，我把星河与珊瑚都交给你</h1>
                  <p className="hero-description">
                    在这片数字庭院里，我排练着我们未到来的故事。珊瑚替我旋转，颗粒替我发光，当你按下开启的那刻，所有温柔都会自动播放。
                  </p>
                  <div className="hero-actions">
                    <IonButton onClick={makeRed}>珊瑚变红</IonButton>
                    <IonButton fill="outline" onClick={toggleRotation}>
                      {shouldRotate ? "停止旋转" : "珊瑚旋转"}
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
                    <RoseSvg
                      colorClass={colorClass}
                      shouldRotate={shouldRotate}
                    />
                  </div>
                  <p className="hero-visual-caption">
                    右侧菜单里藏着拍照、轮播、音乐等小宇宙，都是写给未来女友的彩蛋。
                  </p>
                </div>
              </section>

              <section className="control-grid">
                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>星尘护卫</h2>
                      <p>流星绕着珊瑚，像我想为你围起的宇宙。</p>
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
                      <p>把想说的话写给未来的自己，也写给我。</p>
                    </div>
                    <span
                      className={`status-pill ${
                        showDanmu ? "is-on" : "is-off"
                      }`}
                    >
                      {showDanmu ? "ON" : "OFF"}
                    </span>
                  </div>
                  <IonButton fill="outline" color="light" onClick={toggleDanmu}>
                    <IonIcon icon={chatbubbles} slot="start" />
                    {showDanmu ? "收起留言" : "展开留言"}
                  </IonButton>
                </article>

                <article className="control-card glass-panel">
                  <div className="control-card__head">
                    <div>
                      <h2>光影模式</h2>
                      <p>夜色与晨曦我都留好，等你挑选旅程。</p>
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
          onIonDidOpen={() => setMenuOpen(true)}
          onIonDidClose={() => setMenuOpen(false)}
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
                <section className="menu-hero menu-panel">
                  <div className="menu-hero__head">
                    <span className="menu-hero__badge">旅程精选</span>
                    <h3>给未来的你寻找一份心情</h3>
                    <p>
                      拍照、散步、听歌……每一道选项都是对未来的轻声邀请，按下它们，平凡的时光就会被重新镀上一层温度。
                    </p>
                  </div>
                  <div className="menu-hero__stats">
                    {menuStats.map((stat) => (
                      <div className="menu-hero__stat" key={stat.label}>
                        <strong>{stat.value}</strong>
                        <span>{stat.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="menu-search-block">
                    <IonSearchbar
                      showClearButton="always"
                      placeholder="输入想去的地方，或一个情绪密码"
                      className="menu-search"
                    />
                    <div className="menu-tag-cloud">
                      {MENU_TAGS.map((tag) => (
                        <IonChip key={tag} outline className="menu-chip">
                          #{tag}
                        </IonChip>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="menu-quick-actions menu-panel">
                  {quickActions.map((item) => (
                    <article className="menu-quick-card" key={item.title}>
                      <div>
                        <IonIcon icon={item.icon} />
                        <small>{item.description}</small>
                        <h4>{item.title}</h4>
                      </div>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={item.action}
                      >
                        {item.cta}
                      </IonButton>
                    </article>
                  ))}
                </section>

                <section className="menu-grid menu-panel">
                  {MENU_LINKS.map((link) => (
                    <IonMenuToggle key={link.label} autoHide={false}>
                      <NavigationItem {...link} />
                    </IonMenuToggle>
                  ))}
                </section>

                <section className="menu-footer-card menu-panel">
                  <div className="menu-footer-copy">
                    <span>今日提示</span>
                    <h4>写一句留给未来的心事</h4>
                    <p>
                      期盼那些会被再次翻阅的片段，它们会因为你的字句而更加珍贵。
                    </p>
                  </div>
                  <IonButton fill="outline" onClick={toggleDanmu}>
                    {showDanmu ? "收起弹幕" : "立刻写下"}
                  </IonButton>
                </section>
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
