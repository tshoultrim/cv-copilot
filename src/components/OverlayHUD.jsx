import { useUIStore } from "../store";

export default function OverlayHUD() {
  const { toggleDashboardModal, toggleAiPanel, aiPanelOpen } = useUIStore();

  return (
    <>
      {/* Top-Left: Drag to Orbit helper pill */}
      <div className="pointer-events-none fixed left-6 top-16 z-30 hidden sm:block">
        <div className="glass-panel rounded-full px-4 py-2 font-mono text-[10px] text-emerald-300/80 backdrop-blur-md bg-slate-900/80 border border-slate-800 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          drag to orbit · click a node to explore
        </div>
      </div>

      {/* Bottom-Right: System Dashboard trigger */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleDashboardModal}
          className="group flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:scale-105"
          aria-label="Open Sys Admin Dashboard"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-400 group-hover:text-cyan-300">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        </button>
      </div>

      {/* Bottom-Left: AI Chatbot widget icon */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={toggleAiPanel}
          className={`group flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-all hover:scale-105 ${
            aiPanelOpen 
              ? "bg-purple-500/20 border border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]" 
              : "bg-slate-900/80 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]"
          }`}
          aria-label="Toggle AI Assistant"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={aiPanelOpen ? "text-white" : "text-purple-400 group-hover:text-purple-300"}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>
      </div>
    </>
  );
}
