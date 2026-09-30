import { AnimatePresence, motion } from "framer-motion";
import { useUIStore, selectIsAdmin } from "../store";
import SkillsRadar from "./SkillsRadar";
import ResumeUploader from "./ResumeUploader";
import { isStaticDeployment, resumePdfUrl } from "../utils/deployment";

export default function DashboardSidebar() {
  const {
    dashboardModalOpen,
    openAuthModal,
    openEditModal,
    closeDashboardModal,
    clearEditToken,
  } = useUIStore();
  const isAdmin = useUIStore(selectIsAdmin);
  const sidebarClasses =
    "fixed left-0 top-16 w-80 h-[calc(100vh-4rem)] z-30 flex flex-col bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 shadow-[20px_0_40px_rgba(0,0,0,0.5)]";

  const SidebarContent = (
    <div className={sidebarClasses}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-800 p-4">
        <div>
          <h1 className="font-mono text-[13px] font-bold bg-gradient-to-r from-synapse to-cyan-400 bg-clip-text text-transparent">
            SYS.ADMIN // DASHBOARD
          </h1>
          <p className="font-mono text-[9px] text-mist/70 mt-1 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pulse animate-pulseGlow inline-block" />
            Live Telemetry Active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isStaticDeployment() && (
            <button
              onClick={isAdmin ? openEditModal : openAuthModal}
              className="px-2 py-1 rounded-md border border-slate-700 font-mono text-[9px] uppercase text-mist transition-all shadow-sm hover:text-white hover:border-slate-500"
            >
              {isAdmin ? "Edit Resume" : "Owner sign-in"}
            </button>
          )}
          <button
            onClick={closeDashboardModal}
            className="md:hidden rounded-full p-1 text-mist/50 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dashboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-6">
        <section className="rounded-xl border border-emerald-500/20 bg-slate-900/70 p-3 shadow-[0_0_22px_rgba(16,185,129,0.06)]">
          <div className="mb-3">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-white">Career Journey // Quick Trace</h2>
            <span className="mt-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 font-mono text-[8px] uppercase tracking-wide text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.12)]">
              6th Sem Data Science Intern Search
            </span>
          </div>
          <div className="space-y-2.5 text-[10px] leading-relaxed text-mist/80">
            <p><span className="font-mono uppercase text-cyan-300">Education</span><br />BCA Data Science @ Chandigarh University · 2023–2027</p>
            <p><span className="font-mono uppercase text-purple-300">Core Roles</span><br />Web Dev &amp; IT Support @ GreenCyberTech<br />Web Dev &amp; Network Support @ De-suung HQ</p>
            <p><span className="font-mono uppercase text-emerald-300">Active Build</span><br />Agentic HR System &amp; 3D Interactive Portfolio</p>
          </div>
          <a
            href={resumePdfUrl()}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-wide text-cyan-300 transition hover:bg-cyan-500/20"
          >
            View / Download Resume PDF
          </a>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-synapse">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
            <h2 className="font-mono text-[10px] text-synapse uppercase tracking-widest font-bold">Skills Matrix</h2>
          </div>
          <div className="w-full aspect-square max-w-[240px] mx-auto">
            <SkillsRadar />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-pulse">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <h2 className="font-mono text-[10px] text-pulse uppercase tracking-widest font-bold">System Telemetry</h2>
          </div>

          {isAdmin && (
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
              <ResumeUploader />
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
            <p className="font-mono text-[9px] text-mist/60 mb-2 uppercase">Session Status</p>
            {isAdmin ? (
              <div>
                <p className="font-mono text-[10px] text-synapse mb-2 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Authenticated
                </p>
                <button
                  onClick={clearEditToken}
                  className="w-full rounded-md border border-red-500/30 bg-red-500/10 py-1.5 font-mono text-[9px] text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Revoke Access
                </button>
              </div>
            ) : <p className="font-mono text-[10px] text-mist/50">Read-only mode active</p>}
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:block">{SidebarContent}</div>

      <AnimatePresence>
        {dashboardModalOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[29] bg-black/50 backdrop-blur-sm md:hidden"
              onClick={closeDashboardModal}
            />
            <motion.div
              key="sidebar-mobile"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="md:hidden"
            >
              {SidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
