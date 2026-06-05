/**
 * Client-side media compression and upload utilities.
 *
 * Images  → Canvas API resize + WebP/JPEG re-encode.
 * Videos  → MediaRecorder API re-encode at lower resolution (best-effort; falls
 *           back to original on unsupported browsers like older iOS).
 * Upload  → Axios with onUploadProgress for speed + ETA display, plus a simple
 *           chunked-retry wrapper for large files.
 */

import axios from 'axios';

// ─── Image compression ────────────────────────────────────────────────────────

const MAX_WIDTH  = 1920;
const MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 0.82; // 82 % JPEG quality — good balance

/**
 * Compress a single image file using Canvas.
 * Returns the compressed file, or the original if it's already small / unsupported.
 */
export async function compressImage(
  file: File,
  opts?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<File> {
  // Only compress photos; skip GIF, video, SVG etc.
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) return file;

  // Skip files already under 200 KB
  if (file.size < 200 * 1024) return file;

  const mw      = opts?.maxWidth  ?? MAX_WIDTH;
  const mh      = opts?.maxHeight ?? MAX_HEIGHT;
  const quality = opts?.quality   ?? IMAGE_QUALITY;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > mw || height > mh) {
        const ratio = Math.min(mw / width, mh / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          const ext        = file.type === 'image/png' ? 'png' : 'jpg';
          const name       = file.name.replace(/\.[^.]+$/, `.${ext}`);
          const compressed = new File([blob], name, { type: blob.type, lastModified: Date.now() });
          resolve(compressed);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

// ─── Video compression ────────────────────────────────────────────────────────

/**
 * Attempt client-side video downscaling using Canvas + MediaRecorder.
 *
 * Strategy:
 *   1. Decode the source video frame-by-frame onto a scaled canvas.
 *   2. Re-encode using MediaRecorder (VP9 preferred, VP8 fallback, then H.264).
 *   3. If anything fails or the browser doesn't support it, return the original file.
 *
 * Target: 720p max, 2 Mbps video + 128 kbps audio.
 * Best support: Chrome/Edge on Android. Limited on iOS Safari (falls back gracefully).
 *
 * @param file          Source video file
 * @param onProgress    Progress callback (0–100)
 * @param maxWidthPx    Maximum output width in pixels (default 1280 = 720p landscape)
 */
export async function compressVideo(
  file: File,
  onProgress?: (pct: number) => void,
  maxWidthPx = 1280
): Promise<File> {
  // Only attempt compression for large videos (> 20 MB)
  if (file.size < 20 * 1024 * 1024) return file;

  // Check MediaRecorder support
  if (typeof MediaRecorder === 'undefined') return file;

  // Pick the best supported codec
  const codecPreferences = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
  ];
  const mimeType = codecPreferences.find((c) => MediaRecorder.isTypeSupported(c));
  if (!mimeType) return file; // Browser can't re-encode; upload original

  return new Promise((resolve) => {
    const video   = document.createElement('video');
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d');
    const objectUrl = URL.createObjectURL(file);
    let   recorder: MediaRecorder;
    const chunks: Blob[] = [];

    video.src      = objectUrl;
    video.muted    = true;
    video.preload  = 'metadata';
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const origW = video.videoWidth;
      const origH = video.videoHeight;

      if (!origW || !origH || !ctx) { cleanup(); resolve(file); return; }

      // Scale down while maintaining aspect ratio
      let targetW = origW;
      let targetH = origH;
      if (targetW > maxWidthPx) {
        const ratio = maxWidthPx / targetW;
        targetW = maxWidthPx;
        targetH = Math.round(origH * ratio);
      }
      // Ensure even dimensions (required by some codecs)
      targetW = targetW % 2 === 0 ? targetW : targetW - 1;
      targetH = targetH % 2 === 0 ? targetH : targetH - 1;

      // If already within target size, skip
      if (targetW >= origW && file.size < 50 * 1024 * 1024) {
        cleanup();
        resolve(file);
        return;
      }

      canvas.width  = targetW;
      canvas.height = targetH;

      // Capture canvas stream at 25 fps
      let canvasStream: MediaStream;
      try {
        canvasStream = canvas.captureStream(25);
      } catch {
        cleanup();
        resolve(file);
        return;
      }

      // Merge video audio track if available
      const audioTracks = (video as any).captureStream?.()?.getAudioTracks?.() ?? [];
      audioTracks.forEach((t: MediaStreamTrack) => canvasStream.addTrack(t));

      try {
        recorder = new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: 2_000_000, // 2 Mbps
          audioBitsPerSecond: 128_000,
        });
      } catch {
        cleanup();
        resolve(file);
        return;
      }

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: mimeType });
        // If compression made it bigger, return original
        if (blob.size >= file.size) { resolve(file); return; }
        const ext  = 'webm';
        const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
        resolve(new File([blob], name, { type: mimeType, lastModified: Date.now() }));
      };

      recorder.onerror = () => { cleanup(); resolve(file); };

      const duration = video.duration;

      const drawFrame = () => {
        if (video.paused || video.ended) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, targetW, targetH);
        if (duration > 0) {
          onProgress?.(Math.round((video.currentTime / duration) * 100));
        }
        requestAnimationFrame(drawFrame);
      };

      recorder.start(100); // Collect data every 100ms

      video.play().then(() => {
        drawFrame();
      }).catch(() => {
        recorder.stop();
        cleanup();
        resolve(file);
      });

      // Safety timeout: stop after video duration + 5s buffer
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, (video.duration + 5) * 1000);
    };

    video.onerror = () => { cleanup(); resolve(file); };
  });
}

