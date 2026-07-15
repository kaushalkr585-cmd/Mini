import { useEffect, useState } from 'react';
import { Mic, MicOff, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamStatusProps {
  isActive: boolean;
  hasAudio: boolean;
  streamerName?: string | null;
  startedAt?: string | null;
  className?: string;
}

/** Formats elapsed seconds into MM:SS */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function StreamStatus({
  isActive,
  hasAudio,
  streamerName,
  startedAt,
  className = '',
}: StreamStatusProps) {
  const [elapsed, setElapsed] = useState(0);

  // Keep a live duration counter while the stream is active
  useEffect(() => {
    if (!isActive || !startedAt) {
      setElapsed(0);
      return;
    }

    const start = new Date(startedAt).getTime();
    const tick = () => {
      const diff = Math.floor((Date.now() - start) / 1000);
      setElapsed(Math.max(0, diff));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isActive, startedAt]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="stream-status"
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`flex flex-wrap items-center gap-2 ${className}`}
      >
        {/* LIVE badge */}
        <div className="flex items-center gap-1.5 rounded-lg bg-rose-600/90 px-2.5 py-1 shadow-glow">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Live</span>
        </div>

        {/* Duration */}
        <span className="text-xs font-mono font-medium text-muted-foreground">
          {formatDuration(elapsed)}
        </span>

        {/* Streamer name */}
        {streamerName && (
          <>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Monitor className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{streamerName}</span>
            </div>
          </>
        )}

        {/* Audio status */}
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
            hasAudio
              ? 'bg-emerald-400/15 text-emerald-400'
              : 'bg-muted text-muted-foreground'
          }`}
          title={hasAudio ? 'Audio is being shared' : 'No audio in this stream'}
        >
          {hasAudio ? (
            <>
              <Mic className="h-3 w-3" />
              <span>Audio</span>
            </>
          ) : (
            <>
              <MicOff className="h-3 w-3" />
              <span>No Audio</span>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
