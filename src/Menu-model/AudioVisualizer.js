import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const AudioVisualizer = ({ audioSrc }) => {
    const mountRef = useRef(null);
    const audioRef = useRef(new Audio(audioSrc));
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);

    const handleResize = () => {
        const width = mountRef.current.offsetWidth;
        const height = mountRef.current.offsetHeight;
        if (cameraRef.current && rendererRef.current) {
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        }
    };

    useEffect(() => {
        // 创建新的 Audio 实例并加载音频
        audioRef.current = new Audio(audioSrc);
        audioRef.current.crossOrigin = "anonymous"; // 防止跨域问题
        audioRef.current.load();

        // 初始化音频上下文和分析器
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        // 连接音频元素到分析器
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);

        // 初始化 THREE.js 场景、相机和渲染器
        sceneRef.current = new THREE.Scene();
        cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        cameraRef.current.position.z = 3;

        rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        mountRef.current.appendChild(rendererRef.current.domElement);
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);

        // 创建简单的点粒子几何体和材质
        const particlesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(2000); // 假设有2000个粒子
        const colors = new Float32Array(2000);
        for (let i = 0; i < positions.length; i += 3) {
            const x = (Math.random() - 0.5) * 1.5; // 随机位置
            const y = (Math.random() - 0.5) * 1.5;
            const z = (Math.random() - 0.5) * 1.5;
            positions[i] = x;
            positions[i + 1] = y;
            positions[i + 2] = z;

            // 随机颜色
            colors[i] = Math.random();
            colors[i + 1] = Math.random();
            colors[i + 2] = Math.random();
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particlesMaterial = new THREE.PointsMaterial({ size: 0.02, vertexColors: true });
        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        sceneRef.current.add(particles);

        // 设置动画循环
        const animate = () => {
            requestAnimationFrame(animate);

            if (audioRef.current.readyState >= 2) { // 确保音频已加载
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);

                // 假设您的 particlesGeometry.attributes.position.count 是 2000
                for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
                    const frequencyIndex = dataArrayRef.current[i];
                    const intensity = frequencyIndex / 255;

                    // 更新粒子位置，根据频率强度计算 Y 值
                    const x = particlesGeometry.attributes.position.array[i * 3];
                    const y = intensity * 1.5; // Y值根据频率强度计算
                    const z = particlesGeometry.attributes.position.array[i * 3 + 2];

                    // 直接更新 positions 数组
                    positions[i * 3] = x;
                    positions[i * 3 + 1] = y;
                    positions[i * 3 + 2] = z;
                }

                // 更新 BufferAttribute 通知 Three.js 属性已更改
                particlesGeometry.attributes.position.needsUpdate = true;
            }

            rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        animate();

        // 监听窗口调整大小事件
        window.addEventListener('resize', handleResize);

        // 组件卸载时的清理逻辑
        return () => {
            audioRef.current.pause();
            if (audioContextRef.current) {
                audioContextRef.current.suspend(); // 挂起音频上下文，防止自动播放
                audioContextRef.current.close();
            }
            window.removeEventListener('resize', handleResize);
            if (rendererRef.current) {
                rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
            }
        };
    }, [audioSrc]); // 仅当 audioSrc 更改时重新运行

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }}></div>;
};

export default AudioVisualizer;
