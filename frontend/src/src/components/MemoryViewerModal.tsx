import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Heart, Play, Pause, Calendar, MapPin, Edit2, Trash2 } from "lucide-react";
import { Memory, useCoupleStore } from "@/store/coupleStore";
import { MemoryEditModal } from "./MemoryEditModal";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { useAuthStore } from "@/store/authStore";
import { ReactionPicker } from "./ReactionPicker";

const REACTIONS = ["❤️", "😍", "😂", "😢"];

export function MemoryViewerModal({ memory: initialMemory, onClose, onLike }: { memory: Memory | null; onClose: () => void; onLike: (id: string) => void }) {
  const { reactToMemory, deleteMemory, memories } = useCoupleStore();
  const { user } = useAuthStore();
  
  // Use fresh memory from store to immediately reflect reactions/likes
  const memory = memories.find(m => m._id === initialMemory?._id) || initialMemory;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Reset state when memory changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [memory]);

  // Autoplay slideshow
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && memory && memory.urls.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % memory.urls.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, memory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (!memory) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCurrentIndex((p) => (p + 1) % memory.urls.length);
      if (e.key === "ArrowLeft") setCurrentIndex((p) => (p - 1 + memory.urls.length) % memory.urls.length);
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [memory, onClose]);

  const images = memory?.urls && memory.urls.length > 0 ? memory.urls : (memory?.url ? [memory.url] : []);

  return (
    <>
      <AnimatePresence>
        {memory && (
          <motion.div
            key="viewer-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl dark"
          >
            {/* Background Blur Image */}
            <div 
              className="absolute inset-0 opacity-20 scale-110 blur-3xl pointer-events-none transition-all duration-1000"
              style={{ backgroundImage: `url(${images[currentIndex] || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4">
            {memory.tags && memory.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.map(t => (
                  <span key={t} className="rounded-full glass px-3 py-1 text-xs font-medium uppercase tracking-wider">#{t}</span>
                ))}
              </div>
            ) : (
              <span className="rounded-full glass px-3 py-1 text-xs font-medium uppercase tracking-wider">{memory.tag}</span>
            )}
            {images.length > 1 && (
              <span className="text-sm font-medium text-white/70">{currentIndex + 1} / {images.length}</span>
            )}
          </div>
          <button onClick={onClose} className="btn-glass-icon">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="relative z-0 flex h-full w-full min-h-0 overflow-hidden flex-col lg:flex-row items-center pt-20 pb-6 px-6 gap-8">
          
          {/* Image/Video Area */}
          <div className="relative flex-1 flex min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl">
            {memory.type === 'video' ? (
              <CustomVideoPlayer
                src={memory.url}
                thumbnail={memory.thumbnail}
                className="max-h-[70vh] max-w-full"
              />
            ) : (
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.98, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 1.02, x: -20 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  src={images[currentIndex]}
                  className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
                />
              </AnimatePresence>
            )}

            {images.length > 1 && (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex((p) => (p - 1 + images.length) % images.length); }}
                  className="absolute left-4 rounded-full glass p-3 text-white/70 hover:text-white hover:scale-110 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex((p) => (p + 1) % images.length); }}
                  className="absolute right-4 rounded-full glass p-3 text-white/70 hover:text-white hover:scale-110 transition opacity-0 group-hover:opacity-100 md:opacity-100"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                
                <div className="absolute bottom-4 flex gap-2">
                  {images.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-white/40 hover:bg-white/80'}`} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex h-auto max-h-[45vh] lg:max-h-none lg:h-full w-full lg:w-[400px] flex-col rounded-3xl glass-strong shadow-cinema flex-none overflow-hidden">
            <div className="flex-1 w-full overflow-y-auto scrollbar-hidden flex flex-col p-6 lg:p-8">
            <h2 className="font-display text-3xl lg:text-4xl font-bold leading-tight text-white mb-2">{memory.title}</h2>
            
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-rose">
                <Calendar className="h-4 w-4" />
                <span>{memory.sub}</span>
              </div>
              {memory.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{memory.location}</span>
                </div>
              )}
            </div>

            <p className="text-white/80 leading-relaxed text-sm mb-8 whitespace-pre-wrap flex-1">
              {memory.notes || "No description provided."}
            </p>

            {/* Controls */}
            <div className="flex items-center gap-3 pt-6 border-t border-white/10 mt-auto">
              <button 
                onClick={() => onLike(memory._id)}
                className="flex items-center justify-center gap-2 flex-1 rounded-xl glass-strong py-3 hover:bg-white/10 transition"
              >
                <Heart className={`h-5 w-5 ${memory.likes && memory.likes.length > 0 ? "fill-primary text-primary" : "text-white/70"}`} />
                <span className="text-sm font-medium">{memory.likes?.length || 0}</span>
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pt-4">
              {Array.from(new Set([
                "❤️", "😍", "😂", "😢", "🔥", "🥹",
                ...(memory.reactions?.map(r => r.emoji) || [])
              ])).map(emoji => {
                const count = memory.reactions?.filter(r => r.emoji === emoji).length || 0;
                const hasReacted = memory.reactions?.some(
                  r => (r.userId?._id || r.userId || (r as any).user) === user?.id && r.emoji === emoji
                );
                
                const isDefault = ["❤️", "😍", "😂", "😢", "🔥", "🥹"].includes(emoji);
                if (count === 0 && !isDefault) return null;

                return (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      if (memory) {
                        reactToMemory(memory._id, emoji);
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition text-sm ${
                      hasReacted
                        ? "bg-primary/20 border border-primary/50 text-white"
                        : "glass hover:bg-white/10 text-white/80"
                    }`}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    {count > 0 && <span className="text-xs font-semibold">{count}</span>}
                  </motion.button>
                );
              })}
              
              <ReactionPicker
                onReact={(emoji) => reactToMemory(memory._id, emoji)}
                className="ml-1"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 pt-4 mb-2">
              <button 
                onClick={() => setIsEditOpen(true)}
                className="flex items-center justify-center gap-2 flex-1 rounded-xl glass-strong py-3 hover:bg-white/10 transition"
              >
                <Edit2 className="h-5 w-5 text-white/70" />
                <span className="text-sm font-medium">Edit</span>
              </button>
              
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this memory?")) {
                    deleteMemory(memory._id);
                    onClose();
                  }
                }}
                className="flex items-center justify-center gap-2 flex-1 rounded-xl btn-danger py-3 hover:bg-rose/20 transition"
              >
                <Trash2 className="h-5 w-5" />
                <span className="text-sm font-medium">Delete</span>
              </button>
              
              {images.length > 1 && (
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center justify-center gap-2 flex-1 rounded-xl bg-primary py-3 text-primary-foreground shadow-glow hover:shadow-[0_0_30px_oklch(0.72_0.32_350/0.4)] transition"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                  <span className="text-sm font-semibold">{isPlaying ? "Pause" : "Slideshow"}</span>
                </button>
              )}
            </div>
            {/* Small spacer to ensure the buttons are fully clear of the rounded bottom corners when scrolling */}
            <div className="h-6 flex-shrink-0" />
          </div>
        </div>

        </div>
      </motion.div>
        )}
      </AnimatePresence>
      <MemoryEditModal memory={memory} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </>
  );
}
