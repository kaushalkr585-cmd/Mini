import { motion } from "framer-motion";
import { Play, SkipBack, SkipForward, Heart } from "lucide-react";

export function MusicPlayer() {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className="fixed bottom-6 left-1/2 z-40 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl glass-strong p-3 shadow-cinema"
    >
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 flex-none overflow-hidden rounded-lg bg-gradient-to-br from-primary to-accent">
          <div className="absolute inset-0 flex items-end justify-center gap-0.5 px-2 pb-1.5">
            {[3, 5, 4, 6, 3, 5].map((h, i) => (
              <motion.span
                key={i}
                className="w-0.5 rounded-full bg-primary-foreground/90"
                animate={{ height: [`${h * 2}px`, `${h * 3}px`, `${h * 2}px`] }}
                transition={{ duration: 0.8 + i * 0.1, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Lover · Slowed + Reverb</p>
          <p className="truncate text-xs text-muted-foreground">Taylor Swift · Our Playlist</p>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: ["20%", "100%"] }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2 text-muted-foreground hover:text-foreground"><SkipBack className="h-4 w-4" /></button>
          <button className="rounded-full bg-primary p-2.5 text-primary-foreground shadow-glow">
            <Play className="h-4 w-4 fill-current" />
          </button>
          <button className="rounded-full p-2 text-muted-foreground hover:text-foreground"><SkipForward className="h-4 w-4" /></button>
          <button className="rounded-full p-2 text-primary"><Heart className="h-4 w-4 fill-current" /></button>
        </div>
      </div>
    </motion.div>
  );
}
