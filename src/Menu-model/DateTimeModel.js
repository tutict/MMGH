import {IonButton, IonContent, IonDatetime, IonModal} from "@ionic/react";
import React, {useEffect, useState} from "react";
import "../CSS/DateTimeModel.css";


const DateTimeModal = ({ isOpen, onDismiss, onConfirm }) => {

    // 获取当前的日期和时间，并格式化为 ISO 字符串
    const currentDateTime = () => {
        const now = new Date();
        // 北京时间比 UTC 时间快8小时
        now.setUTCHours(now.getUTCHours() + 8);
        return now.toISOString();
    };

    // 状态来存储用户选择的日期和时间
    const [selectedDateTime, setSelectedDateTime] = useState(currentDateTime());

    useEffect(() => {
        // 每分钟更新北京时间
        const intervalId = setInterval(() => {
            setSelectedDateTime(currentDateTime());
        }, 60000); // 60000 毫秒（1分钟）

        // 清除定时器
        return () => clearInterval(intervalId);
    }, []);

    // 处理日期时间变化
    const handleDateTimeChange = (event) => {
        setSelectedDateTime(event.detail.value);
    };

    return (
        <IonModal
            isOpen={isOpen}
            cssClass="small-modal"
            onDidDismiss={onDismiss} // 当模态框关闭时触发
            backdropDismiss={true} // 允许点击背景来关闭模态框
            selectedDate={currentDateTime}
        >
            <IonContent>
                <IonDatetime
                    displayFormat="HH:mm"
                    pickerFormat="HH:mm"
                    value={selectedDateTime}
                    onIonChange={handleDateTimeChange}
                    className="modal-content"
                />
                <IonButton className="modal-button-left" onClick={onDismiss}>取消</IonButton>
                <IonButton className="modal-button-right" onClick={() => onConfirm(selectedDateTime)}>确认</IonButton>
            </IonContent>
        </IonModal>
    );
};

export default DateTimeModal;
