import { motion } from "framer-motion";
import { Play, Plus } from "lucide-react";
import hero from "@/assets/hero.jpg";

export function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden pt-24">
      <div className="absolute inset-0 z-0">
        <img src={hero} alt="" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-7xl flex-col justify-end px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-rose">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Episode 247 · Together
          </span>
          <h1 className="mt-6 font-display text-6xl font-bold leading-[0.95] md:text-8xl">
            Every moment, <br />
            <span className="text-gradient italic">remembered.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Our private cinematic universe — photos, voice notes, late-night calls,
            playlists, and love letters. Just for the two of us.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition-all hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.7)]"
            >
              <Play className="h-5 w-5 fill-current" />
              Relive Memories
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-3 rounded-full glass-strong px-7 py-3.5 text-base font-semibold text-foreground"
            >
              <Plus className="h-5 w-5" />
              Add New Memory
            </motion.button>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-8 text-sm">
            <Counter value={847} label="Days Together" />
            <div className="h-8 w-px bg-border" />
            <Counter value={2341} label="Memories" />
            <div className="h-8 w-px bg-border" />
            <Counter value={156} label="Letters" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-gradient">{value.toLocaleString()}</div>
      <div className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
