import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Plus, Trash2 } from "lucide-react";
import { useCoupleStore } from "@/store/coupleStore";

export function UploadMemoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { uploadMemory, categories, loading } = useCoupleStore();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [sub, setSub] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tag, setTag] = useState("Memory");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return alert("Please select at least one file");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("sub", sub);
    formData.append("notes", notes);
    formData.append("location", location);
    formData.append("categoryId", categoryId);
    formData.append("tag", tag);
    
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      await uploadMemory(formData);
      onClose();
      // Reset form
      setFiles([]); setTitle(""); setSub(""); setNotes(""); setLocation(""); setCategoryId(""); setTag("Memory");
    } catch (err) {
      alert("Failed to upload memory");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl glass-strong shadow-cinema max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-display text-2xl font-semibold">Upload Memory</h2>
            <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-white/5 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hidden">
            <form id="upload-form" onSubmit={handleSubmit} className="space-y-6">
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 py-12 text-center transition-colors hover:border-primary hover:bg-primary/10"
              >
                <input type="file" multiple accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <div className="rounded-full bg-primary/20 p-4 text-primary group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-4 font-medium">Click to select photos or videos</p>
                <p className="mt-1 text-xs text-muted-foreground">Support for multiple images</p>
              </div>

              {files.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden">
                  {files.map((file, i) => (
                    <div key={i} className="relative h-20 w-20 flex-none rounded-xl overflow-hidden">
                      <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-rose-500 transition">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Paris Trip" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Category</label>
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary appearance-none">
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Date / Subtitle</label>
                  <input value={sub} onChange={e => setSub(e.target.value)} className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. May 14, 2024" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Location</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Eiffel Tower" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Notes / Description</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full rounded-xl bg-black/20 px-4 py-3 outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Write something beautiful..." />
              </div>

            </form>
          </div>

          <div className="border-t border-white/10 p-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-white/5 transition">Cancel</button>
            <button form="upload-form" type="submit" disabled={loading} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:shadow-[0_0_40px_oklch(0.72_0.32_350/0.5)] transition disabled:opacity-50">
              {loading ? "Uploading..." : "Save Memory"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
