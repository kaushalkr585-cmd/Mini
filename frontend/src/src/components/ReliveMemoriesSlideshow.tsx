import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, X, MapPin } from 'lucide-react';
import { Memory } from '@/store/coupleStore';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { releaseVideo } from '@/hooks/useVideoIntersection';

interface ReliveMemoriesSlideshowProps {
  memories: Memory[];
  onClose: () => void;
}

/** Preload an image URL so it's in cache before the slide transitions */
function preloadImage(url: string) {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

/** Get a thumbnail-friendly URL (Cloudinary auto-generate thumbnail for videos) */
function getThumbnailUrl(memory: Memory): string {
  if (memory.thumbnail) return memory.thumbnail;
  if (!memory.url.includes('cloudinary.com')) return memory.url;
  if (memory.type === 'video') {
    return memory.url.replace('/video/upload/', '/video/upload/c_limit,w_640,h_360,f_jpg,q_auto,so_0/');
  }
  return memory.url;
}

export function ReliveMemoriesSlideshow({ memories, onClose }: ReliveMemoriesSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isMobile, shouldReduceEffects } = useDeviceCapability();

  const SLIDE_DURATION = 5000;

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % memories.length);
    setProgress(0);
  }, [memories.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + memories.length) % memories.length);
    setProgress(0);
  }, [memories.length]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // ── Page Visibility — pause slideshow when tab is hidden ──────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setIsPlaying(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── Preload next slide ─────────────────────────────────────────────────────
  useEffect(() => {
    const nextIdx = (currentIndex + 1) % memories.length;
    const next = memories[nextIdx];
    if (!next) return;
    // Only preload images (videos are loaded on-demand)
    if (next.type !== 'video') {
      preloadImage(next.url);
    } else {
      preloadImage(getThumbnailUrl(next));
    }
  }, [currentIndex, memories]);

  // ── Clean up video on slide change ────────────────────────────────────────
  useEffect(() => {
    return () => {
      releaseVideo(videoRef.current);
    };
  }, [currentIndex]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      releaseVideo(videoRef.current);
    };
  }, []);

  // ── Auto slide & progress ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    const current = memories[currentIndex];
    // For video slides, don't auto-advance (let video play naturally)
    if (current?.type === 'video') return;

    const startTime = Date.now();
    let animationFrame: number;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= SLIDE_DURATION) {
        handleNext();
      } else {
        setProgress((elapsed / SLIDE_DURATION) * 100);
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationFrame);
  }, [currentIndex, isPlaying, handleNext, memories]);

  if (memories.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <div className="text-center text-white p-8">
          <p className="text-xl font-display mb-4">No memories yet.</p>
          <p className="text-muted-foreground text-sm mb-6">Start creating beautiful moments together.</p>
          <button onClick={onClose} className="rounded-full bg-primary px-6 py-3 min-h-[44px] text-sm font-semibold text-primary-foreground">
            Close
          </button>
        </div>
      </div>
    );
  }

  const current = memories[currentIndex];
  const isVideo = current.type === 'video';

  // Background: use thumbnail for videos (avoid loading full video URL as bg)
  const bgSrc = isVideo ? getThumbnailUrl(current) : current.url;

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden flex items-center justify-center">

      {/* Background blur — only render on desktop, skip on mobile for performance */}
      {!shouldReduceEffects && (
        <AnimatePresence initial={false}>
          <motion.img
            key={current._id + '-bg'}
            src={bgSrc}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110 pointer-events-none select-none"
            aria-hidden="true"
          />
        </AnimatePresence>
      )}
      {/* Simplified gradient bg for mobile */}
      {shouldReduceEffects && (
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-black pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none" />

      {/* Main slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current._id}
          initial={{ opacity: 0, scale: shouldReduceEffects ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: shouldReduceEffects ? 1 : 1.04 }}
          transition={{ duration: shouldReduceEffects ? 0.25 : 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex items-center justify-center"
          style={{
            maxHeight: '85vh',
            maxWidth: isMobile ? '100vw' : '90vw',
            width: '100%',
          }}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={current.url}
              poster={getThumbnailUrl(current)}
              playsInline
              autoPlay
              loop
              muted={isMobile} // mute autoplay on mobile for browser policy compliance
              preload="metadata"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)]"
            />
          ) : (
            <img
              src={current.url}
              alt={current.title}
              loading="eager"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.7)]"
            />
          )}

          {/* Slide info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none rounded-b-xl">
            <motion.p
              initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-primary mb-1.5"
            >
              {new Date(current.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </motion.p>
            <motion.h2
              initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="slideshow-title font-display font-bold drop-shadow-lg text-white"
              style={{ fontSize: isMobile ? 'clamp(1.25rem, 6vw, 2rem)' : 'clamp(1.5rem, 4vw, 3.5rem)' }}
            >
              {current.title}
            </motion.h2>
            {current.sub && (
              <motion.p
                initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="text-white/80 text-xs sm:text-base mt-1 line-clamp-2"
              >
                {current.sub}
              </motion.p>
            )}
            {current.location && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="mt-2 flex items-center gap-1.5 text-xs sm:text-sm text-white/60"
              >
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{current.location}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── HUD overlay ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">

        {/* Top bar: counter + close */}
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="flex gap-1.5 text-white/60 text-xs tracking-widest uppercase">
            <span className="text-white font-semibold">{currentIndex + 1}</span>
            <span>/</span>
            <span>{memories.length}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 backdrop-blur-sm p-3 min-h-[44px] min-w-[44px] hover:bg-white/20 transition-colors text-white flex items-center justify-center"
            aria-label="Close slideshow"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Left/Right navigation — centred vertically */}
        {memories.length > 1 && (
          <div className="absolute top-1/2 left-3 right-3 sm:left-4 sm:right-4 -translate-y-1/2 flex justify-between pointer-events-none">
            <button
              onClick={handlePrev}
              className="pointer-events-auto rounded-full bg-black/40 backdrop-blur-sm p-3 min-h-[48px] min-w-[48px] hover:bg-black/60 transition-colors text-white flex items-center justify-center"
              aria-label="Previous memory"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="pointer-events-auto rounded-full bg-black/40 backdrop-blur-sm p-3 min-h-[48px] min-w-[48px] hover:bg-black/60 transition-colors text-white flex items-center justify-center"
              aria-label="Next memory"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Bottom: play/pause + progress bar */}
        <div className="pointer-events-auto max-w-lg mx-auto w-full pb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white/70 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <div className="flex-1 h-1.5 sm:h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
