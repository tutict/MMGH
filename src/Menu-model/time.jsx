import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IonButton, IonContent, IonIcon, IonPage } from "@ionic/react";
import { alarmOutline } from "ionicons/icons";
import "../CSS/menu.css";
import Menu from "./Menu";
import DateTimeModel from "./DateTimeModel";
import { useI18n } from "../i18n";

const Clock = () => {
  const { t, lang } = useI18n();
  const [time, setTime] = useState(new Date());
  const [alarmTime, setAlarmTime] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

  const playAudio = useCallback(() => {
    const audio = new Audio(
      encodeURI("/闹钟2-哔声_爱给网_aigei_com.mp3")
    );
    audio.autoplay = true;
    audio.play().catch((err) => console.error("播放失败", err));
  }, []);

  useEffect(() => {
    const timerID = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerID);
  }, []);

  useEffect(() => {
    if (!alarmTime) {
      return;
    }
    const currentTime = time.toTimeString().substring(0, 5);
    const alarmTimeFormatted = new Date(alarmTime).toTimeString().substring(0, 5);

    if (currentTime === alarmTimeFormatted && !isRinging) {
      setIsRinging(true);
      playAudio();
      setTimeout(() => {
        setIsRinging(false);
        setAlarmTime("");
      }, 60000);
      alert(t("time.alert.ring"));
    }
  }, [alarmTime, isRinging, time, t, playAudio]);

  const formattedTime = useMemo(
    () => time.toLocaleTimeString(lang, { hour12: false }),
    [time, lang]
  );

  const formattedDate = useMemo(
    () =>
      time.toLocaleDateString(lang, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [time, lang]
  );

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <div className="page-shell">
          <Menu />
          <section className="clock-wrapper glass-panel">
            <header className="clock-header">
              <div className="clock-time-block">
                <h1 className="clock-time">{formattedTime}</h1>
                <p className="clock-date">{formattedDate}</p>
              </div>
            </header>

            <div className="clock-alarm-card">
              <div className="clock-alarm-meta">
                <span className="clock-alarm-title">{t("time.alarm.title")}</span>
                {alarmTime ? (
                  <strong className="clock-alarm-time">
                    {new Date(alarmTime).toLocaleTimeString(lang, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                ) : (
                  <span className="clock-alarm-empty">
                    {t("time.alarm.empty")}
                  </span>
                )}
              </div>
              <IonButton
                shape="round"
                onClick={() => setShowModal(true)}
                className="clock-alarm-button"
              >
                <IonIcon icon={alarmOutline} slot="start" />
                {alarmTime ? t("time.alarm.edit") : t("time.alarm.set")}
              </IonButton>
            </div>
          </section>
        </div>

        <DateTimeModel
          isOpen={showModal}
          onDismiss={() => setShowModal(false)}
          onConfirm={(newDate) => {
            setAlarmTime(newDate);
            setShowModal(false);
            setIsRinging(false);
          }}
          selectedDate={alarmTime}
          locale={lang}
        />
      </IonContent>
    </IonPage>
  );
};

export default Clock;
