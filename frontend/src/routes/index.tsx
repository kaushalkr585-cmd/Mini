import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { MemoryRow } from "@/components/MemoryRow";
import { Timeline } from "@/components/Timeline";
import { LoveQuote } from "@/components/LoveQuote";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Footer } from "@/components/Footer";
import { collections } from "@/lib/memories";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <div className="space-y-4">
          {collections.map((c) => (
            <MemoryRow key={c.title} title={c.title} tagline={c.tagline} items={c.items} />
          ))}
        </div>
        <LoveQuote />
        <Timeline />
        <Footer />
      </main>
      <MusicPlayer />
    </div>
  );
}
