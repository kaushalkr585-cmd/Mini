import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function Particles() {
  const count = 25;
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 15,
    duration: 15 + Math.random() * 20,
    size: 2 + Math.random() * 4,
    opacity: 0.3 + Math.random() * 0.5,
  }));

  return (
    <div style={{
      position: "fixed", inset: 0,
      pointerEvents: "none", zIndex: 1,
      overflow: "hidden",
    }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            bottom: "-10px",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(233,73,120,0.9), rgba(233,73,120,0.2))",
            filter: "blur(1px)",
          }}
          animate={{
            y: [0, -window.innerHeight - 50],
            x: [0, (Math.random() - 0.5) * 100],
            opacity: [0, p.opacity, p.opacity, 0],
            scale: [0, 1, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Large ambient orbs */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "30%", right: "10%",
          width: "600px", height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,73,120,0.15), transparent 70%)",
        }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.04, 0.09, 0.04] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{
          position: "absolute", bottom: "20%", left: "5%",
          width: "400px", height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(147,51,234,0.15), transparent 70%)",
        }}
      />
    </div>
  );
}
