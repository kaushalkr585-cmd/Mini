import { motion } from "framer-motion";

export function LoveQuote() {
  return (
    <section className="relative py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <motion.blockquote
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="font-display text-4xl font-light italic leading-tight md:text-6xl"
        >
          <span className="text-gradient"></span>And in your eyes I found the home
          I'd been searching for in every city, every song, every quiet morning.
          <span className="text-gradient"></span>
        </motion.blockquote>
        <p className="mt-8 text-xs uppercase tracking-[0.4em] text-muted-foreground">— Mishy</p>
      </div>
    </section>
  );
}
