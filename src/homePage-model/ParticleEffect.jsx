import { memo, useCallback, useMemo } from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

const ParticlesComponent = ({
  id = "homepage-particles",
  className,
  color = "#f5f7ff",
  linkColor,
  backgroundColor = "transparent",
  density = 42,
}) => {
  const particleColor = useMemo(() => color || "#f5f7ff", [color]);
  const particleLinkColor = useMemo(
    () => linkColor || particleColor,
    [linkColor, particleColor]
  );

  const options = useMemo(
    () => ({
      background: {
        color: { value: backgroundColor },
      },
      detectRetina: false,
      fpsLimit: 60,
      fullScreen: {
        enable: false,
      },
      pauseOnBlur: true,
      pauseOnOutsideViewport: true,
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: false, mode: "repulse" },
          resize: true,
        },
        modes: {
          push: { quantity: 2 },
          repulse: { distance: 80, duration: 0.4 },
        },
      },
      particles: {
        color: { value: particleColor },
        links: {
          enable: true,
          color: particleLinkColor,
          distance: 110,
          opacity: 0.22,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.8,
          direction: "none",
          outModes: { default: "out" },
        },
        number: {
          value: density,
          limit: 120,
          density: { enable: true, area: 1200 },
        },
        opacity: { value: { min: 0.35, max: 0.7 } },
        size: { value: { min: 1.4, max: 2.8 } },
        shadow: {
          enable: false,
          color: particleColor,
          blur: 8,
          offset: { x: 0, y: 0 },
        },
      },
      responsive: [
        {
          maxWidth: 1024,
          options: {
            particles: {
              number: { value: Math.max(28, Math.round(density * 0.7)) },
              links: { distance: 100, opacity: 0.2, width: 1 },
            },
          },
        },
        {
          maxWidth: 640,
          options: {
            particles: {
              number: { value: Math.max(18, Math.round(density * 0.5)) },
              links: { distance: 80, opacity: 0.18, width: 1 },
              move: { speed: 0.6 },
            },
          },
        },
      ],
    }),
    [backgroundColor, density, particleColor, particleLinkColor]
  );

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const mergedClassName = ["particles-layer", className].filter(Boolean).join(" ");

  return (
    <Particles id={id} init={particlesInit} options={options} className={mergedClassName} />
  );
};

export default memo(ParticlesComponent);
