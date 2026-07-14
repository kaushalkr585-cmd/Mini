import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Hero } from "@/components/Hero";
import { MemoryRow } from "@/components/MemoryRow";
import { Timeline } from "@/components/Timeline";
import { LoveQuote } from "@/components/LoveQuote";
import { Footer } from "@/components/Footer";
import { useCoupleStore, Memory } from "@/store/coupleStore";
import { MemoryCollections } from "@/components/MemoryCollections";
import { LoveNoteCard } from "@/components/LoveNoteCard";

// Lazy-load heavy modals so the homepage initial bundle stays lean
const MemoryViewerModal = lazy(() => import("@/components/MemoryViewerModal").then(m => ({ default: m.MemoryViewerModal })));
const UploadMemoryModal = lazy(() => import("@/components/UploadMemoryModal").then(m => ({ default: m.UploadMemoryModal })));
const ReliveMemoriesSlideshow = lazy(() => import("@/components/ReliveMemoriesSlideshow").then(m => ({ default: m.ReliveMemoriesSlideshow })));

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { memories, categories, fetchMemories, fetchCategories, likeMemory } = useCoupleStore();
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isUploadMemoryOpen, setIsUploadMemoryOpen] = useState(false);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);

  useEffect(() => {
    fetchMemories();
    fetchCategories();
  }, [fetchMemories, fetchCategories]);

  // Group memories by category for the homepage
  const collections = useMemo(() => {
    const groups: { title: string; tagline: string; items: Memory[] }[] = [];
    
    // Add "Recent Memories"
    if (memories.length > 0) {
      groups.push({
        title: "Recent Memories",
        tagline: "The latest moments we've shared",
        items: memories.slice(0, 8)
      });
    }

    // Add categories that have memories
    categories.forEach(cat => {
      const catMemories = memories.filter(m => m.categoryId === cat._id);
      if (catMemories.length > 0) {
        groups.push({
          title: `${cat.emoji} ${cat.name}`,
          tagline: "Explore these beautiful moments",
          items: catMemories.slice(0, 8)
        });
      }
    });

    return groups;
  }, [memories, categories]);

  const handleReliveLatest = () => {
    if (memories.length > 0) {
      setIsSlideshowOpen(true);
    } else {
      setIsSlideshowOpen(true); // Will show the empty state handle in slideshow
    }
  };

  return (
    <div className="relative min-h-screen">
      <main className="relative z-10">
        <Hero 
          onAddMemory={() => setIsUploadMemoryOpen(true)} 
          onReliveLatest={handleReliveLatest} 
        />
        
        {/* Customizable Homepage Love Note Card */}
        <div className="mx-auto max-w-7xl px-6 mb-8 mt-2">
          <LoveNoteCard />
        </div>

        <div className="space-y-4">
          {collections.map((c) => (
            <MemoryRow 
              key={c.title} 
              title={c.title} 
              tagline={c.tagline} 
              items={c.items} 
              onOpenMemory={setSelectedMemory}
            />
          ))}
          {collections.length === 0 && (
            <div className="py-20 text-center text-muted-foreground">
              No memories uploaded yet. Head to the Memories section to start!
            </div>
          )}
        </div>
        {/* Memory Collections — categories below Recent Memories */}
        <MemoryCollections />
        <LoveQuote />
        <Timeline />
        <Footer />
      </main>
      <Suspense fallback={null}>
        {selectedMemory && <MemoryViewerModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} onLike={likeMemory} />}
        {isUploadMemoryOpen && <UploadMemoryModal isOpen={isUploadMemoryOpen} onClose={() => setIsUploadMemoryOpen(false)} />}
        {isSlideshowOpen && <ReliveMemoriesSlideshow memories={memories} onClose={() => setIsSlideshowOpen(false)} />}
      </Suspense>
    </div>
  );
}
