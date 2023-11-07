import {IonButton, IonContent, IonDatetime, IonModal} from "@ionic/react";
import React from "react";
const DateTimeModal = ({ isOpen, onDismiss, onConfirm, selectedDate }) => {
    // 临时存储用户选择的时间
    const [tempDate, setTempDate] = React.useState(selectedDate);

    // 处理时间变化
    const handleTimeChange = (e) => {
        // 这里假设你已经处理了时间字符串转换为 ISO 8601 字符串的逻辑
        setTempDate(e.detail.value);
    };

    return (
        <IonModal
            isOpen={isOpen}
            cssClass='my-custom-class'
            onDidDismiss={onDismiss} // 当模态框关闭时触发
            backdropDismiss={true} // 允许点击背景来关闭模态框
        >
            <IonContent>
                <IonDatetime
                    displayFormat="HH:mm"
                    pickerFormat="HH:mm"
                    value={tempDate}
                    onIonChange={handleTimeChange}
                />
                <IonButton onClick={onDismiss}>取消</IonButton>
                <IonButton onClick={() => onConfirm(tempDate)}>确认</IonButton>
            </IonContent>
        </IonModal>
    );
};

export default DateTimeModal;
