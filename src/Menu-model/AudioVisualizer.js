import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import '../CSS/menu.css';

const AudioVisualizer = ({ audioSrc }) => {
    const mountRef = useRef(null);
    const audioRef = useRef(new Audio(audioSrc));
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);

    useEffect(() => {
        // 创建新的Audio实例
        audioRef.current = new Audio(audioSrc);
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

        const playAudio = () => {
            audioRef.current.play().catch(e => console.error('Error playing audio:', e));
        };
        audioRef.current.addEventListener('canplaythrough', playAudio);

        // 初始化THREE.js场景和动画循环
        const container = document.querySelector('.audioVisual-box');
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.set(20, -50, 120);

        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        // 创建心形和粒子系统
        // 创建心形和粒子系统
        const heartShape = new THREE.Shape();
        heartShape.moveTo(25, -25); // 起点调整为负值
        heartShape.bezierCurveTo(25, -25, 20, 0, 0, 0);
        heartShape.bezierCurveTo(-30, 0, -30, -35, -30, -35); // 控制点和结束点调整为负值
        heartShape.bezierCurveTo(-30, -55, -10, -77, 25, -95); // 控制点和结束点调整为负值
        heartShape.bezierCurveTo(60, -77, 80, -55, 80, -35); // 控制点和结束点调整为负值
        heartShape.bezierCurveTo(80, -35, 80, 0, 50, 0);
        heartShape.bezierCurveTo(35, 0, 25, -25, 25, -25); // 控制点调整为负值


        const points = heartShape.getPoints(1000);
        const particlesGeometry = new THREE.BufferGeometry();
        const posArray = new Float32Array(points.length * 3);
        const colorsArray = new Float32Array(points.length * 3);

        const offset = 8;

        points.forEach((point, i) => {
            const index = i * 3;
            posArray[index] = point.x + (Math.random() - 0.5) * offset;
            posArray[index + 1] = point.y + (Math.random() - 0.5) * offset;
            posArray[index + 2] = (Math.random() - 0.5) * offset; // Z坐标也加上偏移

            // 设置颜色为红色
            colorsArray[index] = 1;    // R
            colorsArray[index + 1] = 0; // G
            colorsArray[index + 2] = 0; // B
        });

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

        const particlesMaterial = new THREE.PointsMaterial({ size: 0.5, vertexColors: true });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        const animate = () => {
            requestAnimationFrame(animate);

            if (audioRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);

                const positions = particlesGeometry.attributes.position.array;
                const colors = particlesGeometry.attributes.color.array;

                const particleCount = positions.length / 3;
                const dataLength = dataArrayRef.current.length;

                for (let i = 0; i < particleCount; i++) {
                    const index = i * 3;
                    const frequencyIndex = Math.floor(dataLength * i / particleCount);
                    const intensity = dataArrayRef.current[frequencyIndex] / 128.0; // 音频强度

                    positions[index + 1] = posArray[index + 1] + intensity * 5.0; // 在Y轴上移动粒子

                    colors[index] = intensity; // R
                    colors[index + 1] = 0; // G
                    colors[index + 2] = 1 - intensity; // B
                }

                particlesGeometry.attributes.position.needsUpdate = true;
                particlesGeometry.attributes.color.needsUpdate = true;
            }

            renderer.render(scene, camera);
        };
        animate();

        // 窗口调整大小事件处理
        const handleResize = () => {
            const newWidth = container.offsetWidth;
            const newHeight = container.offsetHeight;
            renderer.setSize(newWidth, newHeight);
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
        };

        window.addEventListener('resize', handleResize);

        const cleanup = () => {
            if (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };

        return cleanup;
    }, [audioSrc]);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }}></div>;
};

export default AudioVisualizer;
