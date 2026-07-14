import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Sparkles, X, Image as ImageIcon, Trash2, AlignLeft, AlignCenter, AlignRight, Upload } from "lucide-react";
import { useCoupleStore } from "@/store/coupleStore";
import toast from "react-hot-toast";

const BACKGROUNDS = {
  glassmorphism: "glass-strong border-white/10 text-foreground dark:text-white shadow-cinema",
  sunset: "bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-indigo-500/10 backdrop-blur-xl border border-rose-500/20 text-foreground dark:text-white shadow-cinema",
  cosmic: "bg-gradient-to-br from-violet-600/10 via-indigo-600/10 to-fuchsia-600/10 backdrop-blur-xl border border-violet-500/20 text-foreground dark:text-white shadow-cinema",
  rose: "bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-red-500/5 backdrop-blur-xl border border-rose-400/25 text-foreground dark:text-white shadow-cinema",
  emerald: "bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-indigo-500/5 backdrop-blur-xl border border-emerald-500/20 text-foreground dark:text-white shadow-cinema",
};

const FONTS = {
  "Playfair Display": "font-serif font-semibold italic",
  "Cinzel": "tracking-wider uppercase font-semibold font-display",
  "Caveat": "text-3xl md:text-4xl tracking-wide",
  "Great Vibes": "text-4xl md:text-5xl tracking-widest leading-loose",
  "Inter": "font-sans font-medium tracking-tight",
};

const ALIGNMENTS = {
  left: "text-left items-start",
  center: "text-center items-center justify-center",
  right: "text-right items-end",
};

