import { useEffect, useRef } from "react";

/**
 * CursorGlow
 *
 * Renders a soft radial glow that follows the cursor on desktop.
 * Skip entirely on touch-only devices (no cursor).
 *
 * Performance optimisations:
 * – Skipped completely on `pointer: coarse` devices (touch-only).
 * – rAF loop idles (cancels itself) after 3 seconds of no mouse movement.
 *   The loop restarts automatically on the next mousemove event.
 * – Pauses when the tab is hidden (Page Visibility API).
 * – No React state updates — direct style.transform mutation.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run on devices that actually have a mouse pointer
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const el = ref.current;
    if (!el) return;

    let tx = 0, ty = 0, x = 0, y = 0;
    let raf = 0;
    let idleTimer = 0;
    let isIdle = false;
    let isPaused = document.hidden;

    const startLoop = () => {
      if (raf !== 0 || isIdle || isPaused) return;
      raf = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const loop = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.transform = `translate3d(${x - 150}px, ${y - 150}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;

      // Clear idle state and restart loop if it had stopped
      if (isIdle) {
        isIdle = false;
        startLoop();
      }

      // Reset idle timer — stop rAF after 3 s of no movement to save CPU
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        isIdle = true;
        stopLoop();
      }, 3000);
    };

    const onVisibility = () => {
      isPaused = document.hidden;
      if (isPaused) {
        stopLoop();
      } else if (!isIdle) {
        startLoop();
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    // Initial loop start
    startLoop();

    return () => {
      stopLoop();
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] h-[300px] w-[300px] rounded-full opacity-40 mix-blend-screen hidden md:block"
      style={{ background: "radial-gradient(circle, oklch(0.78 0.28 350 / 0.5), transparent 70%)" }}
    />
  );
}
