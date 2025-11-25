import React, { useEffect, useState } from "react";
import { IonButton, IonContent, IonDatetime, IonModal } from "@ionic/react";
import "../CSS/DateTimeModel.css";

const getCurrentDateTime = () => {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 8);
  return now.toISOString();
};

const DateTimeModal = ({ isOpen, onDismiss, onConfirm }) => {
  const [selectedDateTime, setSelectedDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    setSelectedDateTime(getCurrentDateTime());
    const intervalId = setInterval(() => {
      setSelectedDateTime(getCurrentDateTime());
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const handleDateTimeChange = (event) => {
    setSelectedDateTime(event.detail.value);
  };

  return (
    <IonModal
      isOpen={isOpen}
      cssClass="small-modal"
      backdropDismiss
      onDidDismiss={onDismiss}
    >
      <IonContent className="modal-body">
        <IonDatetime
          presentation="time"
          value={selectedDateTime}
          onIonChange={handleDateTimeChange}
          className="modal-content"
        />
        <div className="modal-actions">
          <IonButton fill="outline" onClick={onDismiss}>
            取消
          </IonButton>
          <IonButton onClick={() => onConfirm(selectedDateTime)}>确认</IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default DateTimeModal;
