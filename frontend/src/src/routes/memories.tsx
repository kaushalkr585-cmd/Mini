import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, Play, Plus, Search, Filter, Trash2, FolderPlus } from "lucide-react";
import { useCoupleStore, Memory } from "@/store/coupleStore";
import { MusicPlayer } from "@/components/MusicPlayer";
import { AddCategoryModal } from "@/components/AddCategoryModal";
import { UploadMemoryModal } from "@/components/UploadMemoryModal";
import { MemoryViewerModal } from "@/components/MemoryViewerModal";

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});

function MemoriesPage() {
  const { memories, fetchMemories, categories, fetchCategories, deleteMemory, likeMemory } = useCoupleStore();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isUploadMemoryOpen, setIsUploadMemoryOpen] = useState(false);

  useEffect(() => {
    fetchMemories();
    fetchCategories();
  }, [fetchMemories, fetchCategories]);

  const filtered = memories.filter((m) => {
    const matchCat = activeCategory === "All" || m.categoryId === activeCategory;
    const matchQuery = m.title.toLowerCase().includes(query.toLowerCase()) || m.sub.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  return (
    <div className="relative min-h-screen pb-32 pt-28">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-rose">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {memories.length} Memories
          </span>
          <h1 className="mt-6 font-display text-6xl font-bold md:text-7xl">
            Our <span className="text-gradient italic">Memories</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Every photograph, every heartbeat — archived forever.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search memories…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl glass-strong py-3 pl-11 pr-4 text-sm outline-none ring-0 focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
            />
          </div>
          <button onClick={() => setIsAddCategoryOpen(true)} className="flex items-center gap-2 rounded-xl glass-strong px-5 py-3 text-sm font-medium hover:bg-primary/10 transition">
            <FolderPlus className="h-4 w-4" /> New Category
          </button>
          <button onClick={() => setIsUploadMemoryOpen(true)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.6)] transition-all">
            <Plus className="h-4 w-4" /> Add Memory
          </button>
        </motion.div>

        {/* Tag Pills (Categories) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="scrollbar-hidden mb-10 flex gap-2 overflow-x-auto pb-2"
        >
          <button
            onClick={() => setActiveCategory("All")}
            className={`flex-none rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeCategory === "All"
                ? "bg-primary text-primary-foreground shadow-glow"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setActiveCategory(cat._id)}
              className={`flex-none rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                activeCategory === cat._id
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">No memories found.</div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {filtered.map((m, i) => (
              <motion.article
                key={m._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                whileHover={{ y: -6, scale: 1.03 }}
                className="group relative overflow-hidden rounded-2xl shadow-cinema cursor-pointer"
                style={{ aspectRatio: "3/4" }}
                onClick={() => setSelectedMemory(m)}
              >
                {m.type === 'video' ? (
                   <video src={m.url} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" muted loop playsInline onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                ) : (
                  <img
                    src={m.url}
                    alt={m.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                {m.urls && m.urls.length > 1 && (
                  <div className="absolute top-2 left-2 rounded-full glass px-2 py-0.5 text-[9px] font-medium text-white/90 shadow-sm backdrop-blur-md">
                    +{m.urls.length - 1} photos
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "radial-gradient(circle at 50% 30%, oklch(0.72 0.32 350 / 0.3), transparent 70%)" }}
                />
                <div className="absolute right-2 top-2 rounded-full glass px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider">
                  {m.tag}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-[10px] text-rose">{m.sub}</p>
                  <h3 className="mt-0.5 font-display text-sm font-semibold leading-tight">{m.title}</h3>
                  <div className="mt-2 flex translate-y-3 items-center gap-1 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                    <button className="flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                      <Play className="h-2.5 w-2.5 fill-current" /> Open
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); likeMemory(m._id); }} className="rounded-full glass p-1 ml-auto">
                      <Heart className={`h-2.5 w-2.5 ${m.likes && m.likes.length > 0 ? 'fill-rose text-rose' : ''}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteMemory(m._id); }} className="rounded-full glass p-1 hover:text-rose transition-colors">
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>

      <AddCategoryModal isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} />
      <UploadMemoryModal isOpen={isUploadMemoryOpen} onClose={() => setIsUploadMemoryOpen(false)} />
      <MemoryViewerModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} onLike={likeMemory} />
    </div>
  );
}
