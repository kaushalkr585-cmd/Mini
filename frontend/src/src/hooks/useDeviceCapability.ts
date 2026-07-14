/**
 * useDeviceCapability
 * Detects device tier (low / balanced / high) using multiple signals:
 *   – navigator.hardwareConcurrency
 *   – navigator.deviceMemory  (Chrome only; safe fallback)
 *   – pointer: coarse         (touch-only devices)
 *   – viewport width
 *   – prefers-reduced-motion
 *   – Network effective type  (Chrome only; safe fallback)
 *
 * Values are computed once per mount.
 * Reactive layout changes should still use CSS media queries.
 */

import { useMemo } from 'react';

export type DeviceTier = 'low' | 'balanced' | 'high';

export interface DeviceCapability {
  /** Three-level performance tier */
  tier: DeviceTier;

  // ── Convenience aliases ─────────────────────────────────────────
  /** True when viewport width < 428 px (iPhone SE, small Androids) */
  isMobile: boolean;
  /** True when viewport width < 768 px */
  isTablet: boolean;
  /** Shorthand: should we reduce blur / shadow / animation costs? */
  shouldReduceEffects: boolean;
  /** True for very low-end devices — minimal effects */
  isLowEnd: boolean;

  // ── Adaptive values ─────────────────────────────────────────────
  /** Recommended maximum particle count for the canvas background */
  particleCount: number;
  /** Whether to use canvas shadowBlur for particle glow */
  enableShadowBlur: boolean;
  /** Whether to render the ambient glow orb */
  enableOrb: boolean;
  /**
   * Canvas device pixel ratio cap.
   * High-tier: min(devicePixelRatio, 2)
   * Balanced:  min(devicePixelRatio, 1.5)
   * Low:       1
   */
  canvasDpr: number;
  /** Recommended backdrop-filter blur level (px) — 0 means skip it */
  blurLevel: 'full' | 'reduced' | 'minimal';
  /** Whether Framer Motion layout animations are enabled */
  enableLayoutAnimation: boolean;
}

function getCapability(): DeviceCapability {
  // SSR guard
  if (typeof window === 'undefined') {
    return {
      tier: 'high',
      isMobile: false,
      isTablet: false,
      shouldReduceEffects: false,
      isLowEnd: false,
      particleCount: 50,
      enableShadowBlur: true,
      enableOrb: true,
      canvasDpr: 1.5,
      blurLevel: 'full',
      enableLayoutAnimation: true,
    };
  }

  const width = window.innerWidth;
  const isMobile = width < 428;
  const isTablet = width < 768;

  // ── Signals ──────────────────────────────────────────────────────
  const cpuCores: number = navigator.hardwareConcurrency ?? 4;
  // deviceMemory is Chrome-only; undefined on Safari/Firefox → treat as capable (8 GB)
  const deviceMemoryGB: number = (navigator as any).deviceMemory ?? 8;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  // Network (Chrome only)
  const conn = (navigator as any).connection ?? (navigator as any).mozConnection ?? (navigator as any).webkitConnection;
  const effectiveType: string = conn?.effectiveType ?? '4g';
  const isSlowNetwork = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

  // ── Tier classification ───────────────────────────────────────────
  let tier: DeviceTier;

  if (
    prefersReducedMotion ||
    deviceMemoryGB <= 1 ||
    cpuCores <= 2 ||
    (isSlowNetwork && isMobile) ||
    width < 360
  ) {
    tier = 'low';
  } else if (
    deviceMemoryGB <= 3 ||
    cpuCores <= 4 ||
    (isCoarsePointer && isTablet) ||
    (isSlowNetwork && isTablet)
  ) {
    tier = 'balanced';
  } else {
    tier = 'high';
  }

  // ── Derived values ────────────────────────────────────────────────
  const isLowEnd = tier === 'low';
  const shouldReduceEffects = tier !== 'high';

  const particleCount =
    tier === 'low' ? (prefersReducedMotion ? 0 : 8) :
    tier === 'balanced' ? (isMobile ? 15 : 22) :
    (isMobile ? 30 : width < 1280 ? 50 : 65);

  const canvasDpr =
    tier === 'low' ? 1 :
    tier === 'balanced' ? Math.min(window.devicePixelRatio, 1.5) :
    Math.min(window.devicePixelRatio, 2);

  return {
    tier,
    isMobile,
    isTablet,
    shouldReduceEffects,
    isLowEnd,
    particleCount,
    enableShadowBlur: tier === 'high',
    enableOrb: !isLowEnd,
    canvasDpr,
    blurLevel: tier === 'low' ? 'minimal' : tier === 'balanced' ? 'reduced' : 'full',
    enableLayoutAnimation: tier === 'high',
  };
}

/**
 * Returns stable device capability flags.
 * Computed once per component mount — no re-subscriptions to resize events.
 * Use CSS media queries for responsive layout changes.
 */
export function useDeviceCapability(): DeviceCapability {
  return useMemo(() => getCapability(), []);
}

/** Convenience singleton for use outside React (e.g. utility functions, canvas setup). */
export const deviceCapability = getCapability();
