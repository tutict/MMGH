import React, { useCallback, useEffect, useRef, useState } from "react";
import BulletScreen from "rc-bullets";
import { IonButton, IonButtons, IonInput, IonRow, IonText } from "@ionic/react";
import "../CSS/Danmu.css";

const BULLET_OPTIONS = {
  duration: 40,
  trackHeight: 48,
  range: [0, 1],
};

const Danmu = () => {
  const [bullet, setBullet] = useState("");
  const [error, setError] = useState("");
  const screenContainerRef = useRef(null);
  const bulletScreenRef = useRef(null);

  useEffect(() => {
    if (!screenContainerRef.current) {
      return;
    }

    bulletScreenRef.current = new BulletScreen(
      screenContainerRef.current,
      BULLET_OPTIONS
    );

    return () => {
      bulletScreenRef.current?.destroy?.();
      bulletScreenRef.current = null;
    };
  }, []);

  const handleChange = useCallback(
    (event) => {
      setBullet(event.detail.value ?? "");
      if (error) {
        setError("");
      }
    },
    [error]
  );

  const pushBullet = useCallback(() => {
    const message = bullet.trim();

    if (!message) {
      setError("请输入弹幕内容");
      return;
    }

    if (!bulletScreenRef.current) {
      return;
    }

    bulletScreenRef.current.push({
      msg: message,
      size: "large",
      color: "#ffffff",
      backgroundColor: "rgba(20, 20, 20, 0.65)",
    });

    setBullet("");
  }, [bullet]);

  const handleKeyUp = useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        pushBullet();
      }
    },
    [pushBullet]
  );

  const isSendDisabled = !bullet.trim() || !bulletScreenRef.current;

  return (
    <section className="danmu-container">
      <IonRow className="danmu-controls">
        <IonInput
          className="danmu-input"
          value={bullet}
          placeholder="请输入弹幕内容..."
          clearOnEdit={false}
          enterkeyhint="send"
          inputmode="text"
          onIonChange={handleChange}
          onKeyUp={handleKeyUp}
        />
        <IonButtons>
          <IonButton onClick={pushBullet} disabled={isSendDisabled}>
            发送
          </IonButton>
        </IonButtons>
      </IonRow>
      {error && (
        <IonText className="danmu-error" role="alert">
          {error}
        </IonText>
      )}
      <div
        ref={screenContainerRef}
        className="danmu-screen"
        aria-live="polite"
      />
    </section>
  );
};

export default Danmu;
