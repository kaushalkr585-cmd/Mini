import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Heart, Play, Pause, Calendar, MapPin, Edit2, Trash2 } from "lucide-react";
import { Memory, useCoupleStore } from "@/store/coupleStore";
import { MemoryEditModal } from "./MemoryEditModal";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { useAuthStore } from "@/store/authStore";
import { ReactionPicker } from "./ReactionPicker";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { releaseVideo } from "@/hooks/useVideoIntersection";

export const MemoryViewerModal = memo(function MemoryViewerModal({
  memory: initialMemory,
  onClose,
  onLike,
}: {
  memory: Memory | null;
  onClose: () => void;
  onLike: (id: string) => void;
}) {
  const { reactToMemory, deleteMemory, memories } = useCoupleStore();
  const { user } = useAuthStore();
  const { isMobile, shouldReduceEffects } = useDeviceCapability();

  // Use fresh memory from store to immediately reflect reactions/likes
  const memory = memories.find(m => m._id === initialMemory?._id) || initialMemory;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const videoCleanupRef = useRef<HTMLVideoElement | null>(null);

  // Reset state when memory changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [memory?._id]);

  // Cleanup video resources when modal closes
  useEffect(() => {
    return () => {
      releaseVideo(videoCleanupRef.current);
    };
  }, []);

  // Slideshow autoplay
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
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
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      if (!memory) return;
      if (e.key === "Escape") { if (showDeleteConfirm) setShowDeleteConfirm(false); else onClose(); }
      if (e.key === "ArrowRight") setCurrentIndex((p) => (p + 1) % memory.urls.length);
      if (e.key === "ArrowLeft") setCurrentIndex((p) => (p - 1 + memory.urls.length) % memory.urls.length);
      if (e.key === " ") { e.preventDefault(); setIsPlaying((p) => !p); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [memory, onClose, showDeleteConfirm]);

  const images = memory?.urls && memory.urls.length > 0 ? memory.urls : (memory?.url ? [memory.url] : []);

  const handleDelete = useCallback(() => {
    if (!memory) return;
    deleteMemory(memory._id);
    setShowDeleteConfirm(false);
    onClose();
  }, [memory, deleteMemory, onClose]);

  const handleLike = useCallback(() => {
    if (memory) onLike(memory._id);
  }, [memory, onLike]);

  const handleReact = useCallback((emoji: string) => {
    if (memory) reactToMemory(memory._id, emoji);
  }, [memory, reactToMemory]);

  const goNext = useCallback(() => setCurrentIndex((p) => (p + 1) % images.length), [images.length]);
  const goPrev = useCallback(() => setCurrentIndex((p) => (p - 1 + images.length) % images.length), [images.length]);

  if (!memory) return null;

  const DEFAULT_REACTIONS = ["❤️", "😍", "😂", "😢", "🔥", "🥹"];

  return (
    <>
      <AnimatePresence>
        {memory && (
          <motion.div
            key="viewer-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceEffects ? 0.15 : 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 dark"
            style={{ backdropFilter: shouldReduceEffects ? 'blur(8px)' : 'blur(20px)' }}
          >
            {/* Ambient background — skip on mobile */}
            {!shouldReduceEffects && (
              <div
                className="absolute inset-0 opacity-15 scale-110 blur-3xl pointer-events-none transition-all duration-700"
                style={{
                  backgroundImage: `url(${images[currentIndex] || ''})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-2 flex-wrap max-w-[75%]">
                {memory.tags && memory.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {memory.tags.slice(0, isMobile ? 1 : 3).map(t => (
                      <span key={t} className="rounded-full glass px-2 py-0.5 text-[10px] sm:text-xs font-medium uppercase tracking-wider">#{t}</span>
                    ))}
                  </div>
                ) : (
                  <span className="rounded-full glass px-2 py-0.5 text-[10px] sm:text-xs font-medium uppercase tracking-wider">{memory.tag}</span>
                )}
                {images.length > 1 && (
                  <span className="text-xs font-medium text-white/60">{currentIndex + 1}/{images.length}</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="touch-target rounded-full glass-strong flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main layout — single column on mobile, side by side on desktop */}
            <div className="relative z-0 flex w-full h-full pt-14 pb-2 px-3 sm:pt-20 sm:pb-6 sm:px-6 flex-col lg:flex-row items-stretch gap-3 sm:gap-6 overflow-hidden">

              {/* ── Media area ─────────────────────────────────────────── */}
              <div className="relative flex-1 flex min-h-0 w-full items-center justify-center overflow-hidden rounded-xl"
                style={{ maxHeight: isMobile ? '45vh' : undefined }}
              >
                {memory.type === 'video' ? (
                  <CustomVideoPlayer
                    src={memory.url}
                    thumbnail={memory.thumbnail}
                    className="w-full max-h-full rounded-xl"
                    autoPlay={false}
                  />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: shouldReduceEffects ? 0.15 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                      src={images[currentIndex]}
                      alt={memory.title}
                      className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
                      loading="lazy"
                    />
                  </AnimatePresence>
                )}

                {/* Image navigation arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-2 touch-target rounded-full glass flex items-center justify-center text-white/70 hover:text-white transition"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-2 touch-target rounded-full glass flex items-center justify-center text-white/70 hover:text-white transition"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Dot indicators */}
                    <div className="absolute bottom-3 flex gap-1.5 justify-center">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentIndex(i)}
                          className={`rounded-full transition-all ${i === currentIndex ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                          aria-label={`Go to image ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── Info panel ─────────────────────────────────────────── */}
              {/* On mobile: compact panel below image. On desktop: 380px sidebar */}
              <div
                className="flex flex-col rounded-2xl sm:rounded-3xl glass-strong shadow-cinema flex-none overflow-hidden"
                style={{
                  width: isMobile ? '100%' : undefined,
                  maxWidth: isMobile ? undefined : '380px',
                  // On mobile, limit height to avoid pushing content off-screen
                  maxHeight: isMobile ? 'calc(55vh - 3rem)' : undefined,
                  flex: isMobile ? '0 0 auto' : '0 0 380px',
                }}
              >
                <div className="flex-1 overflow-y-auto scrollbar-hidden p-4 sm:p-6 space-y-4">

                  {/* Title */}
                  <h2 className="font-display font-bold leading-tight text-white"
                    style={{ fontSize: isMobile ? '1.25rem' : '1.75rem' }}
                  >
                    {memory.title}
                  </h2>

                  {/* Date + Location */}
                  <div className="flex flex-col gap-1.5">
                    {memory.sub && (
                      <div className="flex items-center gap-2 text-sm text-rose">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{memory.sub}</span>
                      </div>
                    )}
                    {memory.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">{memory.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {memory.notes && (
                    <p className="text-white/75 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap line-clamp-4 sm:line-clamp-none">
                      {memory.notes}
                    </p>
                  )}

                  {/* Like button */}
                  <div className="pt-3 border-t border-white/10">
                    <button
                      onClick={handleLike}
                      className="flex items-center gap-2 rounded-xl glass-strong px-4 py-2.5 min-h-[44px] hover:bg-white/10 transition w-full justify-center"
                    >
                      <Heart className={`h-4 w-4 ${memory.likes && memory.likes.length > 0 ? "fill-primary text-primary" : "text-white/70"}`} />
                      <span className="text-sm font-medium">{memory.likes?.length || 0}</span>
                    </button>
                  </div>

                  {/* Reactions */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {Array.from(new Set([
                      ...DEFAULT_REACTIONS,
                      ...(memory.reactions?.map(r => r.emoji) || [])
                    ])).map(emoji => {
                      const count = memory.reactions?.filter(r => r.emoji === emoji).length || 0;
                      const hasReacted = memory.reactions?.some(
                        r => (r.userId?._id || r.userId || (r as any).user) === user?.id && r.emoji === emoji
                      );
                      const isDefault = DEFAULT_REACTIONS.includes(emoji);
                      if (count === 0 && !isDefault) return null;

                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReact(emoji)}
                          className={`flex items-center gap-1 rounded-full px-2 py-1 min-h-[36px] transition text-sm ${
                            hasReacted
                              ? "bg-primary/20 border border-primary/50 text-white"
                              : "glass hover:bg-white/10 text-white/80"
                          }`}
                        >
                          <span className="text-base leading-none">{emoji}</span>
                          {count > 0 && <span className="text-xs font-semibold">{count}</span>}
                        </button>
                      );
                    })}
                    <ReactionPicker onReact={handleReact} />
                  </div>

                  {/* Action buttons: Edit, Delete, Slideshow */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => setIsEditOpen(true)}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 rounded-xl glass-strong min-h-[44px] px-3 hover:bg-white/10 transition"
                    >
                      <Edit2 className="h-4 w-4 text-white/70" />
                      <span className="text-sm font-medium">Edit</span>
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 rounded-xl min-h-[44px] px-3 bg-rose/10 border border-rose/20 text-rose hover:bg-rose/20 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Delete</span>
                    </button>

                    {images.length > 1 && (
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 rounded-xl bg-primary min-h-[44px] px-3 text-primary-foreground shadow-glow hover:opacity-90 transition"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                        <span className="text-sm font-semibold">{isPlaying ? "Pause" : "Slideshow"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl glass-strong p-6 text-center shadow-cinema"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose/10 text-rose">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Delete Memory?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete "{memory?.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-xl glass-strong min-h-[44px] text-sm font-semibold hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-rose min-h-[44px] text-sm font-semibold text-white hover:opacity-90 transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MemoryEditModal memory={memory} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </>
  );
});
