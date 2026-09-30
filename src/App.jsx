import { Suspense, useEffect } from "react";
import NodeCanvas3D from "./components/NodeCanvas3D";
import NavBar from "./components/NavBar";
import SectionModal from "./components/SectionModal";
import CustomCursor from "./components/CustomCursor";
import ReaderView from "./components/ReaderView";
import DataScienceBackground from "./components/DataScienceBackground";
import DashboardSidebar from "./components/DashboardSidebar";
import AuthModal from "./components/AuthModal";
import OverlayControls from "./components/OverlayControls";
import AiAgentModal from "./components/AiAgentModal";
import EditResumeModal from "./components/EditResumeModal";
import ProfileUploadModal from "./components/ProfileUploadModal";
import { useUIStore } from "./store";
import { initResumePolling } from "./hooks/useResumeData";
import { isStaticDeployment } from "./utils/deployment";

function CanvasLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="font-mono text-xs text-synapse/70 animate-pulseGlow">
        loading constellation…
      </p>
    </div>
  );
}

export default function App() {
  const mode = useUIStore((s) => s.mode);

  useEffect(() => {
    if (isStaticDeployment()) return undefined;
    const { editToken, clearEditToken, setAdminSessionVerified } = useUIStore.getState();
    if (!editToken) return undefined;

    let cancelled = false;
    fetch("/api/auth/session", {
      headers: { Authorization: `Bearer ${editToken}` },
    })
      .then(async (response) => {
        if (response.status === 401) {
          if (!cancelled) clearEditToken();
          return;
        }
        if (!response.ok) throw new Error(`Session validation failed (HTTP ${response.status})`);
        const result = await response.json();
        if (!cancelled) setAdminSessionVerified(result.authenticated === true);
      })
      .catch((error) => {
        if (!cancelled) console.warn("[App] Owner session could not be verified:", error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Start live resume polling once on mount
  useEffect(() => {
    initResumePolling();
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full lg:h-screen lg:w-screen lg:overflow-hidden overflow-y-auto overflow-x-hidden bg-void">
      {/* Layer 0: Custom cursor (highest z) */}
      <CustomCursor />

      {/* Layer 1: Futuristic Data Science background (lowest z) */}
      <DataScienceBackground />

      {/* Layer 2: Top navigation bar (replaces Sidebar) */}
      <NavBar />

      {mode === "3d" ? (
        <>
          {/* Layer 3: Layout (3D + Tracker) */}
          <div className="relative z-10 flex flex-col md:pl-80 lg:absolute lg:inset-0 lg:flex-row min-h-screen lg:min-h-0">
            {/* Left/Top: 3D Canvas */}
            <div className="relative w-full h-[100dvh] lg:h-full lg:flex-1 shrink-0">
              <Suspense fallback={<CanvasLoader />}>
                <NodeCanvas3D />
              </Suspense>
            </div>
          </div>

          {/* Layer 4: Modals and panels */}
          <SectionModal />
        </>
      ) : (
        <ReaderView />
      )}

      {/* Layer 6: Overlay HUD (Pills and buttons) */}
      <OverlayControls />

      {/* Layer 7: AI Assistant (always available) */}
      <AiAgentModal />

      {/* Layer 8: Dashboard & Auth Modals */}
      {mode === "3d" && !isStaticDeployment() && (
        <>
          <DashboardSidebar />
          <AuthModal />
          <EditResumeModal />
          <ProfileUploadModal />
        </>
      )}
      {mode === "3d" && isStaticDeployment() && <DashboardSidebar />}
    </div>
  );
}
