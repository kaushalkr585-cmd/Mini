import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Plus, Trash2, Image as ImageIcon, Video, FileAudio, Shield, Edit2, Check, X } from "lucide-react";
import { useCoupleStore } from "@/store/coupleStore";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuthStore();
  const { categories, fetchCategories, createCategory, deleteCategory } = useCoupleStore();
  
  // Category form state
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("📁");
  
  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { updateProfile } = useAuthStore();
  const [profileUploading, setProfileUploading] = useState(false);
  
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  useEffect(() => {
    if (user?.name) setEditNameValue(user.name);
  }, [user?.name]);

  const handleNameSave = async () => {
    if (!editNameValue.trim() || editNameValue.trim() === user?.name) {
      setEditingName(false);
      return;
    }
    setProfileUploading(true);
    try {
      const fd = new FormData();
      fd.append("name", editNameValue.trim());
      await updateProfile(fd);
      setEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileUploading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('avatar', file);
      
      setProfileUploading(true);
      try {
        await updateProfile(formData);
      } catch (err) {
        console.error(err);
      } finally {
        setProfileUploading(false);
      }
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await createCategory({ name: catName, emoji: catEmoji, color: "from-primary/20 to-accent/10" });
    setCatName("");
    setCatEmoji("📁");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (uploadCategory) {
      formData.append('categoryId', uploadCategory);
    }
    
    try {
      await api.post('/memories/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <p>Please log in to access the admin area.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-32 pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex items-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">Couple Admin</h1>
            <p className="text-muted-foreground">Manage your shared universe.</p>
          </div>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl glass-strong p-5 sm:p-8 shadow-cinema"
          >
            <h2 className="mb-6 font-display text-xl font-bold">Upload Memories</h2>
            
            <div className="mb-4 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Category (Optional)</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full rounded-xl glass py-3 px-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 text-foreground"
                style={{ backgroundColor: "oklch(var(--glass))" }}
              >
                <option value="">None</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.emoji} {c.name}</option>
                ))}
              </select>
            </div>

            <div 
              className="mb-6 mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center transition-colors hover:bg-primary/10 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept="image/*,video/*,audio/*"
              />
              <div className="mb-4 flex gap-4 text-primary">
                <ImageIcon className="h-8 w-8" />
                <Video className="h-8 w-8" />
                <FileAudio className="h-8 w-8" />
              </div>
              <p className="font-semibold text-foreground">Click to select files</p>
              <p className="mt-1 text-xs text-muted-foreground">Photos, videos, and voice notes</p>
            </div>

            {files.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold mb-2">{files.length} files selected</p>
                <ul className="text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-1">
                  {files.map((f, i) => <li key={i} className="truncate">{f.name}</li>)}
                </ul>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50 transition-all hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.6)]"
            >
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Upload
                </>
              )}
            </button>
          </motion.div>

          {/* Categories Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-3xl glass-strong p-5 sm:p-8 shadow-cinema"
          >
            <h2 className="mb-6 font-display text-xl font-bold">Categories</h2>
            
            <form onSubmit={handleCreateCategory} className="mb-8 flex gap-2 sm:gap-3">
              <input
                type="text"
                value={catEmoji}
                onChange={(e) => setCatEmoji(e.target.value)}
                className="w-14 sm:w-16 rounded-xl glass py-3 text-center text-xl outline-none focus:ring-1 focus:ring-primary/40 flex-none"
                placeholder="📁"
                maxLength={2}
              />
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="flex-1 min-w-0 rounded-xl glass py-3 px-3 sm:px-4 text-sm outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
                placeholder="New category name…"
              />
              <button
                type="submit"
                disabled={!catName.trim()}
                className="flex items-center justify-center rounded-xl bg-primary px-3 sm:px-4 flex-none text-primary-foreground shadow-glow disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </form>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                categories.map((c) => (
                  <div key={c._id} className="flex items-center justify-between rounded-xl glass px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.emoji}</span>
                      <span className="font-semibold">{c.name}</span>
                    </div>
                    <button
                      onClick={() => deleteCategory(c._id)}
                      className="rounded-full p-2 text-muted-foreground hover:bg-rose/10 hover:text-rose transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Profile Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl glass-strong p-5 sm:p-8 shadow-cinema md:col-span-2"
          >
            <h2 className="mb-6 font-display text-xl font-bold">Your Profile</h2>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <div className="relative h-24 w-24 flex-none rounded-full bg-gradient-to-br from-primary to-accent shadow-glow overflow-hidden group">
                {user.avatar ? (
                  <img src={user.avatar} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                    {user.name?.charAt(0) || '?'}
                  </div>
                )}
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Upload className="h-6 w-6 text-white" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>
              <div className="flex-1 w-full max-w-sm mx-auto sm:mx-0">
                {editingName ? (
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <input 
                      type="text" 
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-lg font-semibold w-full max-w-[200px] outline-none focus:ring-1 focus:ring-primary/50 text-center sm:text-left"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false); }}
                    />
                    <button onClick={handleNameSave} className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="p-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground rounded-lg transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 group/name">
                    <p className="text-xl font-semibold">{user.name}</p>
                    <button onClick={() => setEditingName(true)} className="opacity-0 group-hover/name:opacity-100 p-1 text-muted-foreground hover:text-white transition">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-2 text-xs uppercase tracking-widest text-primary font-bold">{user.role}</p>
              </div>
            </div>
            {profileUploading && (
               <p className="mt-4 text-sm text-primary animate-pulse">Uploading new profile picture...</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
