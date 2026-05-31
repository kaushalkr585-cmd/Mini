import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, X, MapPin } from 'lucide-react';
import { Memory } from '@/store/coupleStore';

interface ReliveMemoriesSlideshowProps {
  memories: Memory[];
  onClose: () => void;
}

export function ReliveMemoriesSlideshow({ memories, onClose }: ReliveMemoriesSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const SLIDE_DURATION = 5000;

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % memories.length);
    setProgress(0);
  }, [memories.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + memories.length) % memories.length);
    setProgress(0);
  }, [memories.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Auto slide & progress
  useEffect(() => {
    if (!isPlaying) return;

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
  }, [currentIndex, isPlaying, handleNext]);

  if (memories.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <div className="text-center text-white p-8">
          <p className="text-xl font-display mb-4">No memories yet.</p>
          <p className="text-muted-foreground text-sm mb-6">Start creating beautiful moments together.</p>
          <button onClick={onClose} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            Close
          </button>
        </div>
      </div>
    );
  }

  const current = memories[currentIndex];

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden flex items-center justify-center">
      {/* Background with cinematic blur */}
      <AnimatePresence initial={false}>
        <motion.img
          key={current._id + '-bg'}
          src={current.url}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 w-full h-full object-cover blur-3xl scale-110"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Main Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current._id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-h-[85vh] max-w-[90vw] overflow-hidden rounded-xl shadow-[0_0_80px_rgba(0,0,0,0.8)]"
        >
          {current.type === 'video' ? (
             <video src={current.url} autoPlay loop playsInline className="h-full w-full object-contain max-h-[85vh]" />
          ) : (
            <img src={current.url} alt={current.title} className="h-full w-full object-contain max-h-[85vh]" />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          
          <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 text-white">
            <motion.p 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-primary mb-2"
            >
              {new Date(current.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </motion.p>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              className="font-display text-4xl sm:text-6xl font-bold mb-3 drop-shadow-lg"
            >
              {current.title}
            </motion.h2>
            {current.sub && (
              <motion.p 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-white/80 text-sm sm:text-lg max-w-2xl"
              >
                {current.sub}
              </motion.p>
            )}
            {current.location && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="mt-4 flex items-center gap-2 text-xs sm:text-sm text-white/60"
              >
                <MapPin className="h-4 w-4" /> {current.location}
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls Container */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
        {/* Top bar */}
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="flex gap-2 text-white/50 text-xs tracking-widest uppercase">
            <span className="text-white">{currentIndex + 1}</span> / {memories.length}
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-3 hover:bg-white/20 backdrop-blur-md transition-colors text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Center Nav buttons */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 flex justify-between pointer-events-none">
          <button onClick={handlePrev} className="pointer-events-auto rounded-full bg-black/30 p-4 hover:bg-black/50 backdrop-blur-md transition-colors text-white">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button onClick={handleNext} className="pointer-events-auto rounded-full bg-black/30 p-4 hover:bg-black/50 backdrop-blur-md transition-colors text-white">
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="pointer-events-auto max-w-lg mx-auto w-full pb-4">
          <div className="flex items-center gap-6 justify-center">
            <button onClick={() => setIsPlaying(!isPlaying)} className="text-white/70 hover:text-white transition-colors">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
