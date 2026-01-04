import React, { useEffect, useState } from "react";
import {
  IonButton,
  IonContent,
  IonDatetime,
  IonModal,
  IonText,
} from "@ionic/react";
import "../CSS/DateTimeModel.css";
import { useI18n } from "../i18n";

const getCurrentDateTime = () => {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 8);
  return now.toISOString();
};

const DateTimeModal = ({ isOpen, onDismiss, onConfirm, locale, selectedDate }) => {
  const { t } = useI18n();
  const [selectedDateTime, setSelectedDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelectedDateTime(selectedDate || getCurrentDateTime());
  }, [isOpen, selectedDate]);

  const handleDateTimeChange = (event) => {
    setSelectedDateTime(event.detail.value);
  };

  return (
    <IonModal
      isOpen={isOpen}
      cssClass="small-modal"
      backdropDismiss={false}
      keepContentsMounted
      onDidDismiss={onDismiss}
    >
      <IonContent className="modal-body">
        <div className="modal-header">
          <IonButton fill="clear" onClick={onDismiss}>
            {t("datetime.cancel")}
          </IonButton>
          <IonText className="modal-title">{t("datetime.title")}</IonText>
          <IonButton fill="clear" onClick={() => onConfirm(selectedDateTime)}>
            {t("datetime.done")}
          </IonButton>
        </div>
        <IonDatetime
          presentation="time"
          preferWheel
          hourCycle="h23"
          value={selectedDateTime}
          onIonChange={handleDateTimeChange}
          className="modal-content"
          locale={locale}
        />
      </IonContent>
    </IonModal>
  );
};

export default DateTimeModal;
