import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore, selectIsAdmin } from "../store";
import { useResumeStore, refreshResumeData } from "../hooks/useResumeData";

export default function EditResumeModal() {
  const open = useUIStore((s) => s.editModalOpen);
  const close = useUIStore((s) => s.closeEditModal);
  const isAdmin = useUIStore(selectIsAdmin);
  const editToken = useUIStore((s) => s.editToken);
  const clearEditToken = useUIStore((s) => s.clearEditToken);

  const { data, updateData } = useResumeStore();
  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("PROFILE");

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (open && data) {
      setFormData(JSON.parse(JSON.stringify(data)));
      setHasUnsavedChanges(false);
      setError(null);
    }
  }, [open, data]);

  // Trap focus and handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, hasUnsavedChanges]);

  const handleClose = () => {
    if (hasUnsavedChanges && !window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
      return;
    }
    close();
  };

  const handleChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        PROFILE: formData.PROFILE,
        EXPERIENCE: formData.EXPERIENCE,
        PROJECTS: formData.PROJECTS,
        SKILLS: formData.SKILLS,
        EDUCATION: formData.EDUCATION,
        CERTIFICATIONS: formData.CERTIFICATIONS,
      };

      const res = await fetch("/api/resume/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${editToken}`,
        },
        body: JSON.stringify({ data: payload }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) clearEditToken();
        throw new Error(json.error || "Failed to save data");
      }

      updateData(json.data);
      await refreshResumeData();
      setHasUnsavedChanges(false);
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !formData || !isAdmin) return null;

  const renderArrayEditor = (field, itemTemplate, renderItem) => {
    const list = formData[field] || [];

    return (
      <div className="space-y-4">
        {list.map((item, idx) => (
          <div key={idx} className="relative p-3 rounded-lg border border-white/10 bg-black/20">
            <button
              onClick={() => {
                const newList = [...list];
                newList.splice(idx, 1);
                setFormData({ ...formData, [field]: newList });
                handleChange();
              }}
              className="absolute top-2 right-2 text-red-400 hover:text-red-300 font-mono text-[10px]"
            >
              Remove
            </button>
            <div className="flex gap-2 mb-2 absolute top-2 right-16">
              <button
                disabled={idx === 0}
                onClick={() => {
                  const newList = [...list];
                  [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]];
                  setFormData({ ...formData, [field]: newList });
                  handleChange();
                }}
                className="text-mist hover:text-white disabled:opacity-30 font-mono text-[10px]"
              >
                Up
              </button>
              <button
                disabled={idx === list.length - 1}
                onClick={() => {
                  const newList = [...list];
                  [newList[idx + 1], newList[idx]] = [newList[idx], newList[idx + 1]];
                  setFormData({ ...formData, [field]: newList });
                  handleChange();
                }}
                className="text-mist hover:text-white disabled:opacity-30 font-mono text-[10px]"
              >
                Down
              </button>
            </div>
            {renderItem(item, idx, (newItem) => {
              const newList = [...list];
              newList[idx] = newItem;
              setFormData({ ...formData, [field]: newList });
              handleChange();
            })}
          </div>
        ))}
        <button
          onClick={() => {
            setFormData({ ...formData, [field]: [...list, itemTemplate] });
            handleChange();
          }}
          className="w-full py-2 rounded border border-dashed border-white/20 text-mist hover:text-white hover:border-white/50 transition text-sm"
        >
          + Add Entry
        </button>
      </div>
    );
  };

  if (!open || !formData || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-[#0A0D14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div>
            <h2 className="text-lg font-display font-semibold text-white">Edit Profile &amp; Résumé</h2>
            <p className="text-xs text-mist font-mono">Owner Panel</p>
          </div>
          <button onClick={handleClose} className="text-mist hover:text-white text-sm font-mono">esc ✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-1/4 min-w-[120px] flex flex-col gap-1 p-4 border-r border-white/10 bg-black/20 overflow-y-auto">
            {["PROFILE", "EXPERIENCE", "PROJECTS", "SKILLS", "EDUCATION", "CERTIFICATIONS"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-left px-3 py-2 rounded text-xs font-mono transition ${tab === t ? "bg-synapse/20 text-synapse" : "text-mist hover:bg-white/5 hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Main Form Area */}
          <div className="flex-1 overflow-y-auto p-6 scroll-thin">
            {tab === "PROFILE" && (
              <div className="space-y-4">
                {["name", "location", "tagline"].map(field => (
                  <div key={field}>
                    <label className="block text-xs text-mist font-mono mb-1 capitalize">{field}</label>
                    <input
                      type="text"
                      value={formData.PROFILE[field] || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, PROFILE: { ...formData.PROFILE, [field]: e.target.value } });
                        handleChange();
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-synapse/50 outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-mist font-mono mb-1">Pitch / Biography</label>
                  <textarea
                    rows={4}
                    value={formData.PROFILE.pitch || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, PROFILE: { ...formData.PROFILE, pitch: e.target.value } });
                      handleChange();
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-synapse/50 outline-none"
                  />
                </div>
              </div>
            )}

            {tab === "EXPERIENCE" && renderArrayEditor("EXPERIENCE", { role: "", org: "", dates: "", points: [] }, (item, idx, updateItem) => (
              <div className="space-y-3 mt-4">
                <input placeholder="Role" value={item.role} onChange={(e) => updateItem({ ...item, role: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <input placeholder="Organization" value={item.org} onChange={(e) => updateItem({ ...item, org: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <input placeholder="Dates" value={item.dates} onChange={(e) => updateItem({ ...item, dates: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <textarea placeholder="Points (one per line)" rows={3} value={item.points.join("\n")} onChange={(e) => updateItem({ ...item, points: e.target.value.split("\n").filter(Boolean) })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white whitespace-pre" />
              </div>
            ))}

            {tab === "PROJECTS" && renderArrayEditor("PROJECTS", { name: "", status: "", description: "" }, (item, idx, updateItem) => (
              <div className="space-y-3 mt-4">
                <input placeholder="Name" value={item.name} onChange={(e) => updateItem({ ...item, name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <input placeholder="Status" value={item.status} onChange={(e) => updateItem({ ...item, status: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <textarea placeholder="Description" rows={3} value={item.description} onChange={(e) => updateItem({ ...item, description: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
              </div>
            ))}

            {tab === "SKILLS" && renderArrayEditor("SKILLS", { name: "", group: "", level: 50 }, (item, idx, updateItem) => (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <input placeholder="Name" value={item.name} onChange={(e) => updateItem({ ...item, name: e.target.value })} className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <input placeholder="Group" value={item.group} onChange={(e) => updateItem({ ...item, group: e.target.value })} className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <input type="number" min="0" max="100" placeholder="Level" value={item.level} onChange={(e) => updateItem({ ...item, level: parseInt(e.target.value) || 0 })} className="w-20 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
              </div>
            ))}

            {tab === "EDUCATION" && renderArrayEditor("EDUCATION", { school: "", program: "", dates: "" }, (item, idx, updateItem) => (
              <div className="space-y-3 mt-4">
                <input placeholder="School" value={item.school} onChange={(e) => updateItem({ ...item, school: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <input placeholder="Program" value={item.program} onChange={(e) => updateItem({ ...item, program: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
                <input placeholder="Dates" value={item.dates} onChange={(e) => updateItem({ ...item, dates: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white" />
              </div>
            ))}

            {tab === "CERTIFICATIONS" && (
              <div>
                <p className="text-xs text-mist font-mono mb-2">One certification per line</p>
                <textarea
                  rows={8}
                  value={formData.CERTIFICATIONS.join("\n")}
                  onChange={(e) => {
                    setFormData({ ...formData, CERTIFICATIONS: e.target.value.split("\n").filter(Boolean) });
                    handleChange();
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white whitespace-pre focus:border-synapse/50 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="text-red-400 text-xs max-w-sm truncate">{error}</div>
          <div className="flex gap-3">
            <button onClick={handleClose} className="px-4 py-2 rounded text-mist hover:text-white text-sm font-mono transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="px-6 py-2 rounded bg-synapse/20 text-synapse border border-synapse/50 text-sm font-mono font-semibold hover:bg-synapse/30 disabled:opacity-40 transition"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
