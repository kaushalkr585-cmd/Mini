import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Gauge
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const speeds = [0.5, 1, 1.5, 2];

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

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
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  const handleSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) { await el.requestFullscreen(); setIsFullscreen(true); }
    else { await document.exitFullscreen(); setIsFullscreen(false); }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl bg-black group ${className}`}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onClick={togglePlay}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        className="w-full h-full object-contain"
        autoPlay={autoPlay}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
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
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
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
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
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
            className="absolute inset-x-0 bottom-0 video-controls-gradient p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="relative h-1.5 w-full cursor-pointer rounded-full bg-white/20 mb-3 group/prog"
              onClick={handleProgressClick}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute -top-1 h-3.5 w-3.5 rounded-full bg-primary shadow-glow opacity-0 group-hover/prog:opacity-100 transition-all -translate-x-1/2"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center gap-2">
              {/* Skip back */}
              <button
                onClick={() => handleSkip(-10)}
                className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition"
                title="Skip back 10s"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="rounded-full bg-primary p-2 text-primary-foreground shadow-glow hover:scale-110 transition"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current translate-x-px" />}
              </button>

              {/* Skip forward */}
              <button
                onClick={() => handleSkip(10)}
                className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition"
                title="Skip forward 10s"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {/* Time display */}
              <span className="ml-1 text-xs text-white/70 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-2">
                {/* Volume */}
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

                {/* Playback speed */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu((s) => !s)}
                    className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition"
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
                        className="absolute bottom-full right-0 mb-2 rounded-xl glass-strong p-1 shadow-cinema min-w-[80px]"
                      >
                        {speeds.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSpeed(s)}
                            className={`w-full rounded-lg px-3 py-1.5 text-xs text-left transition hover:bg-primary/20 ${playbackSpeed === s ? "text-primary font-semibold" : "text-white/80"}`}
                          >
                            {s}x
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
