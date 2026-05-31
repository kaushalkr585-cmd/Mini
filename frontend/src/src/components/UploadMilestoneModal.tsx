import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Calendar, MapPin, Sparkles, Image as ImageIcon } from "lucide-react";
import { useCoupleStore } from "@/store/coupleStore";

export interface Milestone {
  _id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  images?: { url: string; publicId: string }[];
}

interface UploadMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Milestone | null;
}

export function UploadMilestoneModal({ isOpen, onClose, initialData }: UploadMilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { createMilestone, editMilestone, loading } = useCoupleStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      const dateObj = new Date(initialData.date);
      setDate(!isNaN(dateObj.getTime()) ? dateObj.toISOString().split("T")[0] : "");
      setLocation(initialData.location || "");
      if (initialData.images) {
        setPreviews(initialData.images.map(img => img.url));
      } else {
        setPreviews([]);
      }
      setFiles([]);
    } else if (!isOpen) {
      setTitle("");
      setDescription("");
      setDate("");
      setLocation("");
      setFiles([]);
      setPreviews([]);
    }
  }, [initialData, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("date", date);
    formData.append("location", location);
    
    files.forEach(file => {
      formData.append("images", file);
    });

    if (initialData) {
      await editMilestone(initialData._id, formData);
    } else {
      await createMilestone(formData);
    }
    
    // Reset and close (handled by useEffect on close)
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl glass-strong p-6 shadow-cinema"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {initialData ? "Edit Milestone" : "Add Milestone"}
              </h2>
              <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="The day we met..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-xl bg-black/20 border border-white/10 pl-10 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all min-h-[80px]"
                  placeholder="It felt like magic..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location (Optional)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full rounded-xl bg-black/20 border border-white/10 pl-10 pr-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="Central Park"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photos (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-black/20 py-6 hover:border-primary/50 transition-all"
                >
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to upload photos</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                    accept="image/*"
                  />
                </div>
              </div>

              {previews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {previews.map((src, i) => (
                    <div key={i} className="relative h-16 w-16 flex-none rounded-lg overflow-hidden border border-white/10">
                      <img src={src} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !title || !date}
                className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (initialData ? "Updating..." : "Adding...") : (initialData ? "Update Timeline" : "Add to Timeline")}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
