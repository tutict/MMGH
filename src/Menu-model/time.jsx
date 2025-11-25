import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IonButton, IonContent, IonIcon, IonPage } from "@ionic/react";
import { alarmOutline } from "ionicons/icons";
import "../CSS/menu.css";
import Menu from "./Menu";
import DateTimeModel from "./DateTimeModel";

const Clock = () => {
  const [time, setTime] = useState(new Date());
  const [alarmTime, setAlarmTime] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isRinging, setIsRinging] = useState(false);

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
      alert("闹钟时间到啦！");
    }
  }, [alarmTime, isRinging, time]);

  const playAudio = useCallback(() => {
    const audio = new Audio("/é—¹é’Ÿ2-å“”å£°_çˆ±ç»™ç½‘_aigei_com.mp3");
    audio.autoplay = true;
    audio.play().catch((err) => console.error("播放失败", err));
  }, []);

  const formattedTime = useMemo(
    () => time.toLocaleTimeString("zh-CN", { hour12: false }),
    [time]
  );

  const formattedDate = useMemo(
    () =>
      time.toLocaleDateString("zh-CN", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [time]
  );

  return (
    <IonPage>
      <IonContent className="content-background-menu ion-padding">
        <Menu />
        <section className="clock-wrapper glass-panel">
          <header className="panel-header">
            <div>
              <p className="panel-eyebrow">现在时间</p>
              <h1>{formattedTime}</h1>
            </div>
            <IonButton
              shape="round"
              onClick={() => setShowModal(true)}
              className="clock-action"
            >
              <IonIcon icon={alarmOutline} slot="start" />
              设置闹钟
            </IonButton>
          </header>
          <p className="panel-hint">{formattedDate}</p>

          <div className="clock-alarm-info">
            {alarmTime ? (
              <>
                <span>下一次提醒</span>
                <strong>
                  {new Date(alarmTime).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </>
            ) : (
              <span>暂未设置闹钟</span>
            )}
          </div>
        </section>

        <DateTimeModel
          isOpen={showModal}
          onDismiss={() => setShowModal(false)}
          onConfirm={(newDate) => {
            setAlarmTime(newDate);
            setShowModal(false);
            setIsRinging(false);
          }}
          selectedDate={alarmTime}
        />
      </IonContent>
    </IonPage>
  );
};

export default Clock;
