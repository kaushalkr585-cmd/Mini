import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleHeart, Send } from "lucide-react";
import { Letter, useCoupleStore } from "@/store/coupleStore";
import { CommentItem } from "./CommentItem";

interface CommentSectionProps {
  letter: Letter;
}

export function CommentSection({ letter }: CommentSectionProps) {
  const { letterComments, fetchLetterComments, addLetterComment, loading } = useCoupleStore();
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchLetterComments(letter._id);
  }, [letter._id, fetchLetterComments]);

  const allComments = letterComments[letter._id] || [];
  const topLevelComments = allComments.filter(c => !c.parentId);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addLetterComment(letter._id, newComment);
    setNewComment("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircleHeart className="h-5 w-5 text-primary" />
        <h3 className="font-display text-xl font-bold">Comments</h3>
        <span className="ml-2 rounded-full glass px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {allComments.length}
        </span>
      </div>

      <div className="space-y-2 mb-8">
        {topLevelComments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="text-4xl mb-3"
            >
              💌
            </motion.div>
            <p className="font-medium text-foreground">No replies yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first person to respond to this letter.</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {topLevelComments.map(comment => {
              const replies = allComments.filter(c => c.parentId === comment._id);
              return (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  replies={replies}
                  allComments={allComments}
                />
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Main Add Comment Box */}
      <div className="sticky bottom-0 rounded-2xl glass-strong p-4 shadow-cinema border border-white/5 backdrop-blur-xl">
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Leave a reply to this memory... (Enter to send)"
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-h-[40px] max-h-[120px] overflow-y-auto scrollbar-thin"
          rows={Math.min(4, newComment.split('\n').length || 1)}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {newComment.length} chars
          </span>
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition disabled:opacity-50 hover:shadow-[0_0_20px_oklch(0.72_0.32_350/0.4)]"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
