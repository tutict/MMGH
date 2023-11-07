import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim"; // loads tsparticles-slim
import { loadFull } from "tsparticles"; // loads tsparticles
import {useCallback, useMemo} from "react";

// tsParticles 仓库：https://github.com/matteobruni/tsparticles
// tsParticles 网站：https://particles.js.org/
const ParticlesComponent = (props) => {
    // 使用 useMemo 不是必须的，但由于这个值可以被记忆，所以推荐使用
    const options = useMemo(() => {
        // 使用空的选项对象将加载默认选项，这些默认选项是静态的粒子，没有背景，半径为3px，透明度为100%，颜色为白色
        // 所有的选项可以在这里找到：https://particles.js.org/docs/interfaces/Options_Interfaces_IOptions.IOptions.html
        return {
            fullScreen: {
                enable: true, // 启用此功能将使画布填满整个屏幕，这是默认启用的
                zIndex: 0, // 当启用 fullScreen 时使用的 z-index 值，默认为0
            },
            interactivity: {
                events: {
                    onClick: {
                        enable: true, // 启用点击事件
                        mode: "push", // 点击时增加粒子
                    },
                    onHover: {
                        enable: true, // 启用悬停事件
                        mode: "repulse", // 使粒子从光标处逃跑
                    },
                },
                modes: {
                    push: {
                        quantity: 5, // 点击时添加的粒子数量
                    },
                    repulse: {
                        distance: 50, // 粒子与光标的距离
                    },
                },
            },
            particles: {
                number:{
                    density:{
                        enable: true,
                        area: 800,
                    },
                    value: 50,
                    max: 150,
                },
                links: {
                    enable: true, // 启用此功能将连接粒子
                    distance: 80, // 连接粒子的最大距离
                },
                move: {
                    enable: true, // 启用此功能将在画布中移动粒子
                    speed: { min: 1, max: 5 }, // 在速度值中使用范围会使粒子以min/max值之间的随机速度移动，每个粒子都有自己的值，默认情况下它不会随时间变化
                },
                opacity: {
                    value: { min: 0.3, max: 0.7 }, // 使用不同的透明度，以获得一些半透明效果
                },
                size: {
                    value: { min: 1, max: 3 }, // 让我们稍微随机化一下粒子的大小
                },
            },
        };
    }, []);

    // 使用 useCallback 不是必须的，但由于这个回调可以被记忆，所以推荐使用
    const particlesInit = useCallback((engine) => {
        loadFull(engine);
        // 在这个示例中，精简版本就足够了，选择你更喜欢的版本，精简版本体积更小，但没有所有的插件和鼠标轨迹功能
    }, []);

    // 设置一个 id 可以方便地识别正确的粒子组件，这对于多个实例或可重用的组件非常有用
    return <Particles id={props.id} init={particlesInit} options={options} />;
};

export default ParticlesComponent;