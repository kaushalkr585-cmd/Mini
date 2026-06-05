/**
 * useDeviceCapability
 * Detects screen size, connection speed, and device memory
 * to drive conditional performance optimisations throughout
 * the Memories section.
 */

import { useMemo } from 'react';

interface DeviceCapability {
  /** True when viewport width < 428 px (iPhone SE, small Androids) */
  isMobile: boolean;
  /** True when viewport width < 768 px */
  isTablet: boolean;
  /** True for slow connection OR low device memory */
  isLowEnd: boolean;
  /** Shorthand: should we reduce blur / shadow / animation costs? */
  shouldReduceEffects: boolean;
}

function getCapability(): DeviceCapability {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isLowEnd: false, shouldReduceEffects: false };
  }

  const width = window.innerWidth;
  const isMobile = width < 428;
  const isTablet = width < 768;

  // Network detection (not universally supported — falls back gracefully)
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const effectiveType: string = conn?.effectiveType ?? '4g';
  const isSlowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

  // Device memory (Chrome only; undefined on Safari/Firefox — treat as capable)
  const deviceMemoryGB: number = (navigator as any).deviceMemory ?? 8;
  const isLowMemory = deviceMemoryGB < 4;

  // Prefers-reduced-motion media query
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isLowEnd = isSlowNetwork || isLowMemory || prefersReducedMotion;
  const shouldReduceEffects = isMobile || isLowEnd;

  return { isMobile, isTablet, isLowEnd, shouldReduceEffects };
}

/**
 * Returns stable device capability flags.
 * Values are computed once per component mount and do not re-subscribe
 * to resize events (to avoid render storms on scroll).
 * For responsive layout changes use CSS media queries instead.
 */
export function useDeviceCapability(): DeviceCapability {
  return useMemo(() => getCapability(), []);
}

/** Convenience singleton for use outside React (e.g. utility functions). */
export const deviceCapability = getCapability();
