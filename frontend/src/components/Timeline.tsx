import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const events = [
  { date: "Jun 06, 2023", title: "The First Hello", desc: "A coffee that lasted four hours." },
  { date: "Oct 14, 2023", title: "First Trip · Lisbon", desc: "Tiled streets, pastel sky, your hand in mine." },
  { date: "Feb 14, 2024", title: "The Aurora Promise", desc: "Under the pink northern lights. Forever." },
  { date: "Jun 06, 2024", title: "One Year, Infinite Memories", desc: "Letter 12, sealed with rose wax." },
  { date: "Dec 31, 2024", title: "New Year, Same Us", desc: "Held hands as the city exhaled." },
];

export function Timeline() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-4 font-display text-5xl font-bold md:text-6xl">
            Our <span className="text-gradient italic">Timeline</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Every milestone, written in light.</p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
          {events.map((e, i) => (
            <motion.div
              key={e.date}
              initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`relative mb-12 flex w-full ${i % 2 ? "justify-end" : "justify-start"}`}
            >
              <div className="absolute left-1/2 top-6 h-3 w-3 -translate-x-1/2 rounded-full bg-primary shadow-glow" />
              <div className={`w-[calc(50%-2rem)] glass-strong rounded-2xl p-6 shadow-cinema ${i % 2 ? "ml-8" : "mr-8"}`}>
                <p className="text-xs uppercase tracking-widest text-rose">{e.date}</p>
                <h3 className="mt-2 font-display text-2xl font-semibold">{e.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{e.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
