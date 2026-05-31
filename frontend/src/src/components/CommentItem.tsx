import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Edit2, Trash2, Reply, MessageCircleHeart } from "lucide-react";
import { LetterComment, useCoupleStore } from "@/store/coupleStore";
import { ReactionPicker } from "./ReactionPicker";

interface CommentItemProps {
  comment: LetterComment;
  replies: LetterComment[];
  allComments: LetterComment[];
  level?: number;
}

export function CommentItem({ comment, replies, allComments, level = 0 }: CommentItemProps) {
  const { partner, addLetterComment, editLetterComment, deleteLetterComment, reactToLetterComment } = useCoupleStore();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  // Use auth user via authStore or deduce from coupleStore
  // For simplicity, partner's ID is partner?._id. If author != partner._id, it's us.
  const isMine = comment.author?._id !== partner?._id;
  const authorName = comment.author?.name || "Unknown";
  const authorAvatar = comment.author?.avatar;

  const myReaction = comment.reactions?.find(r => r.user !== partner?._id)?.emoji;
  
  // Aggregate reactions by emoji
  const reactionCounts = comment.reactions?.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;
    await addLetterComment(comment.letterId, replyText, comment._id);
    setReplyText("");
    setIsReplying(false);
    setShowReplies(true);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim() || editText === comment.text) {
      setIsEditing(false);
      return;
    }
    await editLetterComment(comment._id, editText);
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative flex gap-3 ${level > 0 ? "mt-4" : "mt-6"}`}
    >
      {/* Avatar */}
      <div className="flex-none">
        <div className="h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-primary/40 to-accent/40 ring-1 ring-white/10 flex items-center justify-center">
          {authorAvatar ? (
            <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-white">{authorName.charAt(0)}</span>
          )}
        </div>
        {/* Thread connection line */}
        {replies.length > 0 && showReplies && (
          <div className="mx-auto mt-2 h-[calc(100%-2rem)] w-px bg-border/50" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{authorName}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {/* Menu for editing/deleting */}
          {isMine && (
            <div className="relative ml-auto">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-32 rounded-xl glass-strong shadow-cinema z-10 overflow-hidden border border-white/5"
                  >
                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/10 transition">
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => { deleteLetterComment(comment._id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose hover:bg-rose/10 transition">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Comment Body */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full resize-none rounded-xl bg-black/20 border border-white/10 p-3 text-sm outline-none focus:ring-1 focus:ring-primary/50"
              rows={2}
            />
            <div className="mt-2 flex gap-2 justify-end">
              <button onClick={() => setIsEditing(false)} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 transition">Cancel</button>
              <button onClick={handleEditSubmit} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium shadow-glow">Save</button>
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {comment.text}
          </div>
        )}

        {/* Reactions & Actions */}
        {!isEditing && (
          <div className="mt-2 flex items-center gap-3">
            <ReactionPicker
              myReaction={myReaction}
              onReact={(emoji) => reactToLetterComment(comment._id, emoji)}
            />
            
            {/* Display aggregated reactions */}
            {Object.entries(reactionCounts).length > 0 && (
              <div className="flex -space-x-1">
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <div key={emoji} className="flex h-6 items-center gap-1 rounded-full bg-background/50 ring-1 ring-border px-1.5 text-[10px]">
                    <span>{emoji}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition ml-2"
            >
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
          </div>
        )}

        {/* Reply Input Box */}
        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex items-start gap-2">
                <textarea
                  autoFocus
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Replying to ${authorName}...`}
                  className="w-full resize-none rounded-xl glass p-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                  rows={2}
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setIsReplying(false)} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition">Cancel</button>
                <button
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim()}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold shadow-glow disabled:opacity-50"
                >
                  Send Reply
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nested Replies */}
        {replies.length > 0 && (
          <div className="mt-3">
            {replies.length > 0 && !showReplies && (
              <button
                onClick={() => setShowReplies(true)}
                className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition"
              >
                <div className="h-px w-6 bg-primary/30" />
                View {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
              </button>
            )}
            
            <AnimatePresence>
              {showReplies && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {replies.map(reply => {
                    const childReplies = allComments.filter(c => c.parentId === reply._id);
                    return (
                      <CommentItem
                        key={reply._id}
                        comment={reply}
                        replies={childReplies}
                        allComments={allComments}
                        level={level + 1}
                      />
                    );
                  })}
                  <button
                    onClick={() => setShowReplies(false)}
                    className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition"
                  >
                    <div className="h-px w-6 bg-border" />
                    Collapse Replies
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
