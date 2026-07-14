import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Plus, Edit2, Trash2 } from "lucide-react";
import { useCoupleStore } from "@/store/coupleStore";
import { useEffect, useState } from "react";
import { UploadMilestoneModal } from "@/components/UploadMilestoneModal";

export const Route = createFileRoute("/timeline")({
  component: TimelinePage,
});

function TimelinePage() {
  const { milestones, fetchMilestones, deleteMilestone } = useCoupleStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<any>(null);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  const getEmoji = (i: number) => {
    const emojis = ["✨", "🌹", "💌", "🥂", "🌌", "✈️", "☕", "🚗"];
    return emojis[i % emojis.length];
  };

  const getColor = (i: number) => {
    const colors = [
      "from-rose-500/20 to-pink-500/5",
      "from-purple-500/20 to-violet-500/5",
      "from-blue-500/20 to-cyan-500/5",
      "from-teal-500/20 to-emerald-500/5",
      "from-amber-500/20 to-orange-500/5",
    ];
    return colors[i % colors.length];
  };

  return (
    <div className="relative min-h-screen pb-32 pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center"
        >
          <Sparkles className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-6 font-display text-6xl font-bold md:text-7xl">
            Our <span className="text-gradient italic">Timeline</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Every milestone, written in light. Every chapter, kept forever.
          </p>
          
          <button
            onClick={() => { setEditingMilestone(null); setIsModalOpen(true); }}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
          >
            <Plus className="h-4 w-4" /> Add Milestone
          </button>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Center line — only visible on md+ */}
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/40 to-transparent hidden md:block" />

          {milestones.map((m, i) => (
            <motion.div
              key={m._id}
              initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`relative mb-8 md:mb-16 flex w-full ${
                i % 2 ? "md:justify-end" : "md:justify-start"
              } justify-center`}
            >
              {/* Dot — only on md+ */}
              <div className="absolute left-1/2 top-7 z-10 hidden md:flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-primary shadow-glow ring-4 ring-background">
                <div className="h-2 w-2 rounded-full bg-primary-foreground" />
              </div>

              {/* Connector line — only on md+ */}
              <div
                className={`absolute top-8.5 z-0 h-px w-[calc(50%-2.5rem)] bg-gradient-to-r hidden md:block ${
                  i % 2
                    ? "left-[calc(50%+2.5rem)] from-primary/60 to-transparent"
                    : "right-[calc(50%+2.5rem)] from-transparent to-primary/60"
                }`}
              />

              {/* Card — full width mobile, half-width desktop */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`group w-full md:w-[calc(50%-3.5rem)] rounded-2xl glass-strong p-5 sm:p-6 shadow-cinema bg-gradient-to-br ${getColor(i)}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getEmoji(i)}</span>
                    <p className="text-xs uppercase tracking-widest text-rose">{formatDate(m.date)}</p>
                  </div>
                </div>
                <h3 className="font-display text-2xl font-bold">{m.title}</h3>
                {m.description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.description}</p>}
                
                {m.images && m.images.length > 0 && (
                  <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
                    {m.images.map((img, idx) => (
                      <img key={idx} src={img.url} className="h-24 w-24 object-cover rounded-lg flex-none border border-white/10" />
                    ))}
                  </div>
                )}
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3 fill-primary text-primary" />
                    <Heart className="h-2.5 w-2.5 fill-primary/60 text-primary/60" />
                    <Heart className="h-2 w-2 fill-primary/30 text-primary/30" />
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingMilestone(m); setIsModalOpen(true); }} 
                      className="rounded-full p-2 glass hover:text-primary transition"
                      aria-label="Edit milestone"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => setMilestoneToDelete(m)} 
                      className="rounded-full p-2 glass hover:text-destructive transition"
                      aria-label="Delete milestone"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}

          {milestones.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
              Your timeline is waiting to be written. Add your first milestone!
            </div>
          )}

          {/* End marker */}
          {milestones.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative flex justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-glow">
                  <Heart className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
                </div>
                <p className="font-display text-lg font-semibold text-gradient">To be continued…</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <UploadMilestoneModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingMilestone(null); }} 
        initialData={editingMilestone}
      />
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {milestoneToDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl glass-strong p-6 shadow-cinema text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose/10 text-rose mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Delete Milestone?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete "{milestoneToDelete.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMilestoneToDelete(null)}
                  className="flex-1 rounded-xl glass-strong py-3 text-sm font-semibold hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMilestone(milestoneToDelete._id);
                    setMilestoneToDelete(null);
                  }}
                  className="flex-1 rounded-xl bg-rose py-3 text-sm font-semibold text-white shadow-glow hover:shadow-[0_0_30px_#f43f5e50] transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
