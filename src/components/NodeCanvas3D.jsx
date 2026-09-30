import { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import DataNodes from "./DataNodes";
import ConnectionLines from "./ConnectionLines";
import OrbitalRings from "./OrbitalRings";
import ParticleField from "./ParticleField";

// ─── Responsive camera config ─────────────────────────────────────────────────
function useCameraConfig() {
  const [config, setConfig] = useState(() => getCameraConfig(window.innerWidth));

  useEffect(() => {
    function handleResize() {
      setConfig(getCameraConfig(window.innerWidth));
    }
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return config;
}

function getCameraConfig(width) {
  const canvasWidth = width >= 768 ? width - 320 : width;

  // xs: phones < 480
  if (canvasWidth < 480) {
    return {
      position: [0, 3, 18],
      fov: 70,
      minDistance: 7,
      maxDistance: 23,
      target: [0, 0, 0],
      sceneScale: 0.68,
    };
  }
  // sm: 480–767
  if (canvasWidth < 768) {
    return {
      position: [1, 4, 16],
      fov: 55,
      minDistance: 5,
      maxDistance: 22,
      target: [1, 0, 0],
      sceneScale: 0.82,
    };
  }
  // md+: desktop
  return {
    position: [2.5, 5, 12],
    fov: 45,
    minDistance: 4,
    maxDistance: 20,
    target: [2.5, 0, 0],
    sceneScale: 1,
  };
}

export default function NodeCanvas3D() {
  const controlsRef = useRef();
  const cam = useCameraConfig();

  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: cam.position, fov: cam.fov }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#04060B"]} />
      <fog attach="fog" args={["#04060B", 16, 32]} />

      <ambientLight intensity={0.3} />
      <pointLight position={[0, 8, 0]} intensity={0.6} color="#FFC857" />
      <pointLight position={[8, 4, 8]} intensity={0.7} color="#00D2FF" />
      <pointLight position={[-8, -3, -6]} intensity={0.5} color="#00FF87" />

      <Stars radius={50} depth={40} count={1500} factor={2} fade speed={0.3} />
      <ParticleField />
      <group scale={cam.sceneScale}>
        <OrbitalRings />
        <ConnectionLines />
        <DataNodes />
      </group>

      <OrbitControls
        ref={controlsRef}
        target={cam.target}
        enablePan={false}
        enableZoom={true}
        minDistance={cam.minDistance}
        maxDistance={cam.maxDistance}
        autoRotate={false}
        maxPolarAngle={Math.PI * 0.72}
        minPolarAngle={Math.PI * 0.12}
      />
    </Canvas>
  );
}
