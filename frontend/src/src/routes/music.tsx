import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Heart,
  Music2, ListMusic, Shuffle, Repeat, Search, Loader2
} from "lucide-react";
import { useMusicStore, SpotifyTrack } from "@/store/musicStore";
import api from "@/lib/api";

export const Route = createFileRoute("/music")({
  component: MusicPage,
});

// Inline equalizer bars component for reuse
function EqBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[3, 5, 3].map((h, j) => (
        <motion.div
          key={j}
          className="w-0.5 rounded-full bg-primary"
          animate={playing ? { height: [`${h}px`, `${h + 5}px`, `${h}px`] } : { height: `${h}px` }}
          transition={{ duration: 0.45 + j * 0.1, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Reusable song row used in both the main tracklist and sidebar
function SongRow({
  track,
  index,
  isCurrent,
  isPlaying,
  isLoading,
  lovedSongs,
  onPlay,
  onLove,
  onAddToQueue,
  onRemoveFromQueue,
  formatTime,
}: {
  track: SpotifyTrack;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  lovedSongs: Set<string>;
  onPlay: () => void;
  onLove: (e: React.MouseEvent) => void;
  onAddToQueue?: (e: React.MouseEvent) => void;
  onRemoveFromQueue?: (e: React.MouseEvent) => void;
  formatTime: (ms: number) => string;
}) {
  return (
    <motion.div
      key={track.id + index}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      whileHover={{ x: 4 }}
      onClick={onPlay}
      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
        isCurrent
          ? "bg-primary/15 border border-primary/30 shadow-[0_0_20px_oklch(0.72_0.28_350/0.15)] text-foreground"
          : "hover:bg-white/5 text-muted-foreground hover:text-foreground border border-transparent"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative h-10 w-10 flex-none overflow-hidden rounded-lg bg-black/40">
        <img
          src={track.album?.images?.[0]?.url}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isCurrent ? "opacity-60" : "opacity-100 group-hover:opacity-40"
          }`}
        />
        {/* Overlay icon — always visible on mobile, hover-reveal on desktop */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        }`}>
          {isCurrent && isLoading ? (
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          ) : isCurrent && isPlaying ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white fill-current ml-0.5" />
          )}
        </div>
        {/* Eq bars when playing and not hovered */}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:opacity-0 transition-opacity">
            <EqBars playing={isPlaying} />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isCurrent ? "text-foreground" : ""}`}>
          {track.name}
        </p>
        <p className="truncate text-xs">{track.artists.map(a => a.name).join(", ")}</p>
      </div>

      {/* Right side: contextual action buttons */}
      <div className="flex items-center gap-1 flex-none">
        {/* Duration — always visible, shrinks on mobile */}
        <span className="text-xs text-muted-foreground w-7 text-right hidden sm:block">{formatTime(track.duration_ms)}</span>

        {/* + Add to queue (search results) — always shown on mobile */}
        {onAddToQueue && (
          <button
            onClick={onAddToQueue}
            title="Add to queue"
            className="rounded-full p-2 sm:p-1.5 bg-primary/10 sm:bg-transparent hover:bg-primary/20 text-primary sm:text-muted-foreground hover:text-primary transition sm:opacity-0 sm:group-hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
        {/* × Remove from queue — always shown on mobile */}
        {onRemoveFromQueue && (
          <button
            onClick={onRemoveFromQueue}
            title="Remove from queue"
            className="rounded-full p-2 sm:p-1.5 bg-destructive/10 sm:bg-transparent hover:bg-destructive/20 text-destructive sm:text-muted-foreground hover:text-destructive transition sm:opacity-0 sm:group-hover:opacity-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {/* Love — always shown on mobile */}
        <button
          onClick={onLove}
          title={lovedSongs.has(track.id) ? "Unlove" : "Love"}
          className="rounded-full p-2 sm:p-1.5 transition sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Heart className={`h-3.5 w-3.5 ${lovedSongs.has(track.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      </div>
    </motion.div>
  );
}

function MusicPage() {
  const {
    currentTrack, queue, isPlaying, progress, duration,
    togglePlay, nextTrack, prevTrack, playTrack, addToQueue, removeFromQueue, token
  } = useMusicStore();

  const [lovedSongs, setLovedSongs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [queueToast, setQueueToast] = useState<string | null>(null);

  // Show brief loading state whenever the current track changes
  useEffect(() => {
    if (!currentTrack) return;
    setIsBuffering(true);
    const t = setTimeout(() => setIsBuffering(false), 900);
    return () => clearTimeout(t);
  }, [currentTrack?.id]);

  const toggleLove = (id: string) =>
    setLovedSongs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !token) return;
    setIsSearching(true);
    try {
      const { data } = await api.get(
        `/spotify/search?q=${encodeURIComponent(searchQuery)}&type=track`
      );
      setSearchResults(data.tracks?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor((ms || 0) / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration ? Math.min((progress / duration) * 100, 100) : 0;
  const bars = [3, 5, 7, 4, 6, 3, 5, 7, 4, 6, 3, 5];

  // The active context list — search results when searching, else the queue
  const activeList = searchResults.length > 0 ? searchResults : queue;

  const handlePlayTrack = (track: SpotifyTrack, context: SpotifyTrack[]) => {
    playTrack(track, context);
  };

  const showToast = (msg: string) => {
    setQueueToast(msg);
    setTimeout(() => setQueueToast(null), 2200);
  };

  return (
    <div className="relative min-h-screen pb-32 pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">

        {/* ── Header ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-rose">
                <Music2 className="h-3 w-3" /> Our Soundtrack
              </span>
              <h1 className="mt-4 font-display text-5xl sm:text-6xl font-bold md:text-7xl">
                Our <span className="text-gradient italic">Music</span>
              </h1>
              <p className="mt-3 text-muted-foreground">Every song that played while we fell in love.</p>
            </div>

            {!token && (
              <a
                href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/spotify/login`}
                className="flex items-center gap-2 rounded-xl bg-[#1DB954] px-6 py-3 text-sm font-bold text-white shadow-[0_0_20px_#1DB95450] hover:scale-105 transition-transform"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Connect Spotify Premium
              </a>
            )}
          </div>
        </motion.div>

        {/* ── Search Bar ─────────────────────────────── */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          onSubmit={handleSearch}
          className="mb-8 relative max-w-2xl"
        >
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search songs, artists, albums on Spotify..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={!token}
            className="w-full rounded-2xl glass-strong py-4 pl-12 pr-28 text-base outline-none ring-0 focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!token || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSearching ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching</> : "Search"}
          </button>
        </motion.form>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* ── Left Column ─────────────────────────── */}
          <div className="space-y-6 min-w-0">

            {/* Now Playing Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative overflow-hidden rounded-3xl glass-strong p-6 sm:p-8 shadow-cinema min-h-[220px] sm:min-h-[240px] flex flex-col justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.15 0.06 350 / 0.8), oklch(0.1 0.03 340 / 0.9))" }}
            >
              {/* Animated BG bars */}
              <div className="absolute bottom-0 left-0 right-0 flex h-24 items-end justify-center gap-1 opacity-10 pointer-events-none">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-3 rounded-t-full bg-primary"
                    animate={isPlaying && !isBuffering
                      ? { height: [`${h * 4}px`, `${h * 8}px`, `${h * 4}px`] }
                      : { height: `${h * 2}px` }
                    }
                    transition={{ duration: 0.6 + i * 0.05, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {currentTrack ? (
                  <motion.div
                    key={currentTrack.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35 }}
                    className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-6 sm:gap-8"
                  >
                    {/* Album art with loading ring */}
                    <div className="relative flex-none mx-auto sm:mx-0">
                      <div className={`h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-2xl shadow-glow transition-all duration-500 ${isBuffering ? "scale-95 opacity-70" : "scale-100 opacity-100"}`}>
                        {currentTrack.album?.images?.[0]?.url ? (
                          <img
                            src={currentTrack.album.images[0].url}
                            className="w-full h-full object-cover"
                            alt="Album Art"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-accent" />
                        )}
                      </div>
                      {isBuffering && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                      <p className="text-xs uppercase tracking-[0.3em] text-rose">Now Playing</p>
                      <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold truncate">{currentTrack.name}</h2>
                      <p className="mt-1 text-muted-foreground truncate">{currentTrack.artists.map(a => a.name).join(", ")}</p>

                      {/* Progress bar */}
                      <div className="mt-6 space-y-1.5">
                        <div
                          className="relative h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-muted/60 hover:h-2 transition-all"
                          onClick={e => {
                            const bounds = e.currentTarget.getBoundingClientRect();
                            const pct = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
                            useMusicStore.getState().seek(pct * (duration || currentTrack.duration_ms));
                          }}
                        >
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                            style={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.1, ease: "linear" }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{formatTime(progress)}</span>
                          <span>{formatTime(duration || currentTrack.duration_ms)}</span>
                        </div>
                      </div>

                      {/* Playback controls */}
                      <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                        <button className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
                          <Shuffle className="h-4 w-4" />
                        </button>
                        <button onClick={prevTrack} className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
                          <SkipBack className="h-5 w-5" />
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.93 }}
                          onClick={togglePlay}
                          disabled={isBuffering}
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-all hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.6)] disabled:opacity-60"
                        >
                          {isBuffering
                            ? <Loader2 className="h-6 w-6 animate-spin" />
                            : isPlaying
                            ? <Pause className="h-6 w-6" />
                            : <Play className="h-6 w-6 fill-current ml-1" />}
                        </motion.button>
                        <button onClick={nextTrack} className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
                          <SkipForward className="h-5 w-5" />
                        </button>
                        <button className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
                          <Repeat className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleLove(currentTrack.id)} className="ml-2 rounded-full p-2 transition">
                          <Heart className={`h-4 w-4 ${lovedSongs.has(currentTrack.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-10 flex flex-col items-center justify-center py-8 text-center gap-3"
                  >
                    <div className="rounded-full bg-primary/10 p-5">
                      <Music2 className="h-10 w-10 text-primary/60" />
                    </div>
                    <p className="font-display text-lg font-semibold text-muted-foreground">
                      Select a track to start playing
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Search for a song below or pick one from your queue
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Tracklist / Search Results */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="rounded-3xl glass-strong p-5 shadow-cinema"
            >
              <div className="mb-4 flex items-center gap-2">
                <ListMusic className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">
                  {searchResults.length > 0 ? (searchQuery || "Results") : "Suggested Songs"}
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    · {activeList.length} songs
                  </span>
                </h3>
                {searchResults.length > 0 && (
                  <button
                    onClick={() => { setSearchResults([]); setSearchQuery(""); }}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground transition"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="space-y-0.5 max-h-[420px] min-h-[120px] overflow-y-auto scrollbar-hidden pr-1">
                {activeList.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-10">
                    {token ? "Search for songs to start playing 🎵" : "Connect Spotify to play songs"}
                  </p>
                )}
                {activeList.map((s, i) => {
                  // In search mode: show + Add to Queue button.
                  // In queue mode: show × Remove button.
                  const isSearchMode = searchResults.length > 0;
                  return (
                    <SongRow
                      key={s.id + i}
                      track={s}
                      index={i}
                      isCurrent={currentTrack?.id === s.id}
                      isPlaying={isPlaying}
                      isLoading={isBuffering && currentTrack?.id === s.id}
                      lovedSongs={lovedSongs}
                      onPlay={() => handlePlayTrack(s, activeList)}
                      onLove={e => { e.stopPropagation(); toggleLove(s.id); }}
                      onAddToQueue={isSearchMode ? e => {
                        e.stopPropagation();
                        addToQueue(s);
                        showToast(`Added "${s.name}" to queue`);
                      } : undefined}
                      onRemoveFromQueue={!isSearchMode ? e => {
                        e.stopPropagation();
                        const idx = queue.findIndex(t => t.id === s.id);
                        if (idx !== -1) removeFromQueue(idx);
                      } : undefined}
                      formatTime={formatTime}
                    />
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* ── Right Column ────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6 min-w-0"
          >
            {/* Suggested Songs Section Removed (Queue flow without UI) */}

            {/* Trending Playlists */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Trending Playlists
              </h3>
              <div className="space-y-3">
                {[
                  { id: "p1", name: "Our Top Tracks", count: 24, color: "from-rose-500 to-pink-700", query: "romantic hindi songs" },
                  { id: "p2", name: "Late Night Drives", count: 12, color: "from-indigo-500 to-violet-700", query: "late night chill songs" },
                  { id: "p3", name: "Morning Kisses", count: 8, color: "from-amber-400 to-orange-600", query: "morning feel good songs" },
                  { id: "p4", name: "Rain & Coffee", count: 15, color: "from-teal-500 to-emerald-700", query: "rainy day lofi songs" },
                ].map(pl => (
                  <motion.button
                    key={pl.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!token}
                    onClick={async () => {
                      if (!token) return;
                      setIsSearching(true);
                      try {
                        const { data } = await api.get(
                          `/spotify/search?q=${encodeURIComponent(pl.query)}&type=track`
                        );
                        const tracks: SpotifyTrack[] = data.tracks?.items || [];
                        setSearchResults(tracks);
                        setSearchQuery(pl.name);
                        if (tracks.length > 0) handlePlayTrack(tracks[0], tracks);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsSearching(false);
                      }
                    }}
                    className="w-full flex items-center gap-4 rounded-2xl glass-strong p-4 shadow-cinema transition-all hover:border-primary/30 border border-transparent text-left disabled:opacity-50"
                  >
                    <div className={`h-12 w-12 flex-none rounded-xl bg-gradient-to-br ${pl.color} flex items-center justify-center shadow-glow`}>
                      <Music2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{pl.name}</p>
                      <p className="text-xs text-muted-foreground">{pl.count} songs</p>
                    </div>
                    {isSearching && searchQuery === pl.name && (
                      <Loader2 className="h-4 w-4 text-primary animate-spin ml-auto" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quote card */}
            <div className="rounded-2xl glass-strong p-6 text-center">
              <Heart className="mx-auto h-7 w-7 fill-primary text-primary" />
              <p className="mt-3 font-display text-base font-semibold leading-snug">
                "Music is what feelings sound like."
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Every song in this list played while we fell in love.
              </p>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Queue Toast Notification ─── */}
      <AnimatePresence>
        {queueToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-2xl glass-strong px-5 py-3 shadow-cinema border border-primary/20 text-sm font-medium"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">+</span>
            {queueToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}
