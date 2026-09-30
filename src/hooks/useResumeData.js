// src/hooks/useResumeData.js
// Zustand-backed live resume data hook.
// Polls /api/resume-data every 60 s and falls back to bundled static data
// if the fetch fails or VITE_RESUME_GIST_URL is not configured.

import { create } from "zustand";
import * as staticData from "../data/resumeData.js";

// ─── Default (static bundled) dataset ─────────────────────────────────────────
const DEFAULT_DATA = {
  PROFILE: staticData.PROFILE,
  NODES: staticData.NODES, // NODES contain Math.PI — always static
  EXPERIENCE: staticData.EXPERIENCE,
  PROJECTS: staticData.PROJECTS,
  SKILLS: staticData.SKILLS,
  EDUCATION: staticData.EDUCATION,
  CERTIFICATIONS: staticData.CERTIFICATIONS,
};

// ─── Zustand store for live resume content ────────────────────────────────────
export const useResumeStore = create((set) => ({
  data: DEFAULT_DATA,
  lastSynced: null,
  syncStatus: "idle",   // "idle" | "syncing" | "synced" | "error"
  justUpdated: false,   // true for 3s after a sync that brought genuinely new data

  setData: (data) => set({ data }),
  updateData: (partialData) => set((s) => ({ data: { ...s.data, ...partialData } })),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSynced: (lastSynced) => set({ lastSynced }),
  setJustUpdated: (justUpdated) => set({ justUpdated }),
}));

// ─── Public hooks ─────────────────────────────────────────────────────────────
/** Returns the full live resume data object. Components destructure what they need. */
export function useResumeData() {
  return useResumeStore((s) => s.data);
}

/** Returns sync metadata for the NavBar indicator. */
export function useSyncStatus() {
  return useResumeStore((s) => ({
    lastSynced: s.lastSynced,
    syncStatus: s.syncStatus,
    justUpdated: s.justUpdated,
  }));
}

// ─── Keys used for change detection (excludes NODES which is always static) ──
const CONTENT_KEYS = [
  "PROFILE", "EXPERIENCE", "PROJECTS", "SKILLS",
  "EDUCATION", "CERTIFICATIONS",
];

function dataFingerprint(d) {
  return CONTENT_KEYS.map((k) => JSON.stringify(d[k])).join("|");
}

// ─── Polling engine (called once from App.jsx) ────────────────────────────────
const POLL_INTERVAL = 60_000; // 60 s
let _pollTimer = null;
let _justUpdatedTimer = null;

async function fetchAndUpdate() {
  const state = useResumeStore.getState();
  const { data: prevData, setData, setSyncStatus, setLastSynced, setJustUpdated } = state;

  // Don't poll if the full editor modal is open
  const { useUIStore } = await import("../store");
  if (useUIStore.getState().editModalOpen) {
    return;
  }

  setSyncStatus("syncing");

  try {
    const res = await fetch("/api/resume-data", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const newData = {
      ...DEFAULT_DATA,
      ...json,
      PROFILE: {
        ...DEFAULT_DATA.PROFILE,
        ...json.PROFILE,
        avatar: json.PROFILE?.avatar || DEFAULT_DATA.PROFILE.avatar,
      },
      NODES: DEFAULT_DATA.NODES, // never overwrite from live source
    };

    // Diff: did any text content actually change?
    const changed = dataFingerprint(prevData) !== dataFingerprint(newData);

    setData(newData);
    setSyncStatus("synced");
    setLastSynced(Date.now());

    if (changed) {
      // Clear any existing "just updated" timer
      if (_justUpdatedTimer) clearTimeout(_justUpdatedTimer);
      setJustUpdated(true);
      _justUpdatedTimer = setTimeout(() => {
        useResumeStore.getState().setJustUpdated(false);
      }, 3_000);
    }
  } catch (err) {
    console.warn("[useResumeData] fetch failed — using static data:", err.message);
    setSyncStatus("error");
  }
}

/** Call once at app start. Idempotent — safe to call multiple times. */
export function initResumePolling() {
  if (_pollTimer) return;
  fetchAndUpdate(); // immediate first fetch
  _pollTimer = setInterval(fetchAndUpdate, POLL_INTERVAL);
}

export function stopResumePolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

/** Force an immediate refresh (called after in-UI edits are saved). */
export async function refreshResumeData() {
  await fetchAndUpdate();
}
