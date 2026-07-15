import { useRef, useState, useCallback } from 'react';

export type ScreenShareError =
  | 'permission-denied'
  | 'not-supported'
  | 'aborted'
  | 'unknown';

export type StreamResolution = '1080p' | '720p' | '480p' | '360p';

export const RESOLUTION_MAP: Record<StreamResolution, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
};

export interface ScreenShareState {
  isSharing: boolean;
  hasAudio: boolean;
  error: ScreenShareError | null;
  errorMessage: string | null;
}

interface UseScreenShareOptions {
  /** Called when the user stops sharing via browser native button or JS */
  onStreamEnded: () => void;
}

/**
 * Manages screen capture via getDisplayMedia().
 *
 * Handles:
 * - Requesting screen/tab/window capture with optional audio
 * - Permission denied by user
 * - Browser not supporting getDisplayMedia
 * - User clicking browser-native "Stop sharing" button
 * - Detecting whether an audio track is actually present
 * - Proper cleanup of all tracks
 */
export function useScreenShare(options: UseScreenShareOptions) {
  const { onStreamEnded } = options;

  const localStreamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<ScreenShareState>({
    isSharing: false,
    hasAudio: false,
    error: null,
    errorMessage: null,
  });

  // ── Start screen capture ────────────────────────────────────────────────
  const startScreenShare = useCallback(async (resolution: StreamResolution = '1080p'): Promise<MediaStream | null> => {
    // Clear any previous error
    setState((s) => ({ ...s, error: null, errorMessage: null }));

    // Feature detect — getDisplayMedia is not available on all browsers/mobile
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getDisplayMedia !== 'function'
    ) {
      setState({
        isSharing: false,
        hasAudio: false,
        error: 'not-supported',
        errorMessage:
          'Screen sharing is not supported in this browser. Please use a modern desktop browser such as Chrome, Edge, or Firefox.',
      });
      return null;
    }

    try {
      // Request display media — video always required; audio requested but
      // may be unavailable depending on OS and browser.
      // Chrome on Windows/Mac supports system/tab audio.
      // Firefox and Safari have more limited audio capture.
      const res = RESOLUTION_MAP[resolution];

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // Allow capture up to 60fps for buttery smooth motion.
          // We omit 'max' width/height to prevent aggressive premature browser downscaling;
          // WebRTC's internal congestion control will handle downscaling dynamically if needed.
          frameRate: { ideal: 60, max: 60 },
          width: { ideal: res.width },
          height: { ideal: res.height },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Detect whether an audio track was actually captured
      const audioTracks = stream.getAudioTracks();
      const hasAudio = audioTracks.length > 0;

      // Listen for the browser-native "Stop sharing" button click.
      // When the user clicks it, the video track's readyState becomes 'ended'.
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          // This fires when the user clicks the browser's native stop button
          handleStreamEndedInternal();
        };
      }

      // Also watch audio tracks for unexpected ending
      audioTracks.forEach((track) => {
        track.onended = () => {
          // If all video tracks are also ended, treat it as stream stop
          const videoTracks = stream.getVideoTracks();
          const videoEnded = videoTracks.every((t) => t.readyState === 'ended');
          if (videoEnded) handleStreamEndedInternal();
        };
      });

      // Stop old stream tracks if this is a seamless switch
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => {
          t.onended = null;
          t.stop();
        });
      }

      localStreamRef.current = stream;

      setState({
        isSharing: true,
        hasAudio,
        error: null,
        errorMessage: null,
      });

      return stream;
    } catch (err: unknown) {
      let errorType: ScreenShareError = 'unknown';
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorType = 'permission-denied';
          errorMessage = 'Screen sharing permission was denied. Please allow screen sharing and try again.';
        } else if (err.name === 'AbortError' || err.message?.includes('closed')) {
          // User cancelled the picker dialog — not really an error
          errorType = 'aborted';
          errorMessage = '';
        } else if (err.name === 'NotSupportedError' || err.name === 'TypeError') {
          errorType = 'not-supported';
          errorMessage = 'Screen sharing is not supported in this browser.';
        }
      }

      // If we are already sharing, and the user cancels a "switch" operation,
      // we shouldn't kill the existing stream state.
      const currentlySharing = !!localStreamRef.current;

      if (!currentlySharing) {
        if (errorType !== 'aborted') {
          setState({ isSharing: false, hasAudio: false, error: errorType, errorMessage });
        } else {
          setState((s) => ({ ...s, isSharing: false }));
        }
      } else {
        if (errorType !== 'aborted') {
          // Just surface the error without killing the active share
          setState((s) => ({ ...s, error: errorType, errorMessage }));
        }
      }

      return null;
    }
  }, []);

  // ── Internal handler when stream ends (native button or JS) ────────────
  const handleStreamEndedInternal = useCallback(() => {
    stopScreenShare();
    onStreamEnded();
  }, [onStreamEnded]);

  // ── Stop screen capture and clean up all tracks ─────────────────────────
  const stopScreenShare = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.onended = null; // Remove listener before stopping to avoid double-firing
        track.stop();
      });
      localStreamRef.current = null;
    }
    setState({ isSharing: false, hasAudio: false, error: null, errorMessage: null });
  }, []);

  // ── Clear error state (allow retry) ────────────────────────────────────
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null, errorMessage: null }));
  }, []);

  return {
    localStreamRef,
    state,
    startScreenShare,
    stopScreenShare,
    clearError,
  };
}
