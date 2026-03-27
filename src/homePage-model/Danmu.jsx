import React, { useCallback, useEffect, useRef, useState } from "react";
import BulletScreen from "rc-bullets";
import { IonButton, IonButtons, IonInput, IonRow, IonText } from "@ionic/react";
import "../CSS/Danmu.css";
import { useI18n } from "../i18n";
import { addNote, listNotes } from "../storage/notes";

const BULLET_OPTIONS = {
  duration: 40,
  trackHeight: 48,
  range: [0, 1],
};

const Danmu = () => {
  const { t } = useI18n();
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

    listNotes({ limit: 6 })
      .then((items) => {
        const notes = Array.isArray(items) ? items : [];
        const recent = notes.slice().reverse();
        recent.forEach((note, index) => {
          setTimeout(() => {
            bulletScreenRef.current?.push({
              msg: note.content,
              size: "large",
              color: "#ffffff",
              backgroundColor: "rgba(20, 20, 20, 0.65)",
            });
          }, 200 * index);
        });
      })
      .catch(() => null);

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

  const pushBullet = useCallback(async () => {
    const message = bullet.trim();

    if (!message) {
      setError(t("danmu.error.empty"));
      return;
    }

    if (!bulletScreenRef.current) {
      return;
    }

    try {
      await addNote({ content: message });
    } catch (err) {
      console.error("Failed to save note", err);
    }

    bulletScreenRef.current.push({
      msg: message,
      size: "large",
      color: "#ffffff",
      backgroundColor: "rgba(20, 20, 20, 0.65)",
    });

    setBullet("");
  }, [bullet, t]);

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
          placeholder={t("danmu.placeholder")}
          clearOnEdit={false}
          enterkeyhint="send"
          inputmode="text"
          onIonChange={handleChange}
          onKeyUp={handleKeyUp}
        />
        <IonButtons>
          <IonButton onClick={pushBullet} disabled={isSendDisabled}>
            {t("danmu.send")}
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
