import React from "react";
import {
  IonButton,
  IonCol,
  IonIcon,
  IonMenuToggle,
  IonRow,
  IonText,
} from "@ionic/react";
import { menuOutline, sparkles } from "ionicons/icons";

const Menu = () => (
  <IonRow className="menu-trigger" aria-label="主菜单快捷入口">
    <IonCol size="auto" className="menu-trigger__copy">
      <IonText className="menu-trigger__eyebrow">
        <IonIcon icon={sparkles} size="small" />
        <span>&nbsp;玫瑰庭院</span>
      </IonText>
      <IonText className="menu-trigger__title">功能面板</IonText>
    </IonCol>
    <IonCol size="auto">
      <IonMenuToggle>
        <IonButton fill="clear" className="menu-trigger__button" autoHide={false}>
          <IonIcon icon={menuOutline} slot="start" />
          菜单
        </IonButton>
      </IonMenuToggle>
    </IonCol>
  </IonRow>
);

export default Menu;
