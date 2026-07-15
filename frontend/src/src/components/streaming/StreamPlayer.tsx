import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface StreamPlayerHandle {
  /** Attach a remote MediaStream to the video element */
  setRemoteStream: (stream: MediaStream | null) => void;
  /** Attach a local preview MediaStream to the main video element */
  setLocalStream: (stream: MediaStream | null) => void;
  /** Set playback volume (0–1) */
  setVolume: (v: number) => void;
  /** Mute or unmute the video element */
  setMuted: (muted: boolean) => void;
  /** Attempt to resume playback (e.g., after autoplay was blocked) */
  resumePlayback: () => void;
  /** Request native fullscreen on the player wrapper */
  requestFullscreen: () => Promise<void>;
}

interface StreamPlayerProps {
  isActive: boolean;
  iAmStreaming: boolean;
  isFullscreen: boolean;
  isTheaterMode: boolean;
  streamerName?: string | null;
  remoteHasAudio: boolean;
  onAutoplayBlocked: () => void;
}

/**
 * StreamPlayer renders the stream (remote or local screen share preview)
 * in the main active viewport. Uses forwardRef + useImperativeHandle so all
 * media operations are done imperatively directly on the DOM element.
 */
export const StreamPlayer = forwardRef<StreamPlayerHandle, StreamPlayerProps>(
  function StreamPlayer(
    {
      isActive,
      iAmStreaming,
      isFullscreen,
      isTheaterMode,
      streamerName,
      remoteHasAudio,
      onAutoplayBlocked,
    },
    ref,
  ) {
    const mainVideoRef = useRef<HTMLVideoElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Track whether we have a stream attached (drives CSS opacity)
    const hasStreamRef = useRef(false);
    // Track whether the current stream is local (to enforce mute and prevent feedback loops)
    const isLocalRef = useRef(false);

    const attemptPlay = useCallback(
      async (video: HTMLVideoElement, label: string) => {
        try {
          await video.play();
          if (import.meta.env.DEV) console.debug(`[StreamPlayer] ${label} playing`);
        } catch (err) {
          if (err instanceof Error && err.name === 'NotAllowedError') {
            // Autoplay blocked — surface banner to user
            if (import.meta.env.DEV) console.warn('[StreamPlayer] Autoplay blocked');
            onAutoplayBlocked();
          } else if (err instanceof Error && err.name !== 'AbortError') {
            // AbortError is harmless (fired when src changes rapidly)
            console.warn(`[StreamPlayer] ${label} play error:`, err);
          }
        }
      },
      [onAutoplayBlocked],
    );

    // ── Imperative API ──────────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        setRemoteStream: (stream: MediaStream | null) => {
          const video = mainVideoRef.current;
          if (!video) return;

          isLocalRef.current = false;
          hasStreamRef.current = !!stream;

          // Prevent rapid double assignment of the same stream (e.g., from multiple ontrack events)
          if (video.srcObject === stream && stream !== null) return;

          if (stream) {
            video.srcObject = stream;
            // IMPORTANT: Start muted — browsers require this for autoplay.
            // We'll unmute after play() succeeds (or after user interaction).
            video.muted = true;
            video.volume = 0.8;
            attemptPlay(video, 'remote').then(() => {
              // Unmute after successful playback if audio is available
              if (remoteHasAudio) {
                video.muted = false;
              }
            });
          } else {
            video.srcObject = null;
          }
        },

        setLocalStream: (stream: MediaStream | null) => {
          const video = mainVideoRef.current;
          if (!video) return;

          isLocalRef.current = true;
          hasStreamRef.current = !!stream;

          if (video.srcObject === stream && stream !== null) return;

          if (stream) {
            video.srcObject = stream;
            video.muted = true; // Always muted locally to prevent audio feedback loop
            attemptPlay(video, 'local preview');
          } else {
            video.srcObject = null;
          }
        },

        setVolume: (v: number) => {
          if (mainVideoRef.current) {
            mainVideoRef.current.volume = Math.max(0, Math.min(1, v));
          }
        },

        setMuted: (muted: boolean) => {
          if (mainVideoRef.current) {
            // CRITICAL: Force muted if it's a local stream to prevent massive echo/feedback loops
            mainVideoRef.current.muted = isLocalRef.current ? true : muted;
          }
        },

        resumePlayback: () => {
          const video = mainVideoRef.current;
          if (!video || !video.srcObject) return;
          video.muted = isLocalRef.current ? true : false;
          attemptPlay(video, 'remote (resume)');
        },

        requestFullscreen: async () => {
          if (wrapperRef.current) {
            await wrapperRef.current.requestFullscreen();
          }
        },
      }),
      [attemptPlay, remoteHasAudio],
    );

    // Cleanup on unmount — release media resources
    useEffect(() => {
      return () => {
        const video = mainVideoRef.current;
        if (video) video.srcObject = null;
      };
    }, []);

    // Viewport sizing
    const viewportClass = isFullscreen
      ? `fixed inset-0 z-[100] transition-colors duration-300 ${
          isActive ? 'bg-black' : 'bg-muted/60 border border-border/30 shadow-inner rounded-2xl overflow-hidden'
        }`
      : isTheaterMode
      ? `w-full aspect-video max-h-[70vh] rounded-2xl overflow-hidden transition-colors duration-300 ${
          isActive ? 'bg-black' : 'bg-muted/60 border border-border/30 shadow-inner'
        }`
      : `w-full aspect-video rounded-2xl overflow-hidden transition-colors duration-300 ${
          isActive ? 'bg-black' : 'bg-muted/60 border border-border/30 shadow-inner'
        }`;

    return (
      <div ref={wrapperRef} className={`relative ${viewportClass} group`}>

        {/* ── Main stream video (active for both streamer and viewer) ── */}
        <video
          ref={mainVideoRef}
          className={`w-full h-full object-contain transition-opacity duration-700 ${
            isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          autoPlay
          playsInline
          aria-label="Screen share stream"
        />

        {/* ── Empty / waiting state ── */}
        <AnimatePresence>
          {!isActive && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            >
              <div className="rounded-2xl glass p-8 flex flex-col items-center gap-3 max-w-xs text-center">
                <Monitor className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground/60">
                  {iAmStreaming
                    ? 'Sharing your screen… waiting for partner to connect'
                    : 'No stream yet. Start sharing or wait for your partner.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Streamer name overlay (hover) ── */}
        {isActive && !iAmStreaming && streamerName && (
          <div
            className="absolute bottom-4 left-4 glass-strong rounded-lg px-3 py-1.5 text-xs font-medium
                       text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          >
            <div className="flex items-center gap-1.5">
              <Monitor className="h-3 w-3 text-primary" />
              <span>{streamerName} is sharing</span>
            </div>
          </div>
        )}
      </div>
    );
  },
);
