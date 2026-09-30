import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore, selectIsAdmin } from "../store";
import { refreshResumeData, useResumeStore } from "../hooks/useResumeData";

const OUTPUT_SIZE = 512;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = source;
  });
}

function createCroppedAvatar(image, zoom) {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the image.");

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not compress the selected image."));
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        reject(new Error("The cropped image is still too large. Try a different photo."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the cropped image."));
      reader.readAsDataURL(blob);
    }, "image/jpeg", 0.86);
  });
}

export default function ProfileUploadModal() {
  const open = useUIStore((state) => state.profileUploadOpen);
  const close = useUIStore((state) => state.closeProfileUpload);
  const isAdmin = useUIStore(selectIsAdmin);
  const editToken = useUIStore((state) => state.editToken);
  const clearEditToken = useUIStore((state) => state.clearEditToken);
  const updateData = useResumeStore((state) => state.updateData);
  const inputRef = useRef(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    return () => {
      if (source.startsWith("blob:")) URL.revokeObjectURL(source);
    };
  }, [source]);

  const handleFile = (file) => {
    if (!file) return;
    setError("");
    setNotice("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image under 10 MB before cropping.");
      return;
    }
    setSource(URL.createObjectURL(file));
    setZoom(1);
  };

  const handleSave = async () => {
    if (!isAdmin || !source || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const image = await loadImage(source);
      const avatar = await createCroppedAvatar(image, zoom);
      const response = await fetch("/api/asset-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${editToken}`,
        },
        body: JSON.stringify({ type: "avatar", data: avatar, filename: "profile-avatar.jpg" }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        clearEditToken();
        throw new Error("Your owner session expired. Sign in again to update the profile photo.");
      }
      if (!response.ok) throw new Error(result.error || "The profile photo could not be saved.");

      if (result.data) updateData(result.data);
      await refreshResumeData();
      setNotice("Profile photo saved and synced to the portfolio.");
    } catch (err) {
      setError(err instanceof TypeError ? "Could not reach the upload service. Check that the portfolio server is running." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && isAdmin && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(event) => event.target === event.currentTarget && close()}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-photo-title"
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-[0_0_50px_rgba(6,182,212,0.12)]"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400">SYS.ADMIN // PROFILE</p>
                <h2 id="profile-photo-title" className="mt-1 font-mono text-lg font-bold text-white">Update profile photo</h2>
                <p className="mt-1 text-xs text-mist/60">Square crop · compressed to JPEG · max 512 × 512</p>
              </div>
              <button type="button" onClick={close} className="rounded-full p-2 text-mist/60 hover:bg-slate-800 hover:text-white" aria-label="Close photo editor">✕</button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-56 w-56 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-400/50 bg-slate-900 shadow-[0_0_28px_rgba(34,211,238,0.14)]">
                {source ? (
                  <img src={source} alt="Crop preview" className="h-full w-full object-cover" style={{ transform: `scale(${zoom})` }} />
                ) : (
                  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-cyan-400/60" aria-hidden="true">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                )}
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 font-mono text-xs text-cyan-300 transition hover:border-cyan-500/50"
              >
                {source ? "Choose another photo" : "Choose photo"}
              </button>
              {source && (
                <label className="w-full max-w-xs font-mono text-[10px] text-mist/70">
                  Crop zoom
                  <input type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-cyan-400" />
                </label>
              )}
            </div>

            {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-[11px] text-red-300">{error}</p>}
            {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 font-mono text-[11px] text-emerald-300">{notice}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} className="rounded-lg border border-slate-700 px-4 py-2 font-mono text-xs text-mist hover:text-white">Cancel</button>
              <button type="button" onClick={handleSave} disabled={!source || busy || !!notice} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40">
                {busy ? "Saving..." : notice ? "Saved" : "Save photo"}
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
