import { motion } from "framer-motion";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, Heart, Play } from "lucide-react";
import type { Memory } from "@/lib/memories";

export function MemoryRow({
  title,
  tagline,
  items,
}: {
  title: string;
  tagline: string;
  items: Memory[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * 600, behavior: "smooth" });

  return (
    <section className="relative py-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => scroll(-1)} className="rounded-full glass p-2 hover:bg-primary/20 transition">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => scroll(1)} className="rounded-full glass p-2 hover:bg-primary/20 transition">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className="scrollbar-hidden mx-auto flex max-w-[100vw] gap-5 overflow-x-auto px-[max(1.5rem,calc((100vw-80rem)/2))] pb-4 snap-x snap-mandatory"
      >
        {items.map((m, i) => (
          <MemoryCard key={m.id} m={m} index={i} />
        ))}
      </div>
    </section>
  );
}

function MemoryCard({ m, index }: { m: Memory; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative h-[360px] w-[280px] flex-none snap-start overflow-hidden rounded-2xl shadow-cinema cursor-pointer"
    >
      <img src={m.img} alt={m.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
           style={{ background: "radial-gradient(circle at 50% 30%, oklch(0.72 0.32 350 / 0.35), transparent 70%)" }} />

      <div className="absolute right-3 top-3 rounded-full glass px-3 py-1 text-[10px] font-medium uppercase tracking-wider">
        {m.tag}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-xs text-rose">{m.sub}</p>
        <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{m.title}</h3>

        <div className="mt-3 flex translate-y-4 items-center gap-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <button className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Play className="h-3 w-3 fill-current" /> Open
          </button>
          <button className="rounded-full glass p-2">
            <Heart className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
