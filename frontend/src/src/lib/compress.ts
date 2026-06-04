/**
 * Client-side image compression using Canvas API.
 * Reduces file size before upload while preserving quality.
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 0.82; // 82% JPEG quality – good balance

/**
 * Compress a single image file using canvas.
 * Returns a new File with reduced size, or the original if it's small/video.
 */
export async function compressImage(file: File, opts?: {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}): Promise<File> {
  // Only compress images; leave videos & GIFs untouched
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) return file;

  // Small files (< 200KB) don't need compression
  if (file.size < 200 * 1024) return file;

  const mw = opts?.maxWidth ?? MAX_WIDTH;
  const mh = opts?.maxHeight ?? MAX_HEIGHT;
  const quality = opts?.quality ?? IMAGE_QUALITY;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down if needed while preserving aspect ratio
      if (width > mw || height > mh) {
        const ratio = Math.min(mw / width, mh / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression made it bigger – return original
            resolve(file);
            return;
          }
          // Preserve original filename but force webp/jpeg output
          const ext = file.type === 'image/png' ? 'png' : 'jpg';
          const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
          const compressed = new File([blob], name, { type: blob.type, lastModified: Date.now() });
          resolve(compressed);
        },
        // Use webp if supported for best compression, else jpeg
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback to original
    };

    img.src = objectUrl;
  });
}

/**
 * Compress all image files in an array in parallel.
 * Videos and GIFs pass through unchanged.
 */
export async function compressFiles(files: File[], onProgress?: (done: number, total: number) => void): Promise<File[]> {
  let done = 0;
  const results = await Promise.all(
    files.map(async (file) => {
      const result = await compressImage(file);
      done++;
      onProgress?.(done, files.length);
      return result;
    })
  );
  return results;
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
