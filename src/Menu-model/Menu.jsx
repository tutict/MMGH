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
import { useI18n } from "../i18n";

const Menu = () => {
  const { t } = useI18n();

  return (
    <IonRow className="menu-trigger menu-trigger--card" aria-label={t("menu.trigger.aria")}>
      <IonCol size="auto" className="menu-trigger__actions">
        <IonMenuToggle>
          <IonButton fill="clear" className="menu-trigger__button" autoHide={false}>
            <IonIcon icon={menuOutline} slot="start" />
            {t("menu.trigger.button")}
          </IonButton>
        </IonMenuToggle>
      </IonCol>
      <IonCol size="auto" className="menu-trigger__copy">
        <IonText className="menu-trigger__eyebrow">
          <IonIcon icon={sparkles} size="small" className="menu-trigger__sparkle" />
          <span>&nbsp;{t("menu.trigger.eyebrow")}</span>
        </IonText>
        <IonText className="menu-trigger__title">{t("menu.trigger.title")}</IonText>
      </IonCol>
    </IonRow>
  );
};

export default Menu;
