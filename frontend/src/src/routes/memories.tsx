import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Heart, Play, Plus, Search, FolderPlus, Video, Trash2 } from "lucide-react";
import { useCoupleStore, Memory } from "@/store/coupleStore";
import { AddCategoryModal } from "@/components/AddCategoryModal";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

// Lazy-load heavy modals so they don't bloat the initial bundle
const UploadMemoryModal  = lazy(() => import("@/components/UploadMemoryModal").then(m => ({ default: m.UploadMemoryModal })));
const MemoryViewerModal  = lazy(() => import("@/components/MemoryViewerModal").then(m => ({ default: m.MemoryViewerModal })));

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});

function formatDuration(sec?: number) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Memory Card ──────────────────────────────────────────────────────────────

interface MemoryCardProps {
  m: Memory;
  index: number;
  onOpen: (m: Memory) => void;
  onDelete: (m: Memory) => void;
  onLike: (id: string) => void;
  isMobile: boolean;
  shouldReduceEffects: boolean;
}

// Memoized card — only re-renders when its own memory data changes
import { memo } from "react";

const MemoryCard = memo(function MemoryCard({
  m, index, onOpen, onDelete, onLike, isMobile, shouldReduceEffects
}: MemoryCardProps) {

  // Use thumbnail image for video cards in the grid (not a <video> element)
  // This avoids simultaneous video decoding and saves memory
  const thumbnailUrl = useMemo(() => {
    if (m.type !== 'video') return m.url;
    if (m.thumbnail) return m.thumbnail;
    if (m.url.includes('cloudinary.com')) {
      return m.url.replace('/video/upload/', '/video/upload/c_limit,w_480,h_640,f_jpg,q_auto,so_0/');
    }
    return m.url;
  }, [m.url, m.thumbnail, m.type]);

  return (
    <motion.article
      layout={!shouldReduceEffects}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: shouldReduceEffects ? 0.2 : 0.35, delay: Math.min(index * 0.02, 0.3) }}
      // Only apply whileHover on desktop — mobile doesn't have hover state
      whileHover={isMobile ? undefined : { y: -5, scale: 1.02 }}
      className="group relative overflow-hidden rounded-2xl shadow-cinema cursor-pointer memory-card-contain"
      style={{ aspectRatio: "3/4" }}
      onClick={() => onOpen(m)}
    >
      {/* Media — always use <img> in the grid (thumbnail for videos) */}
      <img
        src={thumbnailUrl}
        alt={m.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Video indicator overlay */}
      {m.type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-9 w-9 rounded-full glass-strong flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
            <Play className="h-4 w-4 fill-white text-white translate-x-px" />
          </div>
          {m.duration ? (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white font-medium tabular-nums flex items-center gap-1 z-10">
              <Video className="h-2.5 w-2.5" />
              {formatDuration(m.duration)}
            </div>
          ) : null}
        </div>
      )}

      {/* Multi-photo indicator */}
      {m.urls && m.urls.length > 1 && (
        <div className="absolute top-2 left-2 rounded-full glass px-2 py-0.5 text-[9px] font-medium text-white/90 shadow-sm z-10">
          +{m.urls.length - 1}
        </div>
      )}

      {/* Tag badge */}
      <div className="absolute right-2 top-2 z-10">
        {m.tags && m.tags.length > 0 ? (
          <span className="rounded-full glass px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider">
            #{m.tags[0]}
          </span>
        ) : m.tag ? (
          <span className="rounded-full glass px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider">
            {m.tag}
          </span>
        ) : null}
      </div>

      {/* Bottom gradient — tall enough to cover 2-row buttons */}
      <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />


      {/* Info + actions */}
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <p className="text-[9px] text-rose truncate">{m.sub}</p>
        <h3 className="mt-0.5 font-display text-xs font-semibold leading-tight line-clamp-2">{m.title}</h3>

        {/* Action buttons — always visible on mobile, hover-reveal on desktop */}
        <div className={`mt-2 space-y-1.5 transition-all duration-300 ${
          isMobile
            ? "opacity-100"
            : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
        }`}>
          {/* Open — full width primary button */}
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(m); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 min-h-[40px] text-xs font-semibold text-primary-foreground shadow-glow active:scale-95 transition-transform"
            aria-label="Open memory"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Open
          </button>

          {/* Secondary row: Like · Reactions · Delete */}
          <div className="flex items-center gap-1.5">
            {/* Like */}
            <button
              onClick={(e) => { e.stopPropagation(); onLike(m._id); }}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl glass py-2 min-h-[36px] hover:bg-white/15 active:scale-95 transition"
              aria-label="Like"
            >
              <Heart className={`h-4 w-4 ${m.likes && m.likes.length > 0 ? 'fill-rose text-rose' : 'text-foreground/70'}`} />
              {m.likes && m.likes.length > 0 && (
                <span className="text-[10px] font-semibold text-foreground/80">{m.likes.length}</span>
              )}
            </button>

            {/* Reactions badge */}
            {m.reactions && m.reactions.length > 0 && (
              <div className="flex flex-1 items-center justify-center gap-0.5 rounded-xl glass py-2 min-h-[36px] text-[11px] font-medium">
                <span>{Array.from(new Set(m.reactions.map(r => r.emoji))).slice(0, 2).join("")}</span>
                <span className="text-foreground/60">{m.reactions.length}</span>
              </div>
            )}

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(m); }}
              className="flex flex-1 items-center justify-center rounded-xl glass py-2 min-h-[36px] hover:text-rose hover:bg-rose/10 active:scale-95 transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function MemoriesPage() {
  const { memories, fetchMemories, categories, fetchCategories, deleteMemory, likeMemory, loading } = useCoupleStore();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isUploadMemoryOpen, setIsUploadMemoryOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);

  const { isMobile, shouldReduceEffects } = useDeviceCapability();

  useEffect(() => {
    fetchMemories();
    fetchCategories();
  }, [fetchMemories, fetchCategories]);

  // Memoized filtered list — avoids recomputing on every render
  const filtered = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return memories.filter((m) => {
      const matchCat = activeCategory === "All" || m.categoryId === activeCategory;
      if (!matchCat) return false;
      if (!lowerQuery) return true;
      return (
        m.title.toLowerCase().includes(lowerQuery) ||
        m.sub.toLowerCase().includes(lowerQuery) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(lowerQuery))) ||
        (m.tag && m.tag.toLowerCase().includes(lowerQuery))
      );
    });
  }, [memories, activeCategory, query]);

  const handleOpenMemory  = useCallback((m: Memory) => setSelectedMemory(m), []);
  const handleDeleteStart = useCallback((m: Memory) => setMemoryToDelete(m), []);
  const handleLikeMemory  = useCallback((id: string) => likeMemory(id), [likeMemory]);

  const handleDeleteConfirm = useCallback(() => {
    if (!memoryToDelete) return;
    deleteMemory(memoryToDelete._id);
    if (selectedMemory?._id === memoryToDelete._id) setSelectedMemory(null);
    setMemoryToDelete(null);
  }, [memoryToDelete, deleteMemory, selectedMemory]);

  return (
    <div className="relative min-h-screen pb-32 pt-24 sm:pt-28 overflow-x-hidden">

      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceEffects ? 0.3 : 0.7 }}
          className="mb-8 sm:mb-12 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-rose">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {memories.length} Memories
          </span>
          <h1 className="mt-4 font-display font-bold"
            style={{ fontSize: 'clamp(2rem, 10vw, 5rem)' }}
          >
            Our <span className="text-gradient italic">Memories</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            Every photograph, every heartbeat — archived forever.
          </p>
        </motion.div>

        {/* Search + Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-6 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search memories…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl glass-strong py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60 min-h-[44px]"
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="btn-glass flex items-center gap-2 flex-1 sm:flex-none justify-center min-h-[44px]"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="text-sm">New Category</span>
            </button>
            <button
              onClick={() => setIsUploadMemoryOpen(true)}
              className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add Memory</span>
            </button>
          </div>
        </motion.div>

        {/* Category filter pills — horizontally scrollable, no overflow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="scrollbar-hidden mb-8 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          <button
            onClick={() => setActiveCategory("All")}
            className={`flex-none rounded-full px-4 py-2 min-h-[36px] text-xs font-medium transition-all ${
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
              className={`flex-none rounded-full px-4 py-2 min-h-[36px] text-xs font-medium transition-all whitespace-nowrap ${
                activeCategory === cat._id
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </motion.div>

        {/* Memory grid */}
        {loading && memories.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 animate-pulse"
                style={{ aspectRatio: "3/4" }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 inset-x-3 space-y-2">
                  <div className="h-3 w-12 rounded bg-white/10" />
                  <div className="h-4 w-3/4 rounded bg-white/15" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {query ? `No memories match "${query}"` : "No memories yet. Add your first one! ♥"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((m, i) => (
              <MemoryCard
                key={m._id}
                m={m}
                index={i}
                onOpen={handleOpenMemory}
                onDelete={handleDeleteStart}
                onLike={handleLikeMemory}
                isMobile={isMobile}
                shouldReduceEffects={shouldReduceEffects}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddCategoryModal isOpen={isAddCategoryOpen} onClose={() => setIsAddCategoryOpen(false)} />

      <Suspense fallback={null}>
        {isUploadMemoryOpen && (
          <UploadMemoryModal isOpen={isUploadMemoryOpen} onClose={() => setIsUploadMemoryOpen(false)} />
        )}
        {selectedMemory && (
          <MemoryViewerModal
            memory={selectedMemory}
            onClose={() => setSelectedMemory(null)}
            onLike={likeMemory}
          />
        )}
      </Suspense>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {memoryToDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl glass-strong p-6 shadow-cinema text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose/10 text-rose mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Delete Memory?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete "{memoryToDelete.title}"? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setMemoryToDelete(null)}
                  className="flex-1 rounded-xl glass-strong min-h-[44px] text-sm font-semibold hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 rounded-xl bg-rose min-h-[44px] text-sm font-semibold text-white hover:opacity-90 transition"
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
