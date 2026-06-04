import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCoupleStore } from "@/store/coupleStore";

export function AddCategoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { createCategory } = useCoupleStore();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState("from-primary/20 to-accent/10");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      await createCategory({ name, emoji, color });
      onClose();
      setName(""); setEmoji("📁");
    } catch {
      alert("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const colors = [
    "from-rose-500/20 to-pink-700/10",
    "from-indigo-500/20 to-violet-700/10",
    "from-amber-400/20 to-orange-600/10",
    "from-teal-500/20 to-emerald-700/10",
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl glass-modal shadow-cinema"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-2xl font-semibold">New Category</h2>
            <button onClick={onClose} className="btn-glass-icon">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form id="category-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Emoji</label>
                <input required value={emoji} onChange={e => setEmoji(e.target.value)} className="w-16 rounded-xl bg-black/20 px-4 py-3 text-center text-xl outline-none focus:ring-1 focus:ring-primary" placeholder="✨" maxLength={2} />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Trips" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Color Theme</label>
              <div className="flex gap-3">
                {colors.map(c => (
                  <button type="button" key={c} onClick={() => setColor(c)} className={`h-10 flex-1 rounded-xl bg-gradient-to-br ${c} border-2 transition-all ${color === c ? "border-primary scale-110 shadow-glow" : "border-transparent opacity-50 hover:opacity-100"}`} />
                ))}
              </div>
            </div>
          </form>

          <div className="border-t border-white/10 p-6 flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button form="category-form" type="submit" disabled={loading} className="btn-primary">
              {loading ? "Creating..." : "Create Collection"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
