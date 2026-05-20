import { motion } from "framer-motion";
import { Play, Info, Heart, ChevronDown } from "lucide-react";
import heroBg from "../../assets/hero_bg.jpg";

export default function Hero() {
  return (
    <div style={{ position: "relative", height: "100vh", width: "100%", overflow: "hidden", display: "flex", alignItems: "center" }}>

      {/* Background Image */}
      <img
        src={heroBg}
        alt="Hero Background"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          transform: "scale(1.05)",
        }}
      />

      {/* Dark overlay - cinematic gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to right, rgba(10,10,15,1) 0%, rgba(10,10,15,0.65) 55%, rgba(10,10,15,0.1) 100%)"
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(10,10,15,1) 0%, transparent 50%)"
      }} />

      {/* Ambient pink glow */}
      <div style={{
        position: "absolute", bottom: "20%", left: "10%",
        width: "500px", height: "500px",
        background: "radial-gradient(circle, rgba(233,73,120,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10, padding: "0 6%", maxWidth: "900px", paddingTop: "96px" }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          {/* Label */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}
          >
            <Heart style={{ color: "#e94978", width: 16, height: 16 }} fill="#e94978" />
            <span style={{ color: "#e94978", fontSize: "13px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Nishy Original
            </span>
          </motion.div>

          {/* Title */}
          <h1 style={{
            fontSize: "clamp(3rem, 8vw, 7rem)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: "20px",
            color: "#fff",
          }}>
            Our{" "}
            <span style={{
              background: "linear-gradient(135deg, #ff7eb3 0%, #e94978 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Journey
            </span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              color: "rgba(255,255,255,0.75)",
              maxWidth: "560px",
              lineHeight: 1.7,
              marginBottom: "36px",
            }}
          >
            Relive every magical moment, every late-night conversation, and every adventure we've shared. This is our private universe, built just for us.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: "#fff",
                color: "#0a0a0f",
                border: "none",
                padding: "14px 32px",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Play style={{ width: 18, height: 18 }} fill="currentColor" />
              Relive Latest
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.15)" }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "14px 32px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backdropFilter: "blur(10px)",
              }}
            >
              <Info style={{ width: 18, height: 18 }} />
              More Info
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", bottom: "40px", left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.4)",
          zIndex: 10,
        }}
      >
        <ChevronDown style={{ width: 32, height: 32 }} />
      </motion.div>
    </div>
  );
}
