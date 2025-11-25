import { memo, useCallback, useMemo } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

const ParticlesComponent = ({
  id = "homepage-particles",
  color = "#f5f7ff",
  linkColor,
  backgroundColor = "transparent",
  density = 32,
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
      detectRetina: true,
      fpsLimit: 120,
      fullScreen: {
        enable: true,
        zIndex: 0,
      },
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: true, mode: "repulse" },
          resize: true,
        },
        modes: {
          push: { quantity: 4 },
          repulse: { distance: 80, duration: 0.4 },
        },
      },
      particles: {
        color: { value: particleColor },
        links: {
          enable: true,
          color: particleLinkColor,
          distance: 90,
          opacity: 0.45,
          width: 1,
        },
        move: {
          enable: true,
          speed: { min: 0.5, max: 2.2 },
          direction: "none",
          outModes: { default: "out" },
        },
        number: {
          value: density,
          limit: 120,
          density: { enable: true, area: 900 },
        },
        opacity: { value: { min: 0.3, max: 0.8 } },
        size: { value: { min: 1, max: 3 } },
      },
    }),
    [backgroundColor, density, particleColor, particleLinkColor]
  );

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  return <Particles id={id} init={particlesInit} options={options} />;
};

export default memo(ParticlesComponent);
