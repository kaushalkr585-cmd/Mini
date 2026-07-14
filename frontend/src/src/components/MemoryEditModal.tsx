import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Calendar, MapPin, Tag as TagIcon, Type, AlignLeft, ChevronDown } from "lucide-react";
import { Memory, useCoupleStore } from "@/store/coupleStore";
import toast from "react-hot-toast";

export function MemoryEditModal({ memory, isOpen, onClose }: { memory: Memory | null, isOpen: boolean, onClose: () => void }) {
  const { categories, editMemory } = useCoupleStore();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (memory && isOpen) {
      setTitle(memory.title || "");
      setSub(memory.sub || "");
      setNotes(memory.notes || "");
      setLocation(memory.location || "");
      setCategoryId(memory.categoryId || "");
      setTag(memory.tag || "");
      setTags(memory.tags || []);
      setTagInput("");
    }
  }, [memory, isOpen]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memory) return;
    setLoading(true);
    try {
      await editMemory(memory._id, { 
        title, 
        sub, 
        notes, 
        location, 
        categoryId, 
        tag: tags[0] || tag || "Memory", 
        tags 
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !memory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 dark"
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

          {/* Form — scrollable body */}
          <form id="edit-memory-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 scrollbar-hidden">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </label>
                <input
                  type="text"
                  value={sub}
                  onChange={e => setSub(e.target.value)}
                  className="w-full rounded-xl glass py-3 px-4 min-h-[44px] outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
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
                  className="w-full rounded-xl glass py-3 px-4 min-h-[44px] outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                  placeholder="Where was this?"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Folder (Category)
                </label>
                <div className="relative">
                  <select
                    value={categoryId || ""}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full rounded-xl glass py-3 pl-4 pr-10 min-h-[44px] outline-none focus:ring-1 focus:ring-primary/50 text-foreground appearance-none [&>option]:bg-zinc-900 cursor-pointer"
                  >
                    <option value="">None</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col">
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <TagIcon className="h-3.5 w-3.5" /> Tags
                </label>
                <div className="flex flex-wrap gap-2 p-2 rounded-xl glass min-h-[46px] items-center">
                  {tags.map((t, idx) => (
                    <span key={idx} className="flex items-center gap-1 bg-primary/20 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
                      #{t}
                      <button type="button" onClick={() => handleRemoveTag(idx)} className="hover:text-rose transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? "Type tag and press Enter…" : "Add tag…"}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm px-2 py-1 text-white placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
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
          </form>

          {/* Sticky footer — always visible, never scrolls away */}
          <div className="flex-none border-t border-white/10 px-5 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all min-h-[44px] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-memory-form"
              disabled={loading}
              className="btn-primary flex items-center gap-2 min-h-[44px]"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
