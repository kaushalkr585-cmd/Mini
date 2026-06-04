import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { FolderOpen, Image, Video, ChevronRight, Layers, Edit2, Trash2, X, Check } from "lucide-react";
import { useCoupleStore, Category } from "@/store/coupleStore";
import { CategoryGallery } from "./CategoryGallery";
import toast from "react-hot-toast";


// ─── Edit Category Inline Modal ───────────────────────────────────────────────

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

  if (typeof document === "undefined") return null;

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
            {/* Preview */}
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
              <button type="submit" disabled={saving || !name.trim()} className="btn-primary flex-1 flex items-center gap-2 justify-center">
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

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

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

  if (typeof document === "undefined") return null;

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

// ─── Main MemoryCollections Section ──────────────────────────────────────────

export function MemoryCollections() {
  const { categories, memories } = useCoupleStore();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  if (categories.length === 0) return null;

  const openCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setIsGalleryOpen(true);
  };

  return (
    <>
      <section className="relative py-10">
        <div className="mx-auto max-w-7xl px-6">
          {/* Section header */}
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-5 w-5 text-primary" />
                <span className="text-xs uppercase tracking-[0.3em] text-rose font-medium">Curated</span>
              </div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">Memory Collections</h2>
              <p className="mt-1 text-sm text-muted-foreground">Albums you've created together</p>
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat, i) => {
              const catMemories = memories.filter(m => m.categoryId === cat._id);
              const photoCount = catMemories.filter(m => m.type === "photo").length;
              const videoCount = catMemories.filter(m => m.type === "video").length;
              const latestImage = catMemories.find(m => m.type === "photo" && m.url);
              const cover = latestImage?.url || cat.coverImage;

              return (
                <motion.div
                  key={cat._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -8, scale: 1.03 }}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl shadow-cinema"
                  style={{ aspectRatio: "3/4" }}
                  onClick={() => openCategory(cat)}
                >
                  {/* Cover image or placeholder */}
                  {cover ? (
                    <img
                      src={cover} alt={cat.name} loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color || "from-primary/30 to-accent/10"} flex items-center justify-center`}>
                      <span className="text-5xl drop-shadow-lg">{cat.emoji}</span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: "radial-gradient(circle at 50% 80%, oklch(0.72 0.32 350 / 0.3), transparent 70%)" }}
                  />

                  {/* Edit + Delete actions — top right, revealed on hover */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditTarget(cat); }}
                      className="btn-glass-icon !w-7 !h-7"
                      title="Edit category"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(cat); }}
                      className="btn-glass-icon !w-7 !h-7 hover:!border-rose/50 hover:!bg-rose/10"
                      title="Delete category"
                    >
                      <Trash2 className="h-3 w-3 text-rose" />
                    </button>
                  </div>

                  {/* Open arrow */}
                  <div className="absolute top-2.5 left-2.5 rounded-full glass p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 z-10">
                    <ChevronRight className="h-3 w-3 text-white" />
                  </div>

                  {/* Bottom info */}
                  <div className="absolute inset-x-0 bottom-0 p-4 z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-lg">{cat.emoji}</span>
                      <h3 className="font-display text-base font-semibold text-white leading-tight truncate">{cat.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/70">
                      {photoCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Image className="h-2.5 w-2.5" />{photoCount}
                        </span>
                      )}
                      {videoCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Video className="h-2.5 w-2.5" />{videoCount}
                        </span>
                      )}
                      {photoCount === 0 && videoCount === 0 && <span className="italic opacity-60">Empty</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Category Gallery modal */}
      <CategoryGallery
        category={selectedCategory}
        isOpen={isGalleryOpen}
        onClose={() => { setIsGalleryOpen(false); setSelectedCategory(null); }}
      />

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
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
