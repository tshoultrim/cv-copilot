import { create } from "zustand";
import { NODES } from "./data/resumeData";

// Shared state between the 2D DOM UI (sidebar, modals, cursor) and the
// R3F canvas (nodes, camera rig, particles). Using zustand here
// instead of React Context because Canvas renders through a separate
// reconciler — a plain store avoids any context-bridging headaches.
export const useUIStore = create((set) => ({
  mode: "3d", // "3d" | "reader"
  setMode: (mode) => set({ mode }),

  activeSection: null,
  openSection: (id) => set({ activeSection: id }),
  closeSection: () => set({ activeSection: null }),

  hoveredNode: null,
  setHoveredNode: (id) => set({ hoveredNode: id }),

  cursorVariant: "default", // "default" | "hover"
  setCursorVariant: (variant) => set({ cursorVariant: variant }),

  // Default focus target is the center of the solar system
  focusTarget: [0, 0, 0],
  setFocusTarget: (position) => set({ focusTarget: position }),

  aiPanelOpen: false,
  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  closeAiPanel: () => set({ aiPanelOpen: false }),

  dashboardModalOpen: false,
  toggleDashboardModal: () => set((s) => ({ dashboardModalOpen: !s.dashboardModalOpen })),
  closeDashboardModal: () => set({ dashboardModalOpen: false }),

  editModalOpen: false,
  openEditModal: () => set({ editModalOpen: true }),
  closeEditModal: () => set({ editModalOpen: false }),

  profileUploadOpen: false,
  openProfileUpload: () => set({ profileUploadOpen: true }),
  closeProfileUpload: () => set({ profileUploadOpen: false }),

  authModalOpen: false,
  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),

  // ── Auth state (Edit Mode) ────────────────────────────────────────────────
  editToken: sessionStorage.getItem("edit_token") || null,
  adminSessionVerified: false,
  setEditToken: (token) => {
    sessionStorage.setItem("edit_token", token);
    set({ editToken: token, adminSessionVerified: true });
  },
  setAdminSessionVerified: (adminSessionVerified) => set({ adminSessionVerified }),
  clearEditToken: () => {
    sessionStorage.removeItem("edit_token");
    set({
      editToken: null,
      adminSessionVerified: false,
      editModalOpen: false,
      profileUploadOpen: false,
    });
  },
}));

// Derived selector — avoids re-renders when unrelated state changes
export const selectIsAdmin = (s) => !!s.editToken && s.adminSessionVerified;
