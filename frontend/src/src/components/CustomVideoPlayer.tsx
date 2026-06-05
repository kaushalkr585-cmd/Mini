import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Gauge, Settings
} from "lucide-react";
import { useVideoIntersection, usePageVisibilityPause, releaseVideo } from "@/hooks/useVideoIntersection";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";

interface CustomVideoPlayerProps {
  src: string;
  thumbnail?: string;
  className?: string;
  autoPlay?: boolean;
  /** Called when video is paused/stopped — parent can use to coordinate multiple players */
  onPause?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function getOptimizedVideoUrl(originalUrl: string, quality: '360p' | '720p' | '1080p' | 'auto') {
  if (!originalUrl) return '';
  if (!originalUrl.includes('cloudinary.com')) return originalUrl;

  let transform = 'q_auto,f_auto,vc_auto';
  if (quality === '360p') {
    transform = 'c_limit,w_640,h_360,q_auto,f_auto,vc_auto';
  } else if (quality === '720p') {
    transform = 'c_limit,w_1280,h_720,q_auto,f_auto,vc_auto';
  } else if (quality === '1080p') {
    transform = 'c_limit,w_1920,h_1080,q_auto,f_auto,vc_auto';
  } else {
    // Auto — adaptive based on device + network
    const conn = (navigator as any).connection;
    const effectiveType = conn ? conn.effectiveType : '4g';
    const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
    const width = window.innerWidth;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;

    if (isSlow || isMobile) {
      transform = 'c_limit,w_640,h_360,q_auto,f_auto,vc_auto';
    } else if (isTablet) {
      transform = 'c_limit,w_1280,h_720,q_auto,f_auto,vc_auto';
    } else {
      transform = 'c_limit,w_1920,h_1080,q_auto,f_auto,vc_auto';
    }
  }

  if (originalUrl.includes('/video/upload/')) {
    return originalUrl.replace('/video/upload/', `/video/upload/${transform}/`);
  } else if (originalUrl.includes('/upload/')) {
    return originalUrl.replace('/upload/', `/upload/${transform}/`);
  }

  return originalUrl;
}

export function CustomVideoPlayer({ src, thumbnail, className = "", autoPlay = false, onPause }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const { isMobile, shouldReduceEffects } = useDeviceCapability();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState<'360p' | '720p' | '1080p' | 'auto'>('auto');
  const [isLoading, setIsLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(500);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(autoPlay);
  const [showBigPlay, setShowBigPlay] = useState(!autoPlay);

  // ── Hooks ──────────────────────────────────────────────────────────────────

  // Auto-pause when out of viewport
  useVideoIntersection(videoRef, { threshold: 0.1, autoPlayOnEnter: false });

  // Pause on tab hide
  usePageVisibilityPause(videoRef);

  // ── Container width tracking ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Cleanup on unmount — release video resources ───────────────────────────
  useEffect(() => {
    return () => {
      releaseVideo(videoRef.current);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // ── Hide controls timer ────────────────────────────────────────────────────
  const speeds = [0.5, 1, 1.5, 2];

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying && !isScrubbing) setShowControls(false);
    }, 3000);
  }, [isPlaying, isScrubbing]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    } else {
      resetHideTimer();
    }
  }, [isPlaying, resetHideTimer]);

  // ── Play/Pause ─────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;

    // First interaction: set src and load before playing (lazy loading)
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      setShowBigPlay(false);
    }

    if (v.paused) {
      v.play().catch(console.error);
    } else {
      v.pause();
      onPause?.();
    }
  }, [hasUserInteracted, onPause]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; }
    setIsMuted(val === 0);
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
  }, []);

  // ── Scrubbing (mouse + touch) ──────────────────────────────────────────────
  const seekToPosition = useCallback((clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current || duration === 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  }, [duration]);

  const handleProgressPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    seekToPosition(e.clientX);
  }, [seekToPosition]);

  const handleProgressPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    seekToPosition(e.clientX);
  }, [isScrubbing, seekToPosition]);

  const handleProgressPointerUp = useCallback(() => {
    setIsScrubbing(false);
  }, []);

  // ── Speed / Quality ────────────────────────────────────────────────────────
  const handleSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  }, []);

  const handleQualityChange = useCallback((q: '360p' | '720p' | '1080p' | 'auto') => {
    setSelectedQuality(q);
    setShowQualityMenu(false);
    const v = videoRef.current;
    if (v) {
      const time = v.currentTime;
      const wasPlaying = !v.paused;
      const handleLoaded = () => {
        v.currentTime = time;
        if (wasPlaying) v.play().catch(console.error);
        v.removeEventListener('loadedmetadata', handleLoaded);
      };
      v.addEventListener('loadedmetadata', handleLoaded);
    }
  }, []);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const videoSrc = useMemo(() => {
    if (!hasUserInteracted) return ''; // Don't load until user taps
    return getOptimizedVideoUrl(src, selectedQuality);
  }, [src, selectedQuality, hasUserInteracted]);

  // When autoPlay is true, set hasUserInteracted immediately
  useEffect(() => {
    if (autoPlay) {
      setHasUserInteracted(true);
      setShowBigPlay(false);
    }
  }, [autoPlay]);

  // ── Compact mobile controls (< 360px wide) ─────────────────────────────────
  const isCompact = containerWidth < 360;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl bg-black group select-none flex items-center justify-center ${className}`}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={togglePlay}
      style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
    >
      {/* Video element — lazy: src only set after first interaction */}
      <video
        ref={videoRef}
        src={videoSrc || undefined}
        poster={thumbnail}
        className="max-w-full max-h-full object-contain"
        autoPlay={autoPlay}
        preload="metadata"
        onTimeUpdate={() => { if (!isScrubbing) setCurrentTime(videoRef.current?.currentTime || 0); }}
        onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => { setIsPlaying(true); setShowBigPlay(false); }}
        onPause={() => { setIsPlaying(false); onPause?.(); }}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedData={() => setIsLoading(false)}
        playsInline
      />

      {/* Pre-interaction: Big play poster */}
      {showBigPlay && thumbnail && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <div className="relative z-10 h-16 w-16 rounded-full glass-strong flex items-center justify-center shadow-glow">
            <Play className="h-7 w-7 fill-white text-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Loading spinner */}
      <AnimatePresence>
        {isLoading && hasUserInteracted && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big play button when paused (after first interaction) */}
      <AnimatePresence>
        {!isPlaying && !isLoading && hasUserInteracted && !showBigPlay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: shouldReduceEffects ? 0.1 : 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="h-16 w-16 rounded-full glass-strong flex items-center justify-center shadow-glow">
              <Play className="h-7 w-7 fill-white text-white translate-x-0.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && hasUserInteracted && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 video-controls-gradient p-3 z-20"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Progress bar — pointer events for touch scrubbing */}
            <div
              ref={progressRef}
              className="relative h-3 w-full cursor-pointer rounded-full bg-white/20 mb-2 flex items-center"
              onPointerDown={handleProgressPointerDown}
              onPointerMove={handleProgressPointerMove}
              onPointerUp={handleProgressPointerUp}
              style={{ touchAction: 'none' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute h-4 w-4 rounded-full bg-primary shadow-glow -translate-x-1/2 transition-transform"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-1.5">
              {/* Skip back — hide on very compact */}
              {!isCompact && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSkip(-10); }}
                  className="rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition touch-target"
                  aria-label="Skip back 10s"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
              )}

              {/* Play/Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="rounded-full bg-primary p-2 text-primary-foreground shadow-glow hover:scale-110 transition touch-target"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying
                  ? <Pause className="h-4 w-4 fill-current" />
                  : <Play  className="h-4 w-4 fill-current translate-x-px" />
                }
              </button>

              {/* Skip forward */}
              {!isCompact && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSkip(10); }}
                  className="rounded-full p-2 text-white/70 hover:text-white hover:bg-white/10 transition touch-target"
                  aria-label="Skip forward 10s"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              )}

              {/* Time display */}
              <span className="ml-1 text-xs text-white/70 tabular-nums shrink-0">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-1.5">
                {/* Volume — desktop only */}
                {containerWidth >= 380 && !isMobile && (
                  <div className="flex items-center gap-1 group/vol">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                      className="rounded-full p-1.5 text-white/70 hover:text-white transition touch-target"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300">
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolume}
                        className="video-volume-slider w-16 h-1.5 accent-primary cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}

                {/* Mute-only button on mobile */}
                {isMobile && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className="rounded-full p-1.5 text-white/70 hover:text-white transition touch-target"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                )}

                {/* Quality switcher — hide on mobile / compact */}
                {containerWidth >= 400 && !isMobile && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQualityMenu(q => !q); setShowSpeedMenu(false); }}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition border border-white/10"
                      aria-label="Video quality"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>{selectedQuality === 'auto' ? 'Auto' : selectedQuality}</span>
                    </button>
                    <AnimatePresence>
                      {showQualityMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 rounded-xl glass-strong p-1 shadow-cinema min-w-[95px] z-30"
                        >
                          {(['auto', '360p', '720p', '1080p'] as const).map((q) => (
                            <button
                              key={q}
                              onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                              className={`w-full rounded-lg px-3 py-1.5 text-xs text-left transition hover:bg-primary/20 ${selectedQuality === q ? "text-primary font-semibold" : "text-white/80"}`}
                            >
                              {q === 'auto' ? 'Auto (Adapt)' : q}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Speed — desktop only */}
                {containerWidth >= 460 && !isMobile && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(s => !s); setShowQualityMenu(false); }}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition border border-white/10"
                      aria-label="Playback speed"
                    >
                      <Gauge className="h-3.5 w-3.5" />
                      <span>{playbackSpeed}x</span>
                    </button>
                    <AnimatePresence>
                      {showSpeedMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 rounded-xl glass-strong p-1 shadow-cinema min-w-[80px] z-30"
                        >
                          {speeds.map((s) => (
                            <button
                              key={s}
                              onClick={(e) => { e.stopPropagation(); handleSpeed(s); }}
                              className={`w-full rounded-lg px-3 py-1.5 text-xs text-left transition hover:bg-primary/20 ${playbackSpeed === s ? "text-primary font-semibold" : "text-white/80"}`}
                            >
                              {s}x
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Fullscreen */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="rounded-full p-1.5 text-white/70 hover:text-white transition touch-target"
                  aria-label="Toggle fullscreen"
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
