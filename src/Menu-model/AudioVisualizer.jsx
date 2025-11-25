import React, { useEffect, useRef } from "react";
import * as THREE from "three";

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
    if (!mountRef.current) {
      return;
    }

    const width = mountRef.current.offsetWidth;
    const height = mountRef.current.offsetHeight || width;

    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    }
  };

  useEffect(() => {
    audioRef.current = new Audio(audioSrc);
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.load();

    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

    const source = audioContextRef.current.createMediaElementSource(audioRef.current);
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    sceneRef.current = new THREE.Scene();
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current.position.z = 3;

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    mountRef.current?.appendChild(rendererRef.current.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(2000);
    const colors = new Float32Array(2000);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1.5;
      positions[i + 1] = (Math.random() - 0.5) * 1.5;
      positions[i + 2] = (Math.random() - 0.5) * 1.5;

      colors[i] = Math.random();
      colors[i + 1] = Math.random();
      colors[i + 2] = Math.random();
    }
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    sceneRef.current.add(particles);

    const animate = () => {
      requestAnimationFrame(animate);

      if (audioRef.current.readyState >= 2) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
          const frequencyIndex = dataArrayRef.current[i];
          const intensity = frequencyIndex / 255;
          const x = particlesGeometry.attributes.position.array[i * 3];
          const z = particlesGeometry.attributes.position.array[i * 3 + 2];

          positions[i * 3] = x;
          positions[i * 3 + 1] = intensity * 1.5;
          positions[i * 3 + 2] = z;
        }

        particlesGeometry.attributes.position.needsUpdate = true;
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    animate();

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      audioRef.current.pause();
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
        audioContextRef.current.close();
      }
      window.removeEventListener("resize", handleResize);
      if (rendererRef.current?.domElement?.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
      }
    };
  }, [audioSrc]);

  return <div ref={mountRef} className="audio-visualizer" />;
};

export default AudioVisualizer;
