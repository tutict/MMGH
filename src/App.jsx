import './CSS/App.css'
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import RoseSvg from "./homePage-model/RoseSvg";
import {
    IonButton,
    IonGrid,
    IonRow,
    IonCol,
    IonApp,
    IonPage,
    setupIonicReact,
    IonHeader,
    IonToolbar,
    IonMenu,
    IonContent,
    IonTitle,
    IonIcon,
    IonList,
    IonMenuToggle,
    IonNote, IonFabButton, IonFabList, IonFab, IonToast, IonSearchbar, IonRouterOutlet,
} from "@ionic/react";
import React, {useState} from "react";
import {
    arrowBack,
    chatbubbles,
    chevronDownCircle,
    ellipse,
} from "ionicons/icons";
import ParticlesComponent from "./homePage-model/ParticleEffect";
import {Route, useLocation, Switch} from 'react-router-dom';
import TakePhoto from "./Menu-model/takePhoto"
import  MySwiper from "./Menu-model/lunbotu"
import Clock from "./Menu-model/time"
import Album from "./Menu-model/Album"
import MusicPlayer from "./Menu-model/music"
import Danmu from "./homePage-model/Danmu";
import NavigationItem from './Menu-model/NavigationItem';
import Menu from "./Menu-model/Menu";
setupIonicReact();

function App() {
    let [colorClass, setColorClass] = useState("");
    let [shouldRotate, setShouldRotate] = useState(false);
    let [showParticles, setShowParticles] = useState(true);
    let [showDanmu, setShowDanmu] = useState(false);
    let location = useLocation();
    let isHomePage = location.pathname === "/";

    const makeRed = () =>{
        setColorClass("red");
    };

    const toggleRotation = () => {
        setShouldRotate(prevState => !prevState);  // toggle the state
    };

    const toggleModal = () => {
        setShowParticles(prev => !prev);
    };

    const handleButoonClick = () =>{
        setShowDanmu(prevState=> !prevState);
    }

    return (
        <IonApp>
            <IonContent class="content-background">
                {showDanmu && <Danmu />}
                {showParticles ? <ParticlesComponent /> : null}

                <IonPage id="main-content">
                    {isHomePage && <Menu />}
                    {isHomePage ? (
                        <IonGrid class="middle">
                            <IonRow class="glass-effect">
                                <IonCol size="auto">
                                    <RoseSvg colorClass={colorClass} shouldRotate={shouldRotate} />
                                </IonCol>
                            </IonRow>
                            <IonRow class="glass-effect">
                                <IonCol size="auto" class="ion-margin-top left" >
                                    <IonButton color="primary" expand="block" fill="outline" onClick={makeRed}>玫瑰变红</IonButton>
                                </IonCol>
                                <IonCol>
                                    <IonFab  class="middle-button" vertical="top" horizontal="end" edge={true}>
                                        <IonFabButton>
                                            <IonIcon icon={chevronDownCircle}></IonIcon>
                                        </IonFabButton>
                                        <IonFabList side="bottom">
                                            <IonFabButton class="little-button" onClick={toggleModal} >
                                                <IonIcon icon={ellipse} ></IonIcon>
                                                <IonToast
                                                    isOpen={showParticles}
                                                    duration={2000}
                                                    message="粒子特效，启动！"
                                                    class="custom-toast"
                                                    buttons={[
                                                        {
                                                            text: '关闭',
                                                            role: 'cancel',
                                                        },
                                                    ]}
                                                ></IonToast>
                                            </IonFabButton>
                                            <IonFabButton class="little-button" onClick={handleButoonClick}>
                                                <IonIcon icon={chatbubbles}></IonIcon>
                                            </IonFabButton>
                                        </IonFabList>
                                    </IonFab>
                                </IonCol>
                                <IonCol size="auto" class="ion-margin-top right">
                                    <IonButton color="primary" expand="block" fill="outline" onClick={toggleRotation}>玫瑰旋转</IonButton>
                                </IonCol>
                            </IonRow>
                        </IonGrid>
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
                <IonMenu menuId="first" contentId="main-content">
                    <IonHeader>
                        <IonToolbar color="tertiary">
                            <IonRow>
                                <IonTitle>菜单选项</IonTitle>
                                <IonMenuToggle>
                                    <IonButton fill="outline" color="light" class="back-menu-top">
                                        <IonIcon icon={arrowBack} />
                                    </IonButton>
                                </IonMenuToggle>
                            </IonRow>
                        </IonToolbar>
                    </IonHeader>

                    <IonContent>
                        <IonList inset={true}>
                            <IonSearchbar showClearButton="always" value="输入你想搜索的内容"></IonSearchbar>
                            <NavigationItem to="/page1" color="danger" label="拍照" />
                            <NavigationItem to="/page2" color="tertiary" label="轮播图" />
                            <NavigationItem to="/page3" color="success" label="时间" />
                            <NavigationItem to="/page4" color="warning" label="相册" />
                            <NavigationItem to="/page5" color="primary" label="音乐" />
                            <NavigationItem to="/" color="medium" label="返回主页" />
                        </IonList>
                        <IonNote color="medium" class="menu-text-me">
                            by hgl
                        </IonNote>
                    </IonContent>
                </IonMenu>
            </IonContent>
        </IonApp>
    );
}


export default App;