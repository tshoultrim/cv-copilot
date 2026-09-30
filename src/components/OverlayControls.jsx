import { useUIStore } from "../store";

export default function OverlayControls() {
  const { toggleDashboardModal, toggleAiPanel, aiPanelOpen, mode } = useUIStore();

  return (
    <>
      {/* Top-Right: Drag to Orbit helper pill — desktop only */}
      <div className="pointer-events-none fixed right-6 top-20 z-40 hidden md:block">
        <div className="glass-panel flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-4 py-2 font-mono text-[10px] text-emerald-300/80 shadow-[0_0_15px_rgba(16,185,129,0.12)] backdrop-blur-md">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-emerald-400"
          >
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          drag to orbit · click a node to explore
        </div>
      </div>

      {/* Bottom-Left: Mobile-only Dashboard toggle */}
      {mode === "3d" && <div className="fixed bottom-4 left-4 z-50 md:hidden">
        <button
          onClick={toggleDashboardModal}
          className="group flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-slate-950/90 backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_28px_rgba(6,182,212,0.4)] active:scale-95"
          aria-label="Toggle Dashboard"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="text-cyan-400 group-hover:text-cyan-300 transition-colors"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </button>
      </div>}

      {/* Bottom-Right: AI Chatbot launcher — all viewports */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={toggleAiPanel}
          className={`group flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
            aiPanelOpen
              ? "border border-purple-400 bg-purple-500/20 shadow-[0_0_24px_rgba(168,85,247,0.45)]"
              : "border border-purple-500/30 bg-slate-950/90 shadow-[0_0_20px_rgba(168,85,247,0.18)] hover:shadow-[0_0_28px_rgba(168,85,247,0.38)]"
          }`}
          aria-label="Toggle AI Assistant"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={
              aiPanelOpen
                ? "text-white"
                : "text-purple-400 group-hover:text-purple-300 transition-colors"
            }
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      </div>
    </>
  );
}
