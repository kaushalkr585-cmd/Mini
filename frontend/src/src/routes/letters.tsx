import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, Plus, Mail, Lock, Feather, ChevronRight, X } from "lucide-react";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useCoupleStore, Letter } from "@/store/coupleStore";

export const Route = createFileRoute("/letters")({
  component: LettersPage,
});

function LetterModal({ letter, onClose }: { letter: Letter; onClose: () => void }) {
  const { reactToLetter, partner } = useCoupleStore();
  const [isReacting, setIsReacting] = useState(false);

  const handleReact = async () => {
    setIsReacting(true);
    await reactToLetter(letter._id, "❤️");
    setIsReacting(false);
  };

  const myReaction = letter.reactions?.find(r => r.user === useCoupleStore.getState().partner?._id || r.emoji === "❤️");
  const partnerReaction = letter.reactions?.find(r => r.user === partner?._id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-3xl glass-strong p-8 shadow-cinema"
        style={{ background: "linear-gradient(135deg, oklch(0.12 0.04 340 / 0.95), oklch(0.08 0.02 350 / 0.98))" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full glass p-2 text-muted-foreground hover:text-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="text-3xl">💌</span>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-rose">
              {new Date(letter.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
            </p>
            <h2 className="font-display text-2xl font-bold">{letter.title}</h2>
          </div>
        </div>

        <div className="relative rounded-2xl p-6 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent" style={{ background: "oklch(0.11 0.03 340 / 0.6)" }}>
          <Feather className="absolute right-4 top-4 h-4 w-4 text-primary/30" />
          {letter.content.split("\n").map((para, i) =>
            para ? (
              <p key={i} className="mb-3 text-sm leading-relaxed text-foreground/90 font-[350]">{para}</p>
            ) : (
              <div key={i} className="mb-3" />
            )
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1 items-center">
            {letter.reactions?.length > 0 && (
              <div className="flex -space-x-2 mr-2">
                {letter.reactions.map((r, i) => (
                  <div key={i} className="flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-primary/20 text-[10px]">
                    {r.emoji}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Sent by {letter.author?.name || 'You'}</p>
          </div>
          <button 
            onClick={handleReact}
            disabled={isReacting}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              myReaction ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground shadow-glow"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${myReaction ? "fill-current" : "fill-transparent"}`} /> 
            {myReaction ? "Loved" : "Keep Forever"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function LettersPage() {
  const { letters, fetchLetters, createLetter, loading } = useCoupleStore();
  const [selected, setSelected] = useState<Letter | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isDraft, setIsDraft] = useState(false);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleSend = async () => {
    if (!title || !content) return;
    await createLetter({ title, content, isDraft });
    setTitle("");
    setContent("");
    setIsDraft(false);
    setComposing(false);
  };

  return (
    <>
      <div className="relative min-h-screen pb-32 pt-28">
        <div className="mx-auto max-w-5xl px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6"
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-rose">
                <Mail className="h-3 w-3" /> {letters.length} Letters
              </span>
              <h1 className="mt-4 font-display text-6xl font-bold md:text-7xl">
                Love <span className="text-gradient italic">Letters</span>
              </h1>
              <p className="mt-3 text-muted-foreground">Words written when words were the only thing left.</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setComposing(true)}
              className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.6)]"
            >
              <Plus className="h-4 w-4" /> Write Letter
            </motion.button>
          </motion.div>

          {/* Letters list */}
          <div className="space-y-4">
            {letters.length === 0 && !composing && (
              <div className="text-center text-muted-foreground py-20">
                No letters yet. Be the first to write a love letter!
              </div>
            )}
            {letters.map((letter, i) => (
              <motion.div
                key={letter._id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                whileHover={{ x: 8 }}
                onClick={() => !letter.isDraft && setSelected(letter)}
                className={`group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-2xl glass-strong p-6 shadow-cinema transition-all duration-300 hover:border-primary/30 ${
                  letter.isDraft ? "opacity-70 cursor-default" : "cursor-pointer"
                }`}
              >
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-3xl">
                  💌
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-xs uppercase tracking-widest text-rose">
                      {new Date(letter.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                    </p>
                    {letter.isDraft && (
                      <span className="flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                        <Lock className="h-2.5 w-2.5" /> Draft
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-display text-xl font-semibold">{letter.title}</h3>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{letter.content.substring(0, 100)}...</p>
                </div>
                {!letter.isDraft && (
                  <ChevronRight className="h-5 w-5 hidden sm:block flex-none text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                )}
              </motion.div>
            ))}
          </div>

          {/* Compose area */}
          <AnimatePresence>
            {composing && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.5 }}
                className="mt-8 rounded-3xl glass-strong p-8 shadow-cinema"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Feather className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-xl font-semibold">Compose a Letter</h3>
                  </div>
                  <button onClick={() => setComposing(false)} className="rounded-full glass p-2 hover:bg-primary/10 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mb-3 w-full rounded-xl glass py-3 px-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                  placeholder="Subject…"
                />
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-xl glass py-3 px-4 text-sm leading-relaxed outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                  placeholder="Dear love,&#10;&#10;Write from the heart…"
                />
                <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={isDraft} onChange={e => setIsDraft(e.target.checked)} className="rounded bg-black/20 border-white/10 text-primary focus:ring-primary/50" />
                    Save as Draft (Private)
                  </label>
                  <div className="flex justify-end gap-3 w-full sm:w-auto">
                    <button onClick={() => setComposing(false)} className="rounded-xl glass px-5 py-2.5 text-sm font-medium hover:bg-primary/10 transition">
                      Discard
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={loading || !title || !content}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                    >
                      <Heart className="h-3.5 w-3.5 fill-current" /> {isDraft ? "Save Draft" : "Seal & Send"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <MusicPlayer />
      </div>

      {/* Letter Modal */}
      <AnimatePresence>
        {selected && <LetterModal letter={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </>
  );
}
