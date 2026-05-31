import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Heart, Plus, Mail, Lock, Feather, ChevronRight, X, Edit2, Trash2, MessageCircleHeart, Reply } from "lucide-react";
import { MusicPlayer } from "@/components/MusicPlayer";
import { useCoupleStore, Letter } from "@/store/coupleStore";

export const Route = createFileRoute("/letters")({
  component: LettersPage,
});

import { LetterDetailView } from "@/components/LetterDetailView";

function LettersPage() {
  const { letters, fetchLetters, createLetter, updateLetter, deleteLetter, loading } = useCoupleStore();
  const [selected, setSelected] = useState<Letter | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [letterToDelete, setLetterToDelete] = useState<Letter | null>(null);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  const handleSend = async () => {
    if (!title || !content) return;
    if (editingId) {
      await updateLetter(editingId, { title, content, isDraft });
    } else {
      await createLetter({ title, content, isDraft });
    }
    setTitle("");
    setContent("");
    setIsDraft(false);
    setEditingId(null);
    setComposing(false);
  };

  const handleEdit = (letter: Letter, e: React.MouseEvent) => {
    e.stopPropagation();
    setTitle(letter.title);
    setContent(letter.content);
    setIsDraft(letter.isDraft);
    setEditingId(letter._id);
    setComposing(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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
                className={`group flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 rounded-3xl glass-strong p-6 shadow-cinema transition-all duration-300 hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${
                  letter.isDraft ? "opacity-70 cursor-default" : "cursor-pointer"
                }`}
              >
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 text-3xl shadow-glow">
                  💌
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-rose">
                        {new Date(letter.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
                      </p>
                      {letter.isDraft && (
                        <span className="flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                          <Lock className="h-2.5 w-2.5" /> Draft
                        </span>
                      )}
                    </div>
                    {/* Hover Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleEdit(letter, e)} 
                        className="rounded-full p-2 hover:bg-primary/10 hover:text-primary transition"
                        aria-label="Edit letter"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setLetterToDelete(letter); }} 
                        className="rounded-full p-2 hover:bg-rose/10 hover:text-rose transition"
                        aria-label="Delete letter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-1">{letter.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground mb-3">By {letter.author?.name || 'Unknown'}</p>
                  <p className="truncate text-sm text-foreground/80 leading-relaxed">{letter.content.substring(0, 120)}...</p>
                  
                  {/* Stats Row */}
                  {!letter.isDraft && (
                    <div className="mt-4 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-rose fill-rose/20" />
                        <span>{letter.reactions?.length || 0} Reactions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageCircleHeart className="h-3.5 w-3.5 text-primary" />
                        <span>{letter.commentCount || 0} Comments</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Reply className="h-3.5 w-3.5 text-accent" />
                        <span>{letter.replyCount || 0} Replies</span>
                      </div>
                    </div>
                  )}
                </div>
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
                    <h3 className="font-display text-xl font-semibold">{editingId ? "Edit Letter" : "Compose a Letter"}</h3>
                  </div>
                  <button onClick={() => { setComposing(false); setEditingId(null); setTitle(""); setContent(""); setIsDraft(false); }} className="rounded-full glass p-2 hover:bg-primary/10 transition">
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
                    <button onClick={() => { setComposing(false); setEditingId(null); setTitle(""); setContent(""); setIsDraft(false); }} className="rounded-xl glass px-5 py-2.5 text-sm font-medium hover:bg-primary/10 transition">
                      Discard
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={loading || !title || !content}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                    >
                      <Heart className="h-3.5 w-3.5 fill-current" /> {loading ? "Saving..." : (editingId ? "Update Letter" : (isDraft ? "Save Draft" : "Seal & Send"))}
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
        {selected && <LetterDetailView letter={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {letterToDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl glass-strong p-6 shadow-cinema text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose/10 text-rose mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-display font-bold mb-2">Delete Letter?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete "{letterToDelete.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setLetterToDelete(null)}
                  className="flex-1 rounded-xl glass-strong py-3 text-sm font-semibold hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await deleteLetter(letterToDelete._id);
                    setLetterToDelete(null);
                  }}
                  className="flex-1 rounded-xl bg-rose py-3 text-sm font-semibold text-white shadow-glow hover:shadow-[0_0_30px_#f43f5e50] transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
