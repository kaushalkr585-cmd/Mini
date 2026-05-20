import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./components/layout/Navbar";
import Hero from "./components/home/Hero";
import Particles from "./components/ui/Particles";

/* ─── Memory Row ─── */
const placeholderCards = [
  { id: 1, label: "First Date Night 💫", color: "#1a0a12" },
  { id: 2, label: "Beach Escape 🌊", color: "#0a1020" },
  { id: 3, label: "Cozy Coffee Day ☕", color: "#120a0a" },
  { id: 4, label: "Rooftop Stargazing ✨", color: "#0a0a1a" },
  { id: 5, label: "Surprise Picnic 🌸", color: "#0d120a" },
  { id: 6, label: "Late Night Drive 🌙", color: "#120f0a" },
];

function MemoryCard({ label, color }) {
  return (
    <motion.div
      whileHover={{ scale: 1.07, y: -8 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        minWidth: "200px",
        height: "120px",
        borderRadius: "10px",
        background: color,
        border: "1px solid rgba(233,73,120,0.15)",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-end",
        padding: "14px",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(233,73,120,0.08) 0%, transparent 60%)",
      }} />
      <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.9)", position: "relative", zIndex: 1 }}>
        {label}
      </span>
    </motion.div>
  );
}

function MemoryRow({ title, emoji, cards }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
      style={{ marginBottom: "48px" }}
    >
      <h2 style={{
        fontSize: "22px", fontWeight: 700,
        marginBottom: "16px",
        color: "rgba(255,255,255,0.95)",
        letterSpacing: "-0.02em",
      }}>
        {emoji} {title}
      </h2>
      <div style={{
        display: "flex", gap: "14px",
        overflowX: "auto", paddingBottom: "16px",
        scrollbarWidth: "none",
      }}>
        {cards.map((c) => <MemoryCard key={c.id} {...c} />)}
      </div>
    </motion.div>
  );
}

function Home() {
  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh" }}>
      <Hero />
      {/* Sections */}
      <div style={{ padding: "40px 6% 80px" }}>
        <MemoryRow title="Our Memories" emoji="💖" cards={placeholderCards} />
        <MemoryRow title="Cute Moments" emoji="🥰" cards={[...placeholderCards].reverse()} />
        <MemoryRow title="Trips Together" emoji="✈️" cards={placeholderCards.slice(0, 5)} />
        <MemoryRow title="Special Days" emoji="🎉" cards={[...placeholderCards].slice(2)} />
      </div>
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(true);

  return (
    <Router>
      <div style={{
        minHeight: "100vh",
        background: isDark ? "#0a0a0f" : "#faf5f8",
        color: isDark ? "#f0f0f0" : "#1a1a2e",
        transition: "background 0.6s ease, color 0.6s ease",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <Particles />
        <Navbar isDark={isDark} setIsDark={setIsDark} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/memories" element={
              <div style={{ paddingTop: "120px", textAlign: "center", opacity: 0.6 }}>
                Memories page coming soon...
              </div>
            } />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}
