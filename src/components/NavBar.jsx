// NavBar.jsx — replaces Sidebar.jsx
// Full-width glass top bar at z-40.
// Desktop (≥ md): name · location | nav links (all NODES) | 3D/Reader toggle · PDF download · sync indicator
// Mobile (< md): name | hamburger → framer-motion overlay with all links + controls

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore, selectIsAdmin } from "../store";
import { useResumeData, useSyncStatus } from "../hooks/useResumeData";


// ─── Live sync indicator ───────────────────────────────────────────────────────
function SyncIndicator() {
  const { lastSynced, syncStatus, justUpdated } = useSyncStatus();
  const [, tick] = useState(0); // re-render every 15 s to refresh "X s ago"

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const cfg = {
    synced:  { color: "#00FF87", label: "LIVE",     pulse: true  },
    syncing: { color: "#FFC857", label: "Syncing…", pulse: false },
    error:   { color: "#FF5C7A", label: "Offline",  pulse: false },
    idle:    { color: "#8FA3C0", label: "Static",   pulse: false },
  }[syncStatus] ?? { color: "#8FA3C0", label: "Static", pulse: false };

  const displayLabel = justUpdated ? "Just updated!" : cfg.label;

  const ago = lastSynced
    ? (() => {
        const s = Math.floor((Date.now() - lastSynced) / 1000);
        if (s < 60)   return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        return `${Math.floor(s / 3600)}h ago`;
      })()
    : null;

  return (
    <div className="flex items-center gap-1.5" title={`Data sync status: ${displayLabel}${ago && !justUpdated ? ` · ${ago}` : ""}`}>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${cfg.pulse || justUpdated ? "animate-pulseGlow" : ""}`}
        style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }}
      />
      <span className="hidden font-mono text-[9px] text-mist/60 sm:block">
        {displayLabel}{ago && !justUpdated ? ` · ${ago}` : ""}
      </span>
    </div>
  );
}

// ─── Download icon ─────────────────────────────────────────────────────────────
function DownloadIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 1v7M2 6l3 3 3-3M1 11h8" />
    </svg>
  );
}

// ─── Profile Avatar ────────────────────────────────────────────────────────────
function ProfileAvatar({ avatar, name, size = 32 }) {
  const isAdmin = useUIStore(selectIsAdmin);
  const openProfileUpload = useUIStore((s) => s.openProfileUpload);
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size }}
    >
      {/* Avatar image or initials */}
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="h-full w-full rounded-full object-cover border border-synapse/30"
          style={{ boxShadow: "0 0 8px rgba(0, 210, 255, 0.2)" }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full border border-synapse/30 bg-synapse/10 font-mono text-[10px] font-bold text-synapse"
          style={{ boxShadow: "0 0 8px rgba(0, 210, 255, 0.2)" }}
        >
          {initials}
        </div>
      )}

      {/* Photo editing is available only in a verified owner session. */}
      {isAdmin && (
        <button
          type="button"
          onClick={openProfileUpload}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
          aria-label="Upload profile picture"
          title="Update profile photo"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-white/80" aria-hidden="true">
            <path d="M4 16h12a1 1 0 001-1v-7a1 1 0 00-1-1h-2.586l-1.707-1.707A1 1 0 0011 5H9a1 1 0 00-.707.293L6.586 7H4a1 1 0 00-1 1v7a1 1 0 001 1zm6-8a3 3 0 110 6 3 3 0 010-6z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────
export default function NavBar() {
  const mode           = useUIStore((s) => s.mode);
  const setMode        = useUIStore((s) => s.setMode);
  const activeSection  = useUIStore((s) => s.activeSection);
  const openSection    = useUIStore((s) => s.openSection);
  const setFocusTarget = useUIStore((s) => s.setFocusTarget);
  const setHoveredNode = useUIStore((s) => s.setHoveredNode);
  const setCursorVariant = useUIStore((s) => s.setCursorVariant);

  const { PROFILE, NODES } = useResumeData();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (node) => {
    openSection(node.id);
    setFocusTarget(node.position);
    setMobileOpen(false);
  };

  const navNodes = NODES.filter((n) => !n.isSun);

  return (
    <>
      {/* ── Top bar ── */}
      <header
        className="glass-panel fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between gap-3 px-4 sm:px-6 shadow-[0_0_20px_rgba(0,210,255,0.05)] border-b border-synapse/20 bg-black/40 backdrop-blur-lg"
        role="banner"
        style={{ borderRadius: "0 0 16px 16px" }}
      >
        {/* Left: avatar + name + location + sync dot */}
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <ProfileAvatar avatar={PROFILE.avatar} name={PROFILE.name} size={36} />
          <div className="flex min-w-0 flex-col justify-center">
            <p className="truncate font-display text-[13px] font-bold tracking-wide text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]">
              {PROFILE.name.toUpperCase()}
            </p>
            <p className="hidden truncate font-mono text-[9px] uppercase tracking-widest text-synapse/70 sm:block">
              {PROFILE.location}
            </p>
          </div>
          <div className="hidden shrink-0 items-center border-l border-white/10 pl-2 lg:flex">
            <SyncIndicator />
          </div>
        </div>

        {/* Center: nav links (desktop only, hidden < md) */}
        <nav
          className="hidden md:flex shrink-0 items-center gap-1 bg-black/30 rounded-xl p-1 border border-white/5 shadow-inner"
          aria-label="Portfolio sections"
        >
          {navNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => handleSelect(node)}
              onMouseEnter={() => { setHoveredNode(node.id); setCursorVariant("hover"); }}
              onMouseLeave={() => { setHoveredNode(null);   setCursorVariant("default"); }}
              aria-current={activeSection === node.id ? "page" : undefined}
              className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[11px] transition-all duration-300 ${
                activeSection === node.id
                  ? "text-white bg-white/10 shadow-sm"
                  : "text-mist/70 hover:text-white hover:bg-white/5"
              }`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full transition-transform duration-300"
                style={{ 
                  background: node.color, 
                  boxShadow: `0 0 8px ${node.color}`,
                  transform: activeSection === node.id ? 'scale(1.2)' : 'scale(1)'
                }}
              />
              <span className="tracking-wide">{node.label}</span>
              {activeSection === node.id && (
                <motion.span
                  layoutId="nav-active-bar"
                  className="absolute -bottom-1 left-3 right-3 h-[2px] rounded-full"
                  style={{ background: node.color, boxShadow: `0 0 8px ${node.color}` }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Right: controls */}
        <div className="flex shrink-0 items-center gap-2.5">
          {/* 3D / Reader toggle */}
          <div
            className="flex rounded-lg border border-white/10 bg-black/40 p-0.5 font-mono text-[10px] shadow-inner"
            role="group"
            aria-label="View mode"
          >
            <button
              onClick={() => setMode("3d")}
              className={`rounded-md px-2.5 py-1.5 transition-all duration-300 ${
                mode === "3d" ? "bg-synapse/20 text-synapse shadow-[0_0_10px_rgba(0,210,255,0.2)]" : "text-mist/70 hover:text-white"
              }`}
            >
              3D
            </button>
            <button
              onClick={() => setMode("reader")}
              className={`rounded-md px-2.5 py-1.5 transition-all duration-300 ${
                mode === "reader" ? "bg-synapse/20 text-synapse shadow-[0_0_10px_rgba(0,210,255,0.2)]" : "text-mist/70 hover:text-white"
              }`}
            >
              TXT
            </button>
          </div>

          {/* Download PDF — desktop */}
          <a
            href="/api/resume/download-pdf"
            download
            className="hidden items-center gap-1.5 rounded-lg border border-pulse/30 bg-pulse/10 px-3 py-1.5 font-mono text-[10px] text-pulse transition-all duration-300 hover:bg-pulse/20 hover:shadow-[0_0_15px_rgba(0,255,135,0.3)] sm:flex"
            aria-label="Download PDF resume"
          >
            <DownloadIcon />
            RESUME
          </a>

          {/* Hamburger — mobile / Desktop Toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex md:hidden items-center rounded-lg border border-white/10 bg-black/30 p-2 text-mist transition-colors hover:border-white/30 hover:text-white"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {mobileOpen ? (
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M2 4H14"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 8H14"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile slide-down overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="glass-panel fixed left-0 right-0 top-12 bottom-0 z-40 rounded-b-2xl p-4 overflow-y-auto scroll-thin flex flex-col md:w-80 md:left-auto md:bottom-auto md:border md:border-t-0"
            role="dialog"
            aria-label="Navigation Menu"
          >
            {/* All NODES (including profile sun) in mobile */}
            <nav className="flex flex-col gap-1" aria-label="Mobile portfolio sections">
              {NODES.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleSelect(node)}
                  aria-current={activeSection === node.id ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-mono text-[12px] transition-colors ${
                    activeSection === node.id
                      ? "bg-white/10 text-white"
                      : "text-mist hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: node.color, boxShadow: `0 0 5px ${node.color}` }}
                  />
                  {node.label}
                </button>
              ))}
            </nav>



            {/* Download PDF — inside mobile menu */}
            <div className="mt-3 border-t border-white/10 pt-3">
              <a
                href="/api/resume/download-pdf"
                download
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-pulse/40 bg-pulse/10 px-3 py-2.5 font-mono text-[11px] text-pulse transition-colors hover:bg-pulse/20"
              >
                <DownloadIcon />
                Download PDF Resume
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
