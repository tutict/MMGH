import React, { useState, useRef, useEffect } from "react";
import BulletScreen from "rc-bullets";
import {IonButton, IonButtons, IonInput, IonRow} from "@ionic/react";
import '../CSS/Danmu.css';
// ... 其他引入的部分保持不变

export default function Danmu() {
    const [bullet, setBullet] = useState('');
    const screenContainerRef = useRef(null); // 用于绑定容器元素
    const bulletScreenRef = useRef(null); // 用于存储 BulletScreen 实例

    // 使用 useEffect 确保在组件挂载后进行 BulletScreen 的初始化
    useEffect(() => {
        // 确认容器 div 已经渲染且 bulletScreenRef 尚未初始化
        const timer = setTimeout(() => {
            if (screenContainerRef.current && !bulletScreenRef.current) {
                bulletScreenRef.current = new BulletScreen(screenContainerRef.current, { duration: 50 });
            }
        }, 100);

        return () => clearTimeout(timer); // 清除定时器
    }, []); // 依赖列表为空，因为我们只希望在挂载时执行这段逻辑

    const handleChange = (event) => {
        setBullet(event.detail.value);
    };

    const handleSend = () => {
        if (bullet.trim()) {
            bulletScreenRef.current?.push({ // 现在我们在这里使用 bulletScreenRef
                msg: bullet,
                size: "large",
                backgroundColor: "rgba(2,2,2,.3)"
            });
            setBullet(''); // 清除输入
        } else {
            alert('请输入弹幕内容');
        }
    };

    return (
        <main>
            <IonRow class="top">
                {/* 输入和按钮部分 */}
                <IonInput value={bullet} placeholder="请输入弹幕内容" onIonChange={handleChange} style={{ color: 'white', width: '200px' }} />
                <IonButtons>
                    <IonButton onClick={handleSend}>发送</IonButton>
                </IonButtons>

                {/* 弹幕显示部分 */}
                <div ref={screenContainerRef} className="screen" style={{ width: '100vw', height: '180px' }}></div>
            </IonRow>
        </main>
    );
}
