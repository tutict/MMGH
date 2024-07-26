import React, { useState, useEffect } from 'react';
import { IonButton, IonContent, IonGrid, IonRow } from '@ionic/react';
import '../CSS/menu.css';
import Menu from "./Menu";
import DateTimeModel from "./DateTimeModel";

const Clock = () => {
    const [time, setTime] = useState(new Date());
    const [alarmTime, setAlarmTime] = useState('');
    const [showModel, setShowModel] = useState(false);

    useEffect(() => {
        const timerID = setInterval(() => tick(), 1000);

        // 检查是否到达了设定的闹钟时间，如果是，则触发通知
        checkForAlarm();

        return () => {
            clearInterval(timerID);
        };
    }, [time, alarmTime]);

    const tick = () => {
        setTime(new Date());
    };

    const playAudio = () => {
        const audio = new Audio('/闹钟2-哔声_爱给网_aigei_com.mp3');
        audio.autoplay = true;
        audio.play().catch((err) => console.error("播放失败",err));
    };

    const checkForAlarm = () => {
        // 如果当前时间等于闹钟时间，则触发一些事件，例如震动或声音
        if (alarmTime) {
            const currentTime = time.toTimeString().substring(0, 5);
            const alarmTimeFormatted = new Date(alarmTime).toTimeString().substring(0, 5);

            // 如果当前时间等于闹钟时间
            if (currentTime === alarmTimeFormatted) {
                // 触发事件，例如震动

                // 播放声音或其他操作

                playAudio();

                alert('闹钟响了！');
                // 然后清除闹钟，或者根据你的应用逻辑处理
                setAlarmTime('');
            }
        }
    };

    return (
        <IonContent class="content-background-menu">
            <Menu />
            <IonGrid class="glass-effect-menu middle">
                <IonRow>
                    <h1>{time.toLocaleTimeString()}</h1>
                </IonRow>
                <IonRow>
                    <IonButton onClick={() => setShowModel(true)}>设置闹钟</IonButton>
                </IonRow>
            </IonGrid>

            {/* 模态对话框 */}
            <DateTimeModel
                isOpen={showModel}
                onDismiss={() => setShowModel(false)}
                onConfirm={(newDate) => {
                    setAlarmTime(newDate); // 在此处设置新的警报时间
                    setShowModel(false);   // 关闭模态对话框
                }}
                selectedDate={alarmTime}
            />
        </IonContent>
    );
};

export default Clock;
