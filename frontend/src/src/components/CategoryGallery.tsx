import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  X, Upload, ChevronLeft, ChevronRight, Image, Video,
  Play, ZoomIn, FolderOpen, CheckCircle2, Edit2, Trash2, Check
} from "lucide-react";
import { useCoupleStore, Category, Memory } from "@/store/coupleStore";
import { CustomVideoPlayer } from "./CustomVideoPlayer";
import { compressFiles, formatBytes } from "@/lib/compress";
import toast from "react-hot-toast";


// ─── Drag-and-drop upload zone ────────────────────────────────────────────────

function UploadZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type.match(/^(image\/(jpeg|jpg|png|webp|gif)|video\/(mp4|mov|webm))$/)
    );
    if (dropped.length) onFiles(dropped);
  }, [onFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 text-center transition-all duration-300 ${
        isDragging
          ? "border-primary bg-primary/15 scale-[1.01] shadow-glow"
          : "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/mov,video/webm"
        className="hidden"
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
      <div className={`rounded-full bg-primary/20 p-4 text-primary mb-3 transition-transform duration-300 ${isDragging ? "scale-125" : "group-hover:scale-110"}`}>
        <Upload className="h-6 w-6" />
      </div>
      <p className="font-medium text-sm">Drop photos & videos here</p>
      <p className="mt-1 text-xs text-muted-foreground">or click to browse · jpg, png, gif, webp, mp4, mov, webm</p>
    </div>
  );
}

// ─── File Preview thumbnails ──────────────────────────────────────────────────

function FileThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isVideo = file.type.startsWith("video/");
  const url = URL.createObjectURL(file);

  return (
    <div className="relative h-20 w-20 flex-none rounded-xl overflow-hidden group/thumb">
      {isVideo ? (
        <div className="h-full w-full bg-black/40 flex items-center justify-center">
          <video src={url} className="absolute inset-0 h-full w-full object-cover opacity-60" muted playsInline />
          <Play className="relative z-10 h-6 w-6 text-white fill-white" />
        </div>
      ) : (
        <img src={url} className="h-full w-full object-cover" alt="preview" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover/thumb:opacity-100 transition hover:bg-rose-500"
      >
        <X className="h-3 w-3" />
      </button>
      {isVideo && (
        <div className="absolute bottom-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white font-medium">
          VIDEO
        </div>
      )}
    </div>
  );
}

// ─── Category Upload Modal (inline) ──────────────────────────────────────────

function CategoryUploadModal({
  category,
  isOpen,
  onClose,
}: {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { uploadToCategory, fetchMemories, loading } = useCoupleStore();
  const [files, setFiles] = useState<File[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);

  if (!isOpen) return null;

  const addFiles = async (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setCompressing(true);
    setCompressProgress(0);
    const compressed = await compressFiles(newFiles, (done, total) => {
      setCompressProgress(Math.round((done / total) * 100));
    });
    setCompressedFiles((prev) => [...prev, ...compressed]);
    setCompressing(false);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setCompressedFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return toast.error("Select at least one file");
    const toUpload = compressedFiles.length === files.length ? compressedFiles : files;
    const fd = new FormData();
    fd.append("title", title || `${category.name} Upload`);
    toUpload.forEach((f) => fd.append("files", f));
    try {
      await uploadToCategory(category._id, fd);
      await fetchMemories();
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded to ${category.name}!`);
      setFiles([]); setCompressedFiles([]); setTitle("");
      onClose();
    } catch {
      toast.error("Upload failed — please try again");
    }
  };

  const totalSaved = files.reduce((a, f) => a + f.size, 0) - compressedFiles.reduce((a, f) => a + f.size, 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl glass-modal shadow-cinema max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-xl font-semibold">
              Upload to <span className="text-gradient">{category.emoji} {category.name}</span>
            </h2>
            <button onClick={onClose} className="btn-glass-icon">
              <X className="h-5 w-5" />
            </button>
          </div>

          {compressing && (
            <div className="px-6 pt-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">Optimizing images…</span>
                <span className="text-xs text-primary font-medium ml-auto">{compressProgress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div className="upload-progress-bar-fill" style={{ width: `${compressProgress}%` }} />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hidden">
            <UploadZone onFiles={addFiles} />

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-3 flex-wrap">
                  {files.map((f, i) => (
                    <FileThumb key={i} file={f} onRemove={() => removeFile(i)} />
                  ))}
                </div>
                {totalSaved > 10240 && !compressing && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Saved {formatBytes(totalSaved)} via auto-compression
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Title (optional)</label>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary text-sm"
                placeholder={`${category.name} moments`}
              />
            </div>
          </div>

          <div className="border-t border-white/10 p-6 flex justify-end gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={loading || files.length === 0 || compressing}
              className="btn-primary"
            >
              {loading ? "Uploading…" : compressing ? "Optimizing…" : `Upload ${files.length > 0 ? files.length + " " : ""}File${files.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Fullscreen Viewer ────────────────────────────────────────────────────────

function FullscreenViewer({
  memories,
  startIndex,
  onClose,
}: {
  memories: Memory[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const current = memories[idx];

  if (!current) return null;

  const prev = () => setIdx((i) => (i - 1 + memories.length) % memories.length);
  const next = () => setIdx((i) => (i + 1) % memories.length);

  // Keyboard nav
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="fullscreen-viewer"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl"
        onKeyDown={handleKey}
        tabIndex={0}
      >
        {/* Blurred BG */}
        <div
          className="absolute inset-0 opacity-10 scale-110 blur-3xl pointer-events-none"
          style={{ backgroundImage: `url(${current.url})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 rounded-full glass-strong p-3 text-white/70 hover:text-white hover:scale-110 transition"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Counter */}
        <div className="absolute top-6 left-6 z-20 rounded-full glass px-4 py-1.5 text-sm text-white/70">
          {idx + 1} / {memories.length}
        </div>

        {/* Content */}
        <div className="relative z-10 flex h-full w-full items-center justify-center px-20 py-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-full max-w-full flex items-center justify-center"
            >
              {current.type === "video" ? (
                <CustomVideoPlayer
                  src={current.url}
                  thumbnail={current.thumbnail}
                  className="max-h-[80vh] w-full max-w-5xl"
                  autoPlay
                />
              ) : (
                <img
                  src={current.url}
                  alt={current.title}
                  className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav buttons */}
        {memories.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full glass-strong p-3 text-white/70 hover:text-white hover:scale-110 transition"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full glass-strong p-3 text-white/70 hover:text-white hover:scale-110 transition"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Info bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 py-4 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="font-display text-lg font-semibold text-white">{current.title}</h3>
          {current.sub && <p className="text-xs text-rose mt-0.5">{current.sub}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Video card with thumbnail/duration overlay ───────────────────────────────

function VideoCard({ memory, onClick }: { memory: Memory; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<string | null>(null);

  return (
    <div className="relative w-full h-full overflow-hidden" onClick={onClick}>
      <video
        ref={videoRef}
        src={memory.url}
        poster={memory.thumbnail}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v && isFinite(v.duration)) {
            const m = Math.floor(v.duration / 60);
            const s = Math.floor(v.duration % 60);
            setDuration(`${m}:${s.toString().padStart(2, "0")}`);
          }
        }}
      />
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="h-12 w-12 rounded-full glass-strong flex items-center justify-center shadow-glow">
          <Play className="h-5 w-5 fill-white text-white translate-x-0.5" />
        </div>
      </div>
      {duration && (
        <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white font-medium tabular-nums">
          {duration}
        </div>
      )}
      <div className="absolute top-2 left-2 rounded-full glass px-2 py-0.5 text-[9px] text-white/90 font-medium flex items-center gap-1">
        <Video className="h-2.5 w-2.5" />
        VIDEO
      </div>
    </div>
  );
}

// ─── Main Category Gallery Modal ─────────────────────────────────────────────

// ─── Edit Category Inline Modal (Portalized) ───────────────────────────────────

function EditCategoryModal({
  category,
  isOpen,
  onClose,
}: {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { editCategory } = useCoupleStore();
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await editCategory(category._id, { name: name.trim(), emoji });
      toast.success("Category updated!");
      onClose();
    } catch {
      toast.error("Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-sm rounded-3xl glass-modal shadow-cinema p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-xl font-bold">Edit Category</h3>
            <button onClick={onClose} className="btn-glass-icon">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative h-24 w-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-4xl">{emoji || "📁"}</span>
              </div>
            </div>

            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Icon</label>
                <input
                  value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
                  className="w-full rounded-xl bg-black/20 text-center text-xl py-3 outline-none focus:ring-1 focus:ring-primary"
                  placeholder="📁"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
                <input
                  required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-black/20 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Category name" autoFocus
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Delete Confirm Modal (Portalized) ─────────────────────────────────────────

function DeleteCategoryModal({
  category,
  isOpen,
  onClose,
}: {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { deleteCategory } = useCoupleStore();
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCategory(category._id);
      toast.success(`"${category.name}" deleted`);
      onClose();
    } catch {
      toast.error("Failed to delete category");
      setDeleting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-sm rounded-3xl glass-modal shadow-cinema p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose/10 text-rose">
            <Trash2 className="h-6 w-6" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">Delete Collection?</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Are you sure you want to delete <strong>"{category.emoji} {category.name}"</strong>?
            The memories inside will remain but will no longer be grouped.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger flex-1 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Main Category Gallery Modal ─────────────────────────────────────────────

export function CategoryGallery({
  category: initialCategory,
  isOpen,
  onClose,
}: {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { memories, categories } = useCoupleStore();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  if (!isOpen || !initialCategory) return null;

  const category = categories.find((c) => c._id === initialCategory._id) || initialCategory;
  const catMemories = memories.filter((m) => m.categoryId === category._id);
  const photoCount = catMemories.filter((m) => m.type === "photo").length;
  const videoCount = catMemories.filter((m) => m.type === "video").length;

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cat-gallery"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex flex-col bg-background/98 backdrop-blur-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 px-4 py-4 md:px-6 glass-strong flex-none gap-4">
              <div className="flex items-start gap-3 w-full sm:w-auto">
                <button onClick={onClose} className="btn-glass-icon mt-1 sm:mt-0 flex-shrink-0">
                  <X className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl sm:text-2xl font-bold truncate flex items-center gap-2">
                    <span>{category.emoji}</span>
                    <span className="truncate">{category.name}</span>
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Image className="h-3.5 w-3.5 text-primary/70" /> {photoCount} photos</span>
                    <span className="flex items-center gap-1"><Video className="h-3.5 w-3.5 text-primary/70" /> {videoCount} videos</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                <button
                  onClick={() => setEditTarget(category)}
                  className="btn-glass-icon"
                  title="Edit Category"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(category)}
                  className="btn-glass-icon hover:!border-rose/50 hover:!bg-rose/10 text-rose"
                  title="Delete Category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Media</span>
                </button>
              </div>
            </div>

            {/* Gallery body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hidden">
              {catMemories.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full gap-6 text-center py-32"
                >
                  <div className="rounded-full glass-strong p-8 shadow-glow">
                    <FolderOpen className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold">No media yet</h3>
                    <p className="mt-2 text-muted-foreground">Start by uploading your first photo or video.</p>
                  </div>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Now
                  </button>
                </motion.div>
              ) : (
                /* Masonry-style grid using columns */
                <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
                  {catMemories.map((m, i) => (
                    <motion.div
                      key={m._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="group relative break-inside-avoid overflow-hidden rounded-2xl shadow-cinema cursor-pointer"
                      style={{ aspectRatio: i % 5 === 0 ? "3/4" : i % 3 === 0 ? "1/1" : "4/3" }}
                      onClick={() => setViewerIndex(i)}
                    >
                      {m.type === "video" ? (
                        <VideoCard memory={m} onClick={() => setViewerIndex(i)} />
                      ) : (
                        <>
                          <img
                            src={m.url}
                            alt={m.title}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center bg-black/30">
                            <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
                          </div>
                        </>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-x-0 bottom-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <p className="text-xs font-semibold text-white truncate">{m.title}</p>
                        {m.sub && <p className="text-[10px] text-rose">{m.sub}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload modal */}
      {isUploadOpen && (
        <CategoryUploadModal
          category={category}
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
        />
      )}

      {/* Fullscreen viewer */}
      {viewerIndex !== null && (
        <FullscreenViewer
          memories={catMemories}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditCategoryModal
          category={editTarget}
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteCategoryModal
          category={deleteTarget}
          isOpen={!!deleteTarget}
          onClose={() => {
            setDeleteTarget(null);
            onClose();
          }}
        />
      )}
    </>,
    document.body
  );
}
