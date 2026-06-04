import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Calendar, MapPin, Tag as TagIcon, Type, AlignLeft } from "lucide-react";
import { Memory, useCoupleStore } from "@/store/coupleStore";

export function MemoryEditModal({ memory, isOpen, onClose }: { memory: Memory | null, isOpen: boolean, onClose: () => void }) {
  const { categories, editMemory } = useCoupleStore();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    if (memory && isOpen) {
      setTitle(memory.title || "");
      setSub(memory.sub || "");
      setNotes(memory.notes || "");
      setLocation(memory.location || "");
      setCategoryId(memory.categoryId || "");
      setTag(memory.tag || "");
    }
  }, [memory, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memory) return;
    setLoading(true);
    try {
      await editMemory(memory._id, { title, sub, notes, location, categoryId, tag });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !memory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="w-full max-w-lg rounded-3xl glass-modal shadow-cinema flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <h2 className="font-display text-xl font-bold">Edit Memory</h2>
            <button onClick={onClose} className="btn-glass-icon">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Type className="h-3.5 w-3.5" /> Title
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-xl glass py-3 px-4 outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </label>
                <input
                  type="text"
                  value={sub}
                  onChange={e => setSub(e.target.value)}
                  className="w-full rounded-xl glass py-3 px-4 outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                  placeholder="e.g. Oct 14, 2025"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-xl glass py-3 px-4 outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                  placeholder="Where was this?"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Folder (Category)
                </label>
                <select
                  value={categoryId || ""}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full rounded-xl glass py-3 px-4 outline-none focus:ring-1 focus:ring-primary/50 text-foreground [&>option]:bg-zinc-900"
                >
                  <option value="">None</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <TagIcon className="h-3.5 w-3.5" /> Tag (Pill)
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  className="w-full rounded-xl glass py-3 px-4 outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                  placeholder="e.g. VLOG, PHOTO"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <AlignLeft className="h-3.5 w-3.5" /> Description / Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full rounded-xl glass py-3 px-4 outline-none focus:ring-1 focus:ring-primary/50 text-foreground min-h-[100px] resize-none"
                placeholder="Write a sweet note about this memory..."
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
