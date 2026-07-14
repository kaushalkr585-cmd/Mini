import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Loader2 } from "lucide-react";
import { useMusicStore } from "@/store/musicStore";
import { useRouter } from "@tanstack/react-router";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

export function MusicPlayer() {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, token, fetchToken, volume, setPlayer } = useMusicStore();
  const player = useMusicStore(s => s.player);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // ── Ref-based progress tracking ──────────────────────────────────────
  // Previously `localProgress` was React state, causing a full re-render +
  // Framer Motion layout recalc every second while music plays.
  // Now we track progress in a ref and mutate the progress bar DOM directly.
  const progressRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor((ms || 0) / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Update progress bar DOM directly — no React setState, no re-render
  const applyProgress = (ms: number, duration: number) => {
    progressRef.current = ms;
    const pct = duration ? Math.min((ms / duration) * 100, 100) : 0;
    if (progressBarRef.current) progressBarRef.current.style.width = `${pct}%`;
    if (timeDisplayRef.current) timeDisplayRef.current.textContent = formatTime(ms);
  };

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  useEffect(() => {
    if (!token) return;

    // Guard against appending the script multiple times (e.g. on token refresh)
    if (!document.getElementById('spotify-player-sdk')) {
      const script = document.createElement('script');
      script.id = 'spotify-player-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Use a ref to hold the player instance so cleanup always gets the latest value
    let localPlayer: any = null;

    window.onSpotifyWebPlaybackSDKReady = () => {
      const p = new window.Spotify.Player({
        name: "MINI Player",
        getOAuthToken: (cb: (token: string) => void) => { cb(token); },
        volume,
      });

      localPlayer = p;
      setPlayer(p);

      p.addListener("ready", ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
      });

      p.addListener("not_ready", (_: { device_id: string }) => {
        // Device went offline — no action needed
      });

      p.addListener("player_state_changed", (state: any) => {
        if (!state) return;
        // Update DOM directly without setState
        applyProgress(state.position, state.duration);
        useMusicStore.getState().updateProgress(state.position, state.duration);
        const storeState = useMusicStore.getState();
        if (state.paused !== !storeState.isPlaying) {
          setTimeout(() => {
            useMusicStore.setState({ isPlaying: !state.paused });
          }, 0);
        }
      });

      p.connect();
    };

    // If SDK was already loaded, fire the ready callback manually
    if (window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      if (localPlayer) localPlayer.disconnect();
    };
  }, [token]);

  // Handle play requests when track changes
  useEffect(() => {
    if (deviceId && currentTrack && token && isPlaying) {
      setIsBuffering(true);
      fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        body: JSON.stringify({ uris: [currentTrack.uri] }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .catch(console.error)
        .finally(() => setTimeout(() => setIsBuffering(false), 800));
    }
  }, [currentTrack, deviceId, token]);

  // Handle play/pause toggle
  useEffect(() => {
    if (player) {
      if (isPlaying) {
        player.resume().catch(() => {
          if (deviceId && currentTrack && token) {
            fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
              method: "PUT",
              body: JSON.stringify({ uris: [currentTrack.uri], position_ms: progressRef.current }),
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            }).catch(console.error);
          }
        });
      } else {
        player.pause();
      }
    }
  }, [isPlaying, player]);

  // Tick progress bar every second — direct DOM mutation, no React setState
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const interval = setInterval(() => {
      const np = progressRef.current + 1000;
      if (np >= currentTrack.duration_ms) {
        useMusicStore.getState().nextTrack();
        applyProgress(0, currentTrack.duration_ms);
      } else {
        applyProgress(np, currentTrack.duration_ms);
        useMusicStore.getState().updateProgress(np, currentTrack.duration_ms);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack]);

  // Reset progress on track change
  useEffect(() => {
    applyProgress(0, currentTrack?.duration_ms ?? 0);
  }, [currentTrack?.id]);

  const { history } = useRouter();
  const isMusicPage = history.location.pathname === "/music";
  const isChatPage = history.location.pathname === "/chat";

  if (!currentTrack || isMusicPage) return null;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack || !player) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
    const newPos = percentage * currentTrack.duration_ms;
    applyProgress(newPos, currentTrack.duration_ms);
    player.seek(newPos);
  };

  return (
    <>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={`fixed left-1/2 z-50 w-[min(600px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl glass-strong p-3 shadow-cinema ${
          isChatPage ? "bottom-[90px]" : "bottom-6"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Album art with AnimatePresence cross-fade */}
          <div className="relative h-12 w-12 flex-none overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent flex-shrink-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentTrack.id}
                src={currentTrack.album?.images?.[0]?.url}
                alt="Album Art"
                initial={{ opacity: 0, scale: 1.15 }}
                animate={{ opacity: isBuffering ? 0.55 : 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Track info + progress */}
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-end">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTrack.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="truncate pr-2 min-w-0"
                >
                  <p className="truncate text-sm font-semibold">{currentTrack.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {currentTrack.artists.map(a => a.name).join(", ")}
                  </p>
                </motion.div>
              </AnimatePresence>
              {/* Time display — updated via ref mutation, no React re-render */}
              <div className="text-[10px] text-muted-foreground font-medium flex-none pl-1">
                <span ref={timeDisplayRef}>{formatTime(0)}</span>
                {" / "}
                {formatTime(currentTrack.duration_ms)}
              </div>
            </div>
            {/* Progress bar — plain div, width updated via ref mutation */}
            <div
              className="group relative mt-1.5 h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-muted transition-all hover:h-2"
              onClick={handleSeek}
            >
              <div
                ref={progressBarRef}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent"
                style={{ width: "0%", transition: "width 0.1s linear" }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1 flex-none">
            <button onClick={prevTrack} className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              disabled={isBuffering}
              className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-glow hover:scale-105 transition-transform disabled:opacity-70"
            >
              {isBuffering
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : isPlaying
                ? <Pause className="h-4 w-4 fill-current" />
                : <Play className="h-4 w-4 fill-current" />}
            </button>
            <button onClick={nextTrack} className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
