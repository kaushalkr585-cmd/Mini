import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Play, Plus, CheckCircle2 } from "lucide-react";
import { useCoupleStore } from "@/store/coupleStore";
import { compressFiles, formatBytes } from "@/lib/compress";
import toast from "react-hot-toast";

// ─── File preview thumbnail ───────────────────────────────────────────────────

function FileThumb({ file, compressed, onRemove }: { file: File; compressed?: File; onRemove: () => void }) {
  const isVideo = file.type.startsWith("video/");
  const url = URL.createObjectURL(file);
  const saved = compressed && compressed !== file ? file.size - compressed.size : 0;

  return (
    <div className="relative h-20 w-20 flex-none rounded-xl overflow-hidden group/thumb">
      {isVideo ? (
        <div className="h-full w-full bg-black/50 flex items-center justify-center relative">
          <video src={url} className="absolute inset-0 h-full w-full object-cover opacity-60" muted playsInline />
          <Play className="relative z-10 h-5 w-5 text-white fill-white" />
          <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded font-medium">VID</span>
        </div>
      ) : (
        <img src={url} className="h-full w-full object-cover" alt="preview" />
      )}
      {saved > 1024 && (
        <div className="absolute bottom-1 left-1 rounded-full bg-emerald-500/80 px-1 py-0.5 text-[8px] text-white font-bold flex items-center gap-0.5">
          <CheckCircle2 className="h-2 w-2" />
          -{formatBytes(saved)}
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 group-hover/thumb:opacity-100 transition hover:bg-rose-500"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Quick Create Category ────────────────────────────────────────────────────

function QuickCreateCategory({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const { createCategory } = useCoupleStore();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await createCategory({ name: name.trim(), emoji });
      toast.success(`Category "${name}" created!`);
      onCreated();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <form onSubmit={handleCreate} className="flex gap-2 mt-2 p-3 rounded-2xl bg-black/20 border border-primary/20">
        <input
          value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
          className="w-10 rounded-xl bg-black/20 text-center text-base outline-none focus:ring-1 focus:ring-primary px-1 py-2"
          placeholder="📁"
        />
        <input
          required value={name} onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl bg-black/20 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="Category name…" autoFocus
        />
        <button type="submit" disabled={loading} className="btn-primary px-4 py-2 text-xs">
          {loading ? "…" : "Create"}
        </button>
        <button type="button" onClick={onClose} className="btn-glass-icon w-9 h-9">
          <X className="h-4 w-4" />
        </button>
      </form>
    </motion.div>
  );
}

// ─── Main Upload Memory Modal ─────────────────────────────────────────────────

export function UploadMemoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { uploadMemory, fetchMemories, fetchCategories, categories, loading } = useCoupleStore();
  const [files, setFiles] = useState<File[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tag, setTag] = useState("Memory");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showCreateCat, setShowCreateCat] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const addFiles = async (newFiles: File[]) => {
    const valid = newFiles.filter(f =>
      f.type.match(/^(image\/(jpeg|jpg|png|webp|gif)|video\/(mp4|mov|webm))$/)
    );
    if (valid.length < newFiles.length) toast.error("Some files skipped — unsupported format");
    if (!valid.length) return;

    setFiles((prev) => [...prev, ...valid]);
    // Compress images in background
    setCompressing(true);
    setCompressProgress(0);
    const compressed = await compressFiles(valid, (done, total) => {
      setCompressProgress(Math.round((done / total) * 100));
    });
    setCompressedFiles((prev) => [...prev, ...compressed]);
    setCompressing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setCompressedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const resetForm = () => {
    setFiles([]); setCompressedFiles([]); setTitle(""); setSub(""); setNotes("");
    setLocation(""); setCategoryId(""); setTag("Memory"); setTags([]); setTagInput(""); setShowCreateCat(false);
    setCompressing(false); setCompressProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return toast.error("Please select at least one file");

    const toUpload = compressedFiles.length === files.length ? compressedFiles : files;
    const formData = new FormData();
    formData.append("title", title);
    formData.append("sub", sub);
    formData.append("notes", notes);
    formData.append("location", location);
    formData.append("categoryId", categoryId);
    formData.append("tag", tags[0] || "Memory");
    formData.append("tags", JSON.stringify(tags));
    toUpload.forEach((file) => formData.append("files", file));

    try {
      await uploadMemory(formData);
      await fetchMemories();
      if (categoryId) await fetchCategories();
      toast.success("Memory uploaded successfully!");
      resetForm();
      onClose();
    } catch {
      toast.error("Upload failed — please try again");
    }
  };

  const totalOriginalSize = files.reduce((a, f) => a + f.size, 0);
  const totalCompressedSize = compressedFiles.reduce((a, f) => a + f.size, 0);
  const totalSaved = totalOriginalSize - totalCompressedSize;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md dark"
        onClick={(e) => { if (e.target === e.currentTarget) { resetForm(); onClose(); } }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl shadow-cinema max-h-[92vh] flex flex-col glass-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 flex-none">
            <div>
              <h2 className="font-display text-2xl font-semibold">Add Memory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Capture this beautiful moment forever</p>
            </div>
            <button onClick={() => { resetForm(); onClose(); }} className="btn-glass-icon">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Compression progress bar */}
          {compressing && (
            <div className="px-6 pt-3">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xs text-muted-foreground">Optimizing images…</span>
                <span className="text-xs text-primary font-medium ml-auto">{compressProgress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div className="upload-progress-bar-fill" style={{ width: `${compressProgress}%` }} />
              </div>
            </div>
          )}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hidden">
            <form id="upload-form" onSubmit={handleSubmit} className="space-y-5">

              {/* Drag-and-drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-10 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-primary bg-primary/20 scale-[1.01] shadow-glow"
                    : "border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10"
                }`}
              >
                <input
                  type="file" multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/mov,video/webm"
                  className="hidden" ref={fileInputRef} onChange={handleFileChange}
                />
                <div className={`rounded-full bg-primary/20 p-4 text-primary mb-3 transition-all duration-300 ${isDragging ? "scale-125 shadow-glow" : "group-hover:scale-110"}`}>
                  <Upload className="h-6 w-6" />
                </div>
                <p className="font-medium">{isDragging ? "Drop files here!" : "Drag & drop or click to select"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Photos (jpg, png, gif, webp) · Videos (mp4, mov, webm) · Images auto-compressed ⚡
                </p>
              </div>

              {/* File previews + compression savings */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-3 flex-wrap">
                    {files.map((file, i) => (
                      <FileThumb key={i} file={file} compressed={compressedFiles[i]} onRemove={() => removeFile(i)} />
                    ))}
                    <button
                      type="button" onClick={() => fileInputRef.current?.click()}
                      className="h-20 w-20 flex-none rounded-xl border-2 border-dashed border-primary/30 flex items-center justify-center text-primary/50 hover:text-primary hover:border-primary transition"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {totalSaved > 10240 && !compressing && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Saved {formatBytes(totalSaved)} via auto-compression ({formatBytes(totalOriginalSize)} → {formatBytes(totalCompressedSize)})</span>
                    </div>
                  )}
                </div>
              )}

              {/* Title + Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
                  <input
                    required value={title} onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl bg-black/20 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                    placeholder="e.g. Paris Trip"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => { if (e.target.value === "__create__") { setShowCreateCat(true); setCategoryId(""); } else { setCategoryId(e.target.value); setShowCreateCat(false); } }}
                    className="w-full rounded-xl bg-black/20 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary appearance-none"
                  >
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>)}
                    <option value="__create__">+ Create Category…</option>
                  </select>
                </div>
              </div>

              {/* Quick create */}
              <AnimatePresence>
                {showCreateCat && (
                  <QuickCreateCategory
                    onCreated={async () => { await fetchCategories(); setShowCreateCat(false); }}
                    onClose={() => setShowCreateCat(false)}
                  />
                )}
              </AnimatePresence>

              {/* Date + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Date</label>
                  <input
                    value={sub} onChange={(e) => setSub(e.target.value)}
                    className="w-full rounded-xl bg-black/20 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                    placeholder="e.g. May 14, 2024"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Location</label>
                  <input
                    value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl bg-black/20 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                    placeholder="e.g. Eiffel Tower"
                  />
                </div>
              </div>

              {/* Tags Input */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Tags</label>
                <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-black/20 border border-white/10 min-h-[46px] items-center">
                  {tags.map((t, idx) => (
                    <span key={idx} className="flex items-center gap-1 bg-primary/20 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
                      #{t}
                      <button type="button" onClick={() => handleRemoveTag(idx)} className="hover:text-rose transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? "Type tag and press Enter…" : "Add tag…"}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm px-2 py-1 text-white placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="w-full rounded-xl bg-black/20 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/50"
                  placeholder="Write something beautiful about this moment…"
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-6 flex items-center justify-between gap-3 flex-none">
            <p className="text-xs text-muted-foreground">
              {compressing ? "Optimizing…" : files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} ready` : "No files selected"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => { resetForm(); onClose(); }} className="btn-ghost">Cancel</button>
              <button
                form="upload-form" type="submit"
                disabled={loading || files.length === 0 || compressing}
                className="btn-primary"
              >
                {loading ? "Uploading…" : compressing ? "Optimizing…" : "Save Memory ♥"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
