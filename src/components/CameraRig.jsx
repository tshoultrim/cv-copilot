import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUIStore } from "../store";

const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 5, 12);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

// Smoothly interpolates the camera position + OrbitControls target toward
// whichever node was clicked, then eases back out when a modal closes.
export default function CameraRig({ controlsRef }) {
  const { camera } = useThree();
  const focusTarget = useUIStore((s) => s.focusTarget);
  const activeSection = useUIStore((s) => s.activeSection);

  const desiredCamPos = useRef(DEFAULT_CAMERA_POS.clone());
  const desiredTarget = useRef(DEFAULT_TARGET.clone());

  useFrame(() => {
    const target = new THREE.Vector3(...focusTarget);

    if (activeSection) {
      // Offset the camera from the node so we "fly in" without clipping.
      const dir = target.clone().sub(DEFAULT_TARGET).normalize();
      if (dir.length() < 0.01) {
        // Profile node at center — zoom in from above
        desiredCamPos.current.set(0, 3, 5);
      } else {
        desiredCamPos.current
          .copy(target)
          .add(dir.multiplyScalar(3.5))
          .add(new THREE.Vector3(0, 2, 0));
      }
      desiredTarget.current.copy(target);
    } else {
      desiredCamPos.current.copy(DEFAULT_CAMERA_POS);
      desiredTarget.current.copy(DEFAULT_TARGET);
    }

    camera.position.lerp(desiredCamPos.current, 0.045);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTarget.current, 0.045);
      controlsRef.current.update();
    }
  });

  return null;
}
