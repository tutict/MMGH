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
    const [clickCount, setClickCount] = useState(0); // 新增点击次数状态

    useEffect(() => {
        const handleBodyClick = (event) => {
            // 假设模态框的元素有一个特定的类名，例如 "my-modal"
            const modalElement = document.querySelector('.small-modal');

            // 更新点击次数
            setClickCount(count => count + 1);

            // 检查点击事件的目标是否是模态框元素或其子元素
            if (modalElement && !modalElement.contains(event.target)) {

                if(clickCount === 1) {

                    // 如果点击目标不是模态框或其子元素，关闭模态框
                    onDismiss();
                    setClickCount(0);
                }
            }
        };

        // 添加点击事件监听器
        document.body.addEventListener('click', handleBodyClick);

        // 清理函数，移除事件监听器
        return () => document.body.removeEventListener('click', handleBodyClick);
    }, [onDismiss, clickCount]); // 仅在 onDismiss 变化时重新运行 effect

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
            selectedDate={currentDateTime}
            backdropDismiss={true}
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
