import { useEffect, useRef } from "react";
import { deviceCapability } from "@/hooks/useDeviceCapability";

/**
 * AmbientBackground
 *
 * Performance characteristics:
 * – ONE canvas, ONE rAF loop, ZERO React state updates per frame.
 * – DPR is capped per device tier (1 / 1.5 / 2) to limit GPU pixel fill.
 * – shadowBlur is enabled only on high-tier devices; on lower tiers a
 *   pre-baked offscreen glow stamp is used (drawn once, blitted each frame).
 * – Particle count is tier-aware: low=8, balanced=15–22, high=30–65.
 * – Loop pauses automatically when the tab is hidden (Page Visibility API).
 * – Resize is debounced (150 ms) and particle bounds are patched in place.
 * – No new object allocations inside the draw loop.
 * – ctx.setTransform is hoisted OUT of the per-frame draw loop and only
 *   re-applied after a resize event — saves one matrix-multiply per frame.
 */

const {
  particleCount: PARTICLE_COUNT,
  enableShadowBlur: USE_SHADOW_BLUR,
  enableOrb: ENABLE_ORB,
  canvasDpr: DPR,
  tier: DEVICE_TIER,
} = deviceCapability;

// Build a single glow stamp drawn once and blitted to each particle.
// Only used when shadowBlur is disabled (balanced / low tier).
function buildGlowStamp(radius: number): HTMLCanvasElement {
  const size = Math.ceil(radius * 6);
  const oc = document.createElement("canvas");
  oc.width = size;
  oc.height = size;
  const octx = oc.getContext("2d")!;
  const cx = size / 2;
  const grad = octx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, "rgba(255,105,180,0.7)");
  grad.addColorStop(0.4, "rgba(255,105,180,0.25)");
  grad.addColorStop(1, "rgba(255,105,180,0)");
  octx.fillStyle = grad;
  octx.fillRect(0, 0, size, size);
  return oc;
}

export function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Skip animation entirely if prefers-reduced-motion is set
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Nothing to animate on low tier with 0 particles
    if (PARTICLE_COUNT === 0) return;

    // ── Canvas sizing (DPR-capped) ────────────────────────────────────
    const applySize = () => {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      canvas.width = Math.round(cw * DPR);
      canvas.height = Math.round(ch * DPR);
      canvas.style.width = cw + "px";
      canvas.style.height = ch + "px";
      // Re-apply transform after resize (canvas.width reset clears it)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      return { cw, ch };
    };

    let { cw: w, ch: h } = applySize();
    let paused = document.hidden;
    let raf = 0;

    // ── Glow stamp (for non-shadowBlur tiers) ────────────────────────
    // Average particle radius is ~1.8px → stamp size ~11px
    const glowStamp = USE_SHADOW_BLUR ? null : buildGlowStamp(2);

    // ── Particles ─────────────────────────────────────────────────────
    interface Particle { x: number; y: number; r: number; vx: number; vy: number; a: number; }
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.35 - 0.08,
      a: Math.random() * 0.55 + 0.15,
    }));

    // ── Draw loop ────────────────────────────────────────────────────
    // NOTE: ctx.setTransform is NOT called here — it was applied in applySize()
    // and only needs to be re-applied after a resize. This saves a matrix-multiply
    // on every single frame (was previously the first call inside every draw()).
    const draw = () => {
      if (paused) { raf = 0; return; }

      ctx.clearRect(0, 0, w, h);

      if (USE_SHADOW_BLUR) {
        // High-tier: individual arcs with shadowBlur (full glow effect)
        ctx.shadowColor = "rgba(255,105,180,0.9)";
        ctx.fillStyle = "rgba(255,105,180,1)";
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < 0 || p.x > w) p.vx *= -1;

          ctx.shadowBlur = p.r * 8;
          ctx.globalAlpha = p.a;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else {
        // Balanced / Low tier: blit pre-baked glow stamp — no shadowBlur call
        ctx.shadowBlur = 0;
        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < 0 || p.x > w) p.vx *= -1;

          if (glowStamp) {
            const size = glowStamp.width; // logical pixels
            ctx.globalAlpha = p.a;
            ctx.drawImage(glowStamp, p.x - size / 2, p.y - size / 2, size, size);
          }
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    // ── Resize (debounced) ───────────────────────────────────────────
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        // applySize() re-applies setTransform — so draw() doesn't need to
        ({ cw: w, ch: h } = applySize());
        for (const p of particles) {
          if (p.x > w) p.x = Math.random() * w;
          if (p.y > h) p.y = Math.random() * h;
        }
      }, 150);
    };
    window.addEventListener("resize", onResize, { passive: true });

    // ── Page Visibility ──────────────────────────────────────────────
    const onVisibility = () => {
      paused = document.hidden;
      if (!paused && raf === 0) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Kick off
    if (!paused) raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Glow orb: on low-end replace filter:blur with a pure CSS radial-gradient
  // (handled by the .glow-orb CSS class + media query overrides in styles.css)
  return (
    <>
      <canvas
        ref={ref}
        className="pointer-events-none fixed inset-0 z-0 opacity-70"
        aria-hidden
      />
      {ENABLE_ORB && (
        <div
          ref={orbRef}
          aria-hidden
          className={`glow-orb pointer-events-none fixed -bottom-40 -right-40 z-0 rounded-full ${
            DEVICE_TIER === "balanced"
              ? "h-[400px] w-[400px] opacity-50"
              : "h-[600px] w-[600px]"
          }`}
        />
      )}
    </>
  );
}