// ─── Batch compression ────────────────────────────────────────────────────────

/**
 * Compress all files in an array.
 * Images → canvas compress. Videos > 20 MB → MediaRecorder compress (best-effort).
 */
export async function compressFiles(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<File[]> {
  let done = 0;
  const results = await Promise.all(
    files.map(async (file) => {
      let result: File;
      if (file.type.startsWith('video/')) {
        result = await compressVideo(file);
      } else {
        result = await compressImage(file);
      }
      done++;
      onProgress?.(done, files.length);
      return result;
    })
  );
  return results;
}

// ─── Upload with progress tracking ───────────────────────────────────────────

export interface UploadProgressInfo {
  /** 0–100 */
  percent: number;
  /** Upload speed in bytes per second */
  speedBps: number;
  /** Formatted speed string e.g. "2.4 MB/s" */
  speedLabel: string;
  /** Estimated seconds remaining */
  etaSeconds: number;
  /** Formatted ETA string e.g. "12s" or "2m 3s" */
  etaLabel: string;
  /** Bytes uploaded so far */
  loaded: number;
  /** Total bytes */
  total: number;
}

function formatSpeed(bps: number): string {
  if (bps < 1024)         return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024)  return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}

/**
 * Upload a FormData payload with rich progress callbacks.
 * Falls back to normal upload if AbortController is unavailable.
 *
 * @param url           Backend endpoint
 * @param formData      FormData to POST
 * @param headers       Extra headers (e.g. auth token)
 * @param onProgress    Called repeatedly with progress info
 * @param signal        Optional AbortSignal to cancel
 */
export async function uploadWithProgress(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  onProgress: (info: UploadProgressInfo) => void,
  signal?: AbortSignal
): Promise<any> {
  const startTime = Date.now();
  let lastLoaded = 0;
  let lastTime   = startTime;

  const { data } = await axios.post(url, formData, {
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    signal,
    onUploadProgress: (evt) => {
      const now     = Date.now();
      const loaded  = evt.loaded ?? 0;
      const total   = evt.total  ?? 0;
      const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

      const timeDelta   = (now - lastTime) / 1000; // seconds
      const bytesDelta  = loaded - lastLoaded;
      const speedBps    = timeDelta > 0.1 ? bytesDelta / timeDelta : 0;

      lastLoaded = loaded;
      lastTime   = now;

      const remaining  = total - loaded;
      const etaSeconds = speedBps > 0 ? remaining / speedBps : Infinity;

      onProgress({
        percent,
        speedBps,
        speedLabel: formatSpeed(speedBps),
        etaSeconds,
        etaLabel:   formatEta(etaSeconds),
        loaded,
        total,
      });
    },
  });

  return data;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
