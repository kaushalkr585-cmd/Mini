import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmilePlus } from "lucide-react";

export const ALLOWED_REACTIONS = ["❤️", "🥹", "😘", "🔥", "😍", "😂", "😭", "👍", "✨", "🌸"];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  myReaction?: string;
  className?: string;
}

export function ReactionPicker({ onReact, myReaction, className = "" }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`flex items-center justify-center rounded-full p-2 transition-all hover:bg-primary/10 ${
          myReaction ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        title="Add reaction"
      >
        <SmilePlus className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 flex items-center gap-1 rounded-full glass-strong p-1.5 shadow-cinema z-50 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {ALLOWED_REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.25, originY: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReact(emoji)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xl transition-colors hover:bg-white/10 ${
                  myReaction === emoji ? "bg-primary/20 ring-1 ring-primary/50" : ""
                }`}
              >
                {emoji}
              </motion.button>
            ))}
            <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-black/60 backdrop-blur-md" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
