/**
 * useVideoIntersection
 * IntersectionObserver hook that automatically pauses videos when they leave
 * the viewport and resumes them when they re-enter.
 * Prevents simultaneous decoding of multiple off-screen videos.
 */

import { useEffect, useRef, RefObject } from 'react';

interface UseVideoIntersectionOptions {
  /** Fraction of the element that must be visible before playing. Default 0.1 */
  threshold?: number;
  /**
   * If true the video will autoplay when it enters the viewport.
   * If false it only pauses on exit (manual play still needed).
   */
  autoPlayOnEnter?: boolean;
  /**
   * When the element is this many pixels away from the viewport in either
   * direction, preload metadata but don't play yet.
   */
  rootMargin?: string;
}

/**
 * Attaches an IntersectionObserver to a video ref.
 * - Pauses video when it leaves the viewport (frees GPU/decoder resources).
 * - Optionally auto-plays when re-entering.
 * - Cleans up properly on unmount.
 */
export function useVideoIntersection(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UseVideoIntersectionOptions = {}
): void {
  const { threshold = 0.1, autoPlayOnEnter = false, rootMargin = '0px' } = options;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          // Left viewport — pause and free decoder
          if (!video.paused) {
            video.pause();
          }
        } else if (autoPlayOnEnter && video.paused) {
          // Entered viewport — resume if autoPlay is requested
          video.play().catch(() => {
            // Autoplay blocked — silently ignore
          });
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [videoRef, threshold, autoPlayOnEnter, rootMargin]);
}

/**
 * Releases a video element's resources by clearing its source.
 * Call this when closing a modal or unmounting a component that owns a video.
 */
export function releaseVideo(video: HTMLVideoElement | null): void {
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  video.load(); // Forces the browser to release buffered data
}

/**
 * Page Visibility API hook — pauses/resumes a video when the tab is hidden/shown.
 */
export function usePageVisibilityPause(
  videoRef: RefObject<HTMLVideoElement | null>
): void {
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
      }
      // We don't auto-resume on visibility — user should resume manually
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [videoRef]);
}
