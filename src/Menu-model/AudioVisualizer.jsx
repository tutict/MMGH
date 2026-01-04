import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const AudioVisualizer = ({ audioSrc, audioElement }) => {
  const mountRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const currentAudioElementRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef(null);
  const basePositionsRef = useRef(null);
  const rafRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) {
      return undefined;
    }

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    camera.position.z = 3;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    const particleCount = 1200;
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i += 1) {
      const idx = i * 3;
      const x = (Math.random() - 0.5) * 1.6;
      const y = (Math.random() - 0.5) * 1.2;
      const z = (Math.random() - 0.5) * 1.6;

      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      basePositions[idx] = x;
      basePositions[idx + 1] = y;
      basePositions[idx + 2] = z;

      colors[idx] = 0.6 + Math.random() * 0.4;
      colors[idx + 1] = 0.6 + Math.random() * 0.4;
      colors[idx + 2] = 0.8 + Math.random() * 0.2;
    }

    basePositionsRef.current = basePositions;

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particlesGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    particlesRef.current = particles;
    scene.add(particles);

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) {
        return;
      }
      const width = mountRef.current.offsetWidth || 1;
      const height = mountRef.current.offsetHeight || width;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountRef.current);
    resizeObserverRef.current = resizeObserver;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      const geometry = particles.geometry;
      const geometryPositions = geometry.attributes.position.array;
      const basePositions = basePositionsRef.current;
      const count = geometry.attributes.position.count;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        const dataLength = dataArray.length;
        const lowBins = Math.min(12, dataLength);
        let lowSum = 0;
        for (let i = 0; i < lowBins; i += 1) {
          lowSum += dataArray[i];
        }
        const lowEnergy = lowSum / (lowBins * 255);

        for (let i = 0; i < count; i += 1) {
          const freqIndex = dataArray[i % dataLength] / 255;
          const boosted = Math.min(1, freqIndex * 0.85 + lowEnergy * 0.8);
          const intensity = Math.pow(boosted, 0.75);
          const baseIdx = i * 3 + 1;
          geometryPositions[baseIdx] =
            basePositions[baseIdx] + intensity * 1.35;
        }

        geometry.attributes.position.needsUpdate = true;
      }

      particles.rotation.y += 0.0015;
      particles.rotation.x += 0.0008;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      resizeObserverRef.current?.disconnect();

      particlesGeometry.dispose();
      particlesMaterial.dispose();

      if (rendererRef.current?.domElement?.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(
          rendererRef.current.domElement
        );
      }

      rendererRef.current?.dispose();
      scene.clear();
    };
  }, []);

  useEffect(() => {
    const externalAudio = audioElement ?? null;
    let createdAudio = null;
    let activeAudio = externalAudio;

    if (!activeAudio && audioSrc) {
      createdAudio = new Audio(audioSrc);
      createdAudio.crossOrigin = "anonymous";
      createdAudio.preload = "auto";
      activeAudio = createdAudio;
    }

    if (!activeAudio) {
      if (audioRef.current && audioRef.current !== externalAudio) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      audioRef.current = null;
      return undefined;
    }

    activeAudio.crossOrigin = "anonymous";
    audioRef.current = activeAudio;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.55;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;
      dataArrayRef.current = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );
    }

    if (currentAudioElementRef.current !== activeAudio) {
      sourceRef.current?.disconnect();
      sourceRef.current = audioContextRef.current.createMediaElementSource(
        activeAudio
      );
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      currentAudioElementRef.current = activeAudio;
    }

    const resumeOnPlay = () => {
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    };
    activeAudio.addEventListener("play", resumeOnPlay);

    if (createdAudio) {
      createdAudio.load();
    }

    return () => {
      activeAudio.removeEventListener("play", resumeOnPlay);
      if (createdAudio) {
        createdAudio.pause();
        createdAudio.src = "";
      }
    };
  }, [audioSrc, audioElement]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return <div ref={mountRef} className="audio-visualizer" />;
};

export default AudioVisualizer;
