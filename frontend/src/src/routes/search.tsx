import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect, lazy, Suspense } from "react";
import { Search as SearchIcon, X, Clock, TrendingUp } from "lucide-react";
import { useCoupleStore, Memory } from "@/store/coupleStore";
const MemoryViewerModal = lazy(() => import("@/components/MemoryViewerModal").then(m => ({ default: m.MemoryViewerModal })));
export const Route = createFileRoute("/search")({
  component: SearchPage,
});


function SearchPage() {
  const [query, setQuery] = useState("");
  const { memories, likeMemory, fetchMemories } = useCoupleStore();
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Fetch memories if not already loaded (e.g. user navigated directly to /search)
  useEffect(() => {
    if (memories.length === 0) fetchMemories();
  }, [fetchMemories, memories.length]);

  const results = query.length > 1
    ? memories.filter(
        (m) =>
          m.title?.toLowerCase().includes(query.toLowerCase()) ||
          m.tag?.toLowerCase().includes(query.toLowerCase()) ||
          m.sub?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const recentMemories = memories.slice(0, 4);
  const popularTags = Array.from(new Set(memories.map(m => m.tag).filter(Boolean))).slice(0, 6);
  const browseAll = memories.slice(0, 6);
  return (
    <div className="relative min-h-screen pb-16 pt-28">
      <div className="mx-auto max-w-3xl px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mb-10 text-center"
        >
          <h1 className="font-display text-4xl sm:text-5xl font-bold md:text-6xl">
            Search <span className="text-gradient italic">Everything</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Find any memory, letter, or moment.</p>
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mb-10"
        >
          <SearchIcon className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memories, letters, music…"
            className="w-full rounded-2xl glass-strong py-4 pl-14 pr-12 text-base outline-none ring-0 focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 shadow-cinema"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full glass p-1 text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>

        {/* Results */}
        {query.length > 1 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {results.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <SearchIcon className="mx-auto mb-4 h-10 w-10 opacity-30" />
                <p>No memories found yet 💖</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{results.length} results</p>
                {results.map((m, i) => (
                  <motion.div
                    key={m._id}
                    onClick={() => setSelectedMemory(m)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    whileHover={{ x: 6 }}
                    className="group flex cursor-pointer items-center gap-4 rounded-2xl glass-strong p-4 shadow-cinema transition-all hover:border-primary/20"
                  >
                    <img
                      src={m.url || m.thumbnail}
                      alt={m.title}
                      className="h-14 w-14 flex-none rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-rose">{m.tag}</p>
                      <h3 className="font-semibold">{m.title}</h3>
                      <p className="text-xs text-muted-foreground">{m.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-10"
          >
            {/* Recent */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentMemories.map((r) => (
                  <button
                    key={r._id}
                    onClick={() => setSelectedMemory(r)}
                    className="rounded-xl glass px-4 py-2 text-sm font-medium hover:bg-primary/10 transition-all"
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Popular Moments</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQuery(t)}
                    className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-all"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestion grid */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Browse All</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {browseAll.map((m, i) => (
                  <motion.div
                    key={m._id}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => setSelectedMemory(m)}
                    className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-cinema bg-white/5"
                    style={{ aspectRatio: "1" }}
                  >
                    {m.url && <img src={m.url} alt={m.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <p className="absolute bottom-2 left-2 right-2 text-[11px] font-semibold">{m.title}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
      <Suspense fallback={null}>
        <MemoryViewerModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} onLike={likeMemory} />
      </Suspense>
    </div>
  );
}