export function LoveNoteCard() {
  const { lovenote, fetchLoveNote, updateLoveNote, loading } = useCoupleStore();
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    fetchLoveNote();
  }, [fetchLoveNote]);

  if (!lovenote) return null;

  const bgStyle = BACKGROUNDS[lovenote.bgType as keyof typeof BACKGROUNDS] || BACKGROUNDS.glassmorphism;
  const fontStyle = FONTS[lovenote.fontStyle as keyof typeof FONTS] || FONTS["Playfair Display"];
  const alignment = ALIGNMENTS[lovenote.alignment as keyof typeof ALIGNMENTS] || ALIGNMENTS.center;

  // Split lines for nice rendering
  const lines = lovenote.message.split("\n");

  return (
    <>
      {/* CSS entrance — runs immediately on compositor thread, no 1s Framer delay */}
      <motion.div
        whileHover={{ y: -4 }}
        className={`relative overflow-hidden rounded-3xl p-8 sm:p-12 anim-enter-up ${bgStyle}`}
      >
        {/* Ambient glow — uses radial-gradient instead of filter:blur to avoid
            creating expensive GPU compositing layers */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top left, oklch(0.72 0.32 350 / 0.18), transparent 55%), " +
              "radial-gradient(ellipse at bottom right, oklch(0.65 0.30 0 / 0.14), transparent 55%)",
          }}
        />

        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Card Text Content */}
          <div className={`flex flex-col flex-1 ${alignment} min-w-0`}>
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Our Spaces Note
            </span>
            <h2 className={`text-2xl sm:text-3xl font-display font-bold leading-tight mb-4`}>
              {lovenote.title}
            </h2>
            <div className={`space-y-2 text-base md:text-lg text-foreground/80 dark:text-white/95 ${fontStyle}`}>
              {lines.map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            
            <button
              onClick={() => setIsEditorOpen(true)}
              className="mt-6 flex items-center gap-2 rounded-full glass hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-medium transition cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit Message
            </button>
          </div>

          {/* Optional Card Image */}
          {lovenote.imageUrl && (
            <div className="w-full md:w-1/3 max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-cinema flex-shrink-0">
              <img
                src={lovenote.imageUrl}
                alt="Love note background"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Love Note Modal Editor */}
      <AnimatePresence>
        {isEditorOpen && (
          <LoveNoteEditor onClose={() => setIsEditorOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function LoveNoteEditor({ onClose }: { onClose: () => void }) {
  const { lovenote, updateLoveNote } = useCoupleStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(lovenote?.title || "");
  const [message, setMessage] = useState(lovenote?.message || "");
  const [fontStyle, setFontStyle] = useState(lovenote?.fontStyle || "Playfair Display");
  const [alignment, setAlignment] = useState(lovenote?.alignment || "center");
  const [bgType, setBgType] = useState(lovenote?.bgType || "glassmorphism");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(lovenote?.imageUrl || "");
  const [deleteImage, setDeleteImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setDeleteImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setDeleteImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("title", title);
    fd.append("message", message);
    fd.append("fontStyle", fontStyle);
    fd.append("alignment", alignment);
    fd.append("bgType", bgType);
    if (imageFile) {
      fd.append("image", imageFile);
    }
    if (deleteImage) {
      fd.append("deleteImage", "true");
    }

    try {
      await updateLoveNote(fd);
      onClose();
    } catch {
      toast.error("Failed to update Love Note");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl glass-modal shadow-cinema max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 flex-none">
          <div>
            <h2 className="font-display text-xl font-bold">Edit Homepage Love Note</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Customize your private message space</p>
          </div>
          <button onClick={onClose} className="btn-glass-icon">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hidden">
          
          {/* Card Title */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary text-sm"
              placeholder="e.g. Our Story ❤️"
            />
          </div>

          {/* Card Message Text Area */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Message</label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
              placeholder="Write your sweet love note here... Supports line breaks and emojis."
            />
          </div>

          {/* Custom style row (Alignment / Font) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Font Style</label>
              <select
                value={fontStyle}
                onChange={(e) => setFontStyle(e.target.value)}
                className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary text-sm appearance-none [&>option]:bg-zinc-900"
              >
                <option value="Playfair Display">Serif (Playfair Display)</option>
                <option value="Cinzel">Elegant Roman (Cinzel)</option>
                <option value="Caveat">Handwritten (Caveat)</option>
                <option value="Great Vibes">Romantic Script (Great Vibes)</option>
                <option value="Inter">Modern Sans (Inter)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Text Alignment</label>
              <div className="flex gap-2 bg-black/20 rounded-xl p-1">
                {(['left', 'center', 'right'] as const).map((align) => {
                  const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                  return (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setAlignment(align)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors capitalize ${
                        alignment === align
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {align}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card Preset Background */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Card Background Theme</label>
            <select
              value={bgType}
              onChange={(e) => setBgType(e.target.value)}
              className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary text-sm appearance-none [&>option]:bg-zinc-900"
            >
              <option value="glassmorphism">Glassmorphism (Simple Blur)</option>
              <option value="sunset">Sunset Glow (Warm Glow)</option>
              <option value="cosmic">Cosmic Dusk (Dark Nebula)</option>
              <option value="rose">Rose Romance (Pink Love)</option>
              <option value="emerald">Emerald Serenade (Deep Teal)</option>
            </select>
          </div>

          {/* Image Picker */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Optional Image</label>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {imagePreview ? (
                <div className="relative h-32 w-32 rounded-xl overflow-hidden shadow-cinema flex-shrink-0 group/img">
                  <img src={imagePreview} className="h-full w-full object-cover" alt="Love note" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose hover:scale-105 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 w-32 rounded-xl border border-dashed border-white/20 hover:border-primary bg-white/5 flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-primary transition gap-2"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px] uppercase font-semibold">Upload Image</span>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Upload a romantic portrait or memory image to represent your story card.</p>
                <p>Images will be stored securely on Cloudinary CDN and optimized for mobile devices.</p>
              </div>
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-6 flex justify-end gap-3 flex-none">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !message.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Sparkles className="h-4 w-4 fill-current" />
            )}
            Save Configuration
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
