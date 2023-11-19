import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const AudioVisualizer = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 300;
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        mountRef.current.appendChild(renderer.domElement);

        const heartShape = new THREE.Shape();

        heartShape.moveTo(25, 25);
        heartShape.bezierCurveTo(25, 25, 20, 0, 0, 0);
        heartShape.bezierCurveTo(-30, 0, -30, 35, -30, 35);
        heartShape.bezierCurveTo(-30, 55, -10, 77, 25, 95);
        heartShape.bezierCurveTo(60, 77, 80, 55, 80, 35);
        heartShape.bezierCurveTo(80, 35, 80, 0, 50, 0);
        heartShape.bezierCurveTo(35, 0, 25, 25, 25, 25);

        const geometry = new THREE.ExtrudeGeometry(heartShape, { depth: 2, bevelEnabled: true });
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const heart = new THREE.Mesh(geometry, material);
        heart.rotation.x = Math.PI;
        scene.add(heart);

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };

        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });


        return () => {
            mountRef.current.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={mountRef}></div>;
};

export default AudioVisualizer;
