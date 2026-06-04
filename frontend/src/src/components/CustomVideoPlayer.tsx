import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Gauge, Settings
} from "lucide-react";

interface CustomVideoPlayerProps {
  src: string;
  thumbnail?: string;
  className?: string;
  autoPlay?: boolean;
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
    // Auto resolution based on client network & screen size
    const conn = (navigator as any).connection;
    const effectiveType = conn ? conn.effectiveType : '4g';
    const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
    
    const width = window.innerWidth;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    
    if (isSlow) {
      transform = 'c_limit,w_640,h_360,q_auto,f_auto,vc_auto';
    } else if (isMobile) {
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

export function CustomVideoPlayer({ src, thumbnail, className = "", autoPlay = false }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();

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

  const speeds = [0.5, 1, 1.5, 2];

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying && !isScrubbing) setShowControls(false);
    }, 3000);
  }, [isPlaying, isScrubbing]);

  useEffect(() => {
    return () => { if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current); };
  }, []);

  useEffect(() => {
    if (!isPlaying) { setShowControls(true); if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current); }
    else { resetHideTimer(); }
  }, [isPlaying, resetHideTimer]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(console.error);
    } else {
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; }
    setIsMuted(val === 0);
  };

  const handleSkip = (seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
  };

  const seekToPosition = useCallback((clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current || duration === 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  }, [duration]);

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsScrubbing(true);
    seekToPosition(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, seekToPosition]);

  const handleSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const handleQualityChange = (q: '360p' | '720p' | '1080p' | 'auto') => {
    setSelectedQuality(q);
    setShowQualityMenu(false);
    
    const v = videoRef.current;
    if (v) {
      const time = v.currentTime;
      const wasPlaying = !v.paused;
      
      const handleLoaded = () => {
        v.currentTime = time;
        if (wasPlaying) {
          v.play().catch(console.error);
        }
        v.removeEventListener('loadedmetadata', handleLoaded);
      };
      v.addEventListener('loadedmetadata', handleLoaded);
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { await el.requestFullscreen(); setIsFullscreen(true); }
    else { await document.exitFullscreen(); setIsFullscreen(false); }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const videoSrc = useMemo(() => {
    return getOptimizedVideoUrl(src, selectedQuality);
  }, [src, selectedQuality]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl bg-black group select-none flex items-center justify-center ${className}`}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onClick={togglePlay}
      style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={thumbnail}
        className="max-w-full max-h-full object-contain"
        autoPlay={autoPlay}
        preload="auto"
        onTimeUpdate={() => { if (!isScrubbing) setCurrentTime(videoRef.current?.currentTime || 0); }}
        onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedData={() => setIsLoading(false)}
        playsInline
      />

      {/* Loading spinner */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big play button in center when paused */}
      <AnimatePresence>
        {!isPlaying && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="h-20 w-20 rounded-full glass-strong flex items-center justify-center shadow-glow">
              <Play className="h-8 w-8 fill-white text-white translate-x-0.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 video-controls-gradient p-4 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar with drag support */}
            <div
              ref={progressRef}
              className="relative h-2.5 w-full cursor-pointer rounded-full bg-white/20 mb-3 group/prog flex items-center"
              onMouseDown={handleProgressMouseDown}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute h-4 w-4 rounded-full bg-primary shadow-glow transition-all -translate-x-1/2"
                style={{ left: `${progress}%`, opacity: isScrubbing ? 1 : undefined }}
              />
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center gap-2">
              {/* Skip back */}
              {containerWidth >= 320 && (
                <button
                  onClick={() => handleSkip(-10)}
                  className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition"
                  title="Skip back 10s"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
              )}

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="rounded-full bg-primary p-2 text-primary-foreground shadow-glow hover:scale-110 transition"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current translate-x-px" />}
              </button>

              {/* Skip forward */}
              {containerWidth >= 320 && (
                <button
                  onClick={() => handleSkip(10)}
                  className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition"
                  title="Skip forward 10s"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              )}

              {/* Time display */}
              <span className="ml-1 text-xs text-white/70 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-2">
                {/* Volume */}
                {containerWidth >= 380 && (
                  <div className="flex items-center gap-1.5 group/vol">
                    <button onClick={toggleMute} className="rounded-full p-1.5 text-white/70 hover:text-white transition">
                      {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300">
                      <input
                        type="range" min={0} max={1} step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolume}
                        className="video-volume-slider w-16 h-1.5 accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Video quality switcher */}
                {containerWidth >= 380 && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQualityMenu(q => !q); setShowSpeedMenu(false); }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition border border-white/10"
                      title="Video Quality"
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

                {/* Playback speed */}
                {containerWidth >= 440 && (
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSpeedMenu((s) => !s); setShowQualityMenu(false); }}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition border border-white/10"
                      title="Playback Speed"
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
                  onClick={toggleFullscreen}
                  className="rounded-full p-1.5 text-white/70 hover:text-white transition"
                  title="Toggle fullscreen"
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
