import { useEffect, useRef } from "react";

// Adaptive particle counts by device tier
function getParticleCount() {
  if (typeof window === "undefined") return 45;
  const w = window.innerWidth;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return 0;
  if (w < 480) return 20;      // small mobile
  if (w < 768) return 30;      // tablet / large mobile
  if (w < 1280) return 50;     // laptop
  return 65;                    // desktop / large screen
}

export function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect prefers-reduced-motion — render zero particles (glow orb still shows)
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let paused = false;
    let raf = 0;

    // Debounced resize
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        // Re-scatter particles that are now outside bounds
        for (const p of particles) {
          if (p.x > w) p.x = Math.random() * w;
          if (p.y > h) p.y = Math.random() * h;
        }
      }, 150);
    };
    window.addEventListener("resize", onResize, { passive: true });

    // Pause when tab is not visible to save CPU / GPU
    const onVisibility = () => {
      paused = document.hidden;
      if (!paused && raf === 0) {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Build particles
    const count = getParticleCount();
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.35 - 0.08,
      a: Math.random() * 0.55 + 0.15,
    }));

    // Draw loop — no radialGradient per particle (uses globalAlpha + arc only)
    const draw = () => {
      if (paused) {
        raf = 0;
        return;
      }

      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < 0 || p.x > w) p.vx *= -1;

        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.fillStyle = "rgba(255, 105, 180, 1)";
        ctx.shadowColor = "rgba(255, 105, 180, 0.9)";
        ctx.shadowBlur = p.r * 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        aria-hidden
      />
      <div className="glow-orb pointer-events-none fixed -bottom-40 -right-40 z-0 h-[600px] w-[600px] rounded-full" />
    </>
  );
}
