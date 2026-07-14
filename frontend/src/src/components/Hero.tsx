import { motion, animate } from "framer-motion";
import { Play, Plus } from "lucide-react";
import { useEffect, useRef, useMemo } from "react";
import hero from "@/assets/hero.jpg";

export function Hero({ onReliveLatest, onAddMemory }: { onReliveLatest?: () => void; onAddMemory?: () => void }) {
  const daysTogether = useMemo(() => {
    const startDate = new Date("2025-04-13T00:00:00");
    const currentDate = new Date();
    return Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);
  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden pt-24">
      <div className="absolute inset-0 z-0">
        <img
          src={hero}
          alt=""
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[80dvh] max-w-7xl flex-col justify-end px-4 sm:px-6 pb-16 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-rose">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Episode {daysTogether} · Together
          </span>
          <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-8xl font-bold leading-[0.95]">
            Every moment, <br />
            <span className="text-gradient italic">remembered.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Our private cinematic universe — photos, voice notes, late-night calls,
            playlists, and love letters. Just for the two of us.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <motion.button
              onClick={onReliveLatest}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition-all hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.7)]"
            >
              <Play className="h-5 w-5 fill-current" />
              Relive Memories
            </motion.button>
            <motion.button
              onClick={onAddMemory}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 rounded-full glass-strong px-7 py-3.5 text-base font-semibold text-foreground"
            >
              <Plus className="h-5 w-5" />
              Add New Memory
            </motion.button>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-8 text-sm">
            <Counter value={daysTogether} label="Days Together" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Counter animates the displayed number without any React state updates.
 * We mutate `ref.current.textContent` directly from Framer's onUpdate callback,
 * which runs outside React's render cycle — zero re-renders during animation.
 */
function Counter({ value, label }: { value: number; label: string }) {
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    // Set initial value immediately to avoid flash of "0"
    el.textContent = "0";
    const controls = animate(0, value, {
      duration: 2.5,
      ease: "easeOut",
      onUpdate: (v) => {
        if (el) el.textContent = Math.floor(v).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [value]);

  return (
    <div>
      <div className="font-display text-3xl font-bold text-gradient">
        <span ref={numRef}>0</span>
      </div>
      <div className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
