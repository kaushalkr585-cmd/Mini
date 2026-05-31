import { motion } from "framer-motion";
import { X, Feather } from "lucide-react";
import { Letter, useCoupleStore } from "@/store/coupleStore";
import { CommentSection } from "./CommentSection";
import { ALLOWED_REACTIONS } from "./ReactionPicker";

interface LetterDetailViewProps {
  letter: Letter;
  onClose: () => void;
}

export function LetterDetailView({ letter, onClose }: LetterDetailViewProps) {
  const { reactToLetter, partner } = useCoupleStore();
  const authorName = letter.author?.name || "Unknown";

  const handleReact = (emoji: string) => {
    reactToLetter(letter._id, emoji);
  };

  // Aggregate reactions on the letter
  const reactionCounts = letter.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const myReactionEmoji = letter.reactions?.find(r => r.user !== partner?._id)?.emoji;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 40, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full h-full sm:h-[90vh] max-w-3xl rounded-none sm:rounded-3xl glass-strong shadow-cinema overflow-hidden bg-background/95 sm:bg-transparent"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-border/50 glass-strong backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💌</span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold truncate">{letter.title}</h2>
              <p className="text-xs text-muted-foreground truncate">
                Written By {authorName} • {new Date(letter.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-none rounded-full glass p-2 text-muted-foreground hover:text-foreground transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent p-6 sm:p-8">
          
          {/* Letter Body */}
          <div className="relative rounded-3xl p-6 sm:p-10 glass mb-10">
            <Feather className="absolute right-6 top-6 h-6 w-6 text-primary/20" />
            <div className="prose prose-sm sm:prose-base prose-invert max-w-none text-foreground/90 font-[350] leading-loose">
              {letter.content.split("\n").map((para, i) =>
                para ? (
                  <p key={i} className="mb-4 last:mb-0">{para}</p>
                ) : (
                  <div key={i} className="h-4" />
                )
              )}
            </div>
          </div>

          {/* Letter Reactions Bar */}
          <div className="flex flex-wrap items-center gap-3 justify-center border-b border-border/50 pb-8 mb-2">
            {ALLOWED_REACTIONS.map((emoji) => {
              const count = reactionCounts[emoji] || 0;
              const hasReacted = myReactionEmoji === emoji;
              return (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleReact(emoji)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
                    hasReacted
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "glass hover:bg-primary/20 text-foreground"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="font-medium">{count}</span>}
                </motion.button>
              );
            })}
          </div>

          {/* Comments Section */}
          <CommentSection letter={letter} />
          
        </div>
      </motion.div>
    </motion.div>
  );
}
