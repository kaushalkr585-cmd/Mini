import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Heart, Play, Plus, Search, Filter, Trash2, FolderPlus, Video } from "lucide-react";
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
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);

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
              type="text" placeholder="Search memories…" value={query} onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl glass-strong py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
            />
          </div>
          <button onClick={() => setIsAddCategoryOpen(true)} className="btn-glass flex items-center gap-2">
            <FolderPlus className="h-4 w-4" /> New Category
          </button>
          <button onClick={() => setIsUploadMemoryOpen(true)} className="btn-primary flex items-center gap-2">
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
                  <div className="absolute inset-0">
                    <video
                      src={m.url}
                      poster={m.thumbnail}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      muted loop playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    />
                    {/* Video play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-300 pointer-events-none">
                      <div className="h-10 w-10 rounded-full glass-strong flex items-center justify-center shadow-glow">
                        <Play className="h-4 w-4 fill-white text-white translate-x-px" />
                      </div>
                    </div>
                    <VideoGridDuration src={m.url} />
                  </div>
                ) : (
                  <img
                    src={m.url}
                    alt={m.title}
                    loading="lazy"
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
                  <div className="mt-2 flex flex-wrap translate-y-3 items-center gap-1 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                    <button className="flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                      <Play className="h-2.5 w-2.5 fill-current" /> Open
                    </button>
                    {m.reactions && m.reactions.length > 0 && (
                      <div className="flex items-center gap-0.5 rounded-full glass px-2 py-1 text-[10px] font-medium ml-1">
                        {Array.from(new Set(m.reactions.map(r => r.emoji))).slice(0, 2).join("")} 
                        <span className="ml-0.5 text-white/80">{m.reactions.length}</span>
                      </div>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); likeMemory(m._id); }} className="rounded-full glass p-1 ml-auto">
                      <Heart className={`h-2.5 w-2.5 ${m.likes && m.likes.length > 0 ? 'fill-rose text-rose' : ''}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setMemoryToDelete(m); }} className="rounded-full glass p-1 hover:text-rose transition-colors">
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
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {memoryToDelete && (
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
              <h3 className="text-xl font-display font-bold mb-2">Delete Memory?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete "{memoryToDelete.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMemoryToDelete(null)}
                  className="flex-1 rounded-xl glass-strong py-3 text-sm font-semibold hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMemory(memoryToDelete._id);
                    setMemoryToDelete(null);
                    if (selectedMemory?._id === memoryToDelete._id) setSelectedMemory(null);
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

function VideoGridDuration({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<string | null>(null);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        className="hidden"
        preload="metadata"
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v && isFinite(v.duration)) {
            const m = Math.floor(v.duration / 60);
            const s = Math.floor(v.duration % 60);
            setDuration(`${m}:${s.toString().padStart(2, "0")}`);
          }
        }}
      />
      {duration && (
        <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white font-medium tabular-nums flex items-center gap-1 z-10">
          <Video className="h-2.5 w-2.5" />
          {duration}
        </div>
      )}
    </>
  );
}
