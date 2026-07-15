import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Heart, Play, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { useCoupleStore } from '@/store/coupleStore';
import { getSocket } from '@/lib/socket';

import { useWebRTC, type WebRTCConnectionState } from '@/hooks/useWebRTC';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useStreamConnection } from '@/hooks/useStreamConnection';

import { StreamPlayer, type StreamPlayerHandle } from '@/components/streaming/StreamPlayer';
import { StreamControls } from '@/components/streaming/StreamControls';
import { StreamStatus } from '@/components/streaming/StreamStatus';
import { ParticipantPanel } from '@/components/streaming/ParticipantPanel';
import { ConnectionStatus } from '@/components/streaming/ConnectionStatus';

export const Route = createFileRoute('/streaming')({
  component: StreamingPage,
});

// ── Types ─────────────────────────────────────────────────────────────────

interface StreamState {
  active: boolean;
  /** 'local' when WE are streaming, otherwise the remote socket ID */
  streamerId: string | null;
  streamerName: string | null;
  hasAudio: boolean;
  startedAt: string | null;
}

const EMPTY_STREAM: StreamState = {
  active: false,
  streamerId: null,
  streamerName: null,
  hasAudio: false,
  startedAt: null,
};

// ── Autoplay blocked banner ────────────────────────────────────────────────

const AutoplayBanner = memo(function AutoplayBanner({
  onResume,
}: {
  onResume: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="flex items-center gap-3 glass-strong rounded-xl px-4 py-3 border border-primary/20"
    >
      <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
      <p className="text-sm text-foreground flex-1">
        Autoplay blocked by browser.{' '}
        <button
          onClick={onResume}
          className="text-primary underline underline-offset-2 font-medium"
        >
          Click to resume audio
        </button>
      </p>
      <button onClick={onResume} className="btn-glass-icon" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────

function StreamingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { partner, onlineUsers } = useCoupleStore();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!user) navigate({ to: '/login' });
  }, [user, navigate]);

  // ── Stream state ──────────────────────────────────────────────────────
  const [streamState, setStreamState] = useState<StreamState>(EMPTY_STREAM);
  const [connectionState, setConnectionState] = useState<WebRTCConnectionState>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Mute and volume — visible regardless of streamer/viewer role
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // 'local' sentinel means WE are streaming
  const iAmStreaming = streamState.active && streamState.streamerId === 'local';

  // Ref to the StreamPlayer imperative handle (avoids re-renders when attaching streams)
  const playerRef = useRef<StreamPlayerHandle>(null);

  // ── WebRTC hook ───────────────────────────────────────────────────────
  const webrtc = useWebRTC({
    onRemoteStream: useCallback((stream: MediaStream) => {
      playerRef.current?.setRemoteStream(stream);
    }, []),
    onRemoteStreamEnded: useCallback(() => {
      playerRef.current?.setRemoteStream(null);
      setStreamState(EMPTY_STREAM);
      toast('Stream ended', { icon: '📺' });
    }, []),
    onConnectionStateChange: useCallback((state: WebRTCConnectionState) => {
      setConnectionState(state);
    }, []),
    onError: useCallback((msg: string) => {
      setConnectionError(msg);
      toast.error(msg);
    }, []),
  });

  // ── Screen share hook ─────────────────────────────────────────────────
  const screenShare = useScreenShare({
    onStreamEnded: useCallback(() => {
      // Browser-native "Stop sharing" button was clicked
      handleStopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  });

  // ── Socket signaling hook ─────────────────────────────────────────────
  const streamConn = useStreamConnection({
    onPeerJoined: useCallback((socketId: string, name: string) => {
      toast(`${name} joined the room 👀`, { icon: '💞' });

      // If WE are currently streaming and a peer just joined,
      // create a fresh peer connection and send them an offer
      // (they may have joined after the stream started)
      if (streamState.active && streamState.streamerId === 'local' && screenShare.localStreamRef.current) {
        const localStream = screenShare.localStreamRef.current;
        // Small delay to allow the peer's socket listener to be ready
        setTimeout(async () => {
          webrtc.createPeerConnection();
          webrtc.addLocalStream(localStream);
          await webrtc.createOffer();
        }, 300);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [streamState]),

    onPeerLeft: useCallback((_socketId: string) => {
      toast('Your partner left the room', { icon: '💔' });
      webrtc.closePeerConnection();
      playerRef.current?.setRemoteStream(null);
      // If partner was the streamer, clear stream state
      if (!iAmStreaming) {
        setStreamState(EMPTY_STREAM);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [iAmStreaming]),

    onStreamStarted: useCallback(
      (streamerId: string, hasAudio: boolean, name: string) => {
        setStreamState({
          active: true,
          streamerId,
          streamerName: name,
          hasAudio,
          startedAt: new Date().toISOString(),
        });
        toast(`${name} started streaming`, { icon: '📺' });
      },
      [],
    ),

    onStreamStopped: useCallback(() => {
      setStreamState(EMPTY_STREAM);
      setConnectionError(null);
      webrtc.closePeerConnection();
      playerRef.current?.setRemoteStream(null);
      toast('Stream ended', { icon: '⏹️' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),

    onOffer: useCallback(
      async (offer: RTCSessionDescriptionInit, from: string) => {
        if (import.meta.env.DEV) console.debug('[Streaming] Received offer from', from);
        // Create a fresh peer connection for the viewer
        webrtc.createPeerConnection();
        await webrtc.handleOffer(offer, from);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),

    onAnswer: useCallback(
      async (answer: RTCSessionDescriptionInit, from: string) => {
        if (import.meta.env.DEV) console.debug('[Streaming] Received answer from', from);
        await webrtc.handleAnswer(answer, from);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),

    onIceCandidate: useCallback(
      async (candidate: RTCIceCandidateInit) => {
        await webrtc.handleIceCandidate(candidate);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    ),

    onRoomState: useCallback((state) => {
      // Someone is already streaming when we join — update UI
      // (We'll receive the offer automatically when the streamer sends it,
      // but we need to show the streaming status immediately)
      if (state.streaming) {
        setStreamState({
          active: true,
          streamerId: state.streaming,
          streamerName: state.streamerName,
          hasAudio: state.hasAudio,
          startedAt: state.streamStartedAt,
        });
      }
    }, []),

    onError: useCallback((message: string) => {
      toast.error(message);
    }, []),
  });

  // ── Join room when user is ready ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Small delay to ensure socket is connected before joining
    const timer = setTimeout(() => {
      streamConn.joinRoom();
    }, 100);

    return () => {
      clearTimeout(timer);
      // Full cleanup when navigating away
      screenShare.stopScreenShare();
      webrtc.closePeerConnection();
      streamConn.leaveRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Sync volume/mute to player element ───────────────────────────────
  useEffect(() => {
    playerRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    playerRef.current?.setMuted(isMuted || !streamState.hasAudio);
  }, [isMuted, streamState.hasAudio]);

  // ── Fullscreen API ────────────────────────────────────────────────────
  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (playerRef.current && 'requestFullscreen' in playerRef.current) {
          await playerRef.current.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not supported — no crash, just ignore
    }
  }, []);

  // ── Start streaming ───────────────────────────────────────────────────
  const handleStartStream = useCallback(async () => {
    if (isStarting || iAmStreaming) return;
    setIsStarting(true);
    setConnectionError(null);

    try {
      const stream = await screenShare.startScreenShare();
      if (!stream) {
        // User cancelled picker or permission denied — error state already set
        setIsStarting(false);
        return;
      }

      const hasAudio = stream.getAudioTracks().length > 0;

      // Set our local stream state immediately (streamer sees LIVE right away)
      setStreamState({
        active: true,
        streamerId: 'local',
        streamerName: user?.name || 'You',
        hasAudio,
        startedAt: new Date().toISOString(),
      });

      // Signal to the server (this broadcasts to the viewer)
      streamConn.signalStreamStarted(hasAudio);

      // Show local preview
      playerRef.current?.setLocalStream(stream);

      // Create WebRTC peer connection and add local tracks
      // IMPORTANT: createOffer() is called SEPARATELY after addLocalStream()
      // to avoid the onnegotiationneeded race condition
      webrtc.createPeerConnection();
      webrtc.addLocalStream(stream);

      // Brief microtask delay ensures the PC is fully configured before creating the offer
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      await webrtc.createOffer();

      toast.success('Screen sharing started! Waiting for partner to join…', { icon: '📺' });
    } catch (err) {
      console.error('[Streaming] Start stream error:', err);
      setStreamState(EMPTY_STREAM);
      toast.error('Failed to start screen sharing.');
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, iAmStreaming, screenShare, webrtc, streamConn, user]);

  // ── Stop streaming ────────────────────────────────────────────────────
  const handleStopStream = useCallback(() => {
    screenShare.stopScreenShare();
    playerRef.current?.setLocalStream(null);
    webrtc.closePeerConnection();
    streamConn.signalStreamStopped();
    setStreamState(EMPTY_STREAM);
    setConnectionError(null);
    toast('Stream stopped', { icon: '⏹️' });
  }, [screenShare, webrtc, streamConn]);

  // ── Leave room ────────────────────────────────────────────────────────
  const handleLeaveRoom = useCallback(() => {
    if (iAmStreaming) handleStopStream();
    webrtc.closePeerConnection();
    streamConn.leaveRoom();
    navigate({ to: '/' });
  }, [iAmStreaming, handleStopStream, webrtc, streamConn, navigate]);

  // ── Autoplay resume ────────────────────────────────────────────────────
  const handleAutoplayResume = useCallback(() => {
    setAutoplayBlocked(false);
    playerRef.current?.setMuted(false);
    playerRef.current?.resumePlayback();
  }, []);

  // ── Retry WebRTC connection ────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setConnectionError(null);
    webrtc.closePeerConnection();
    // If we're the viewer, request a fresh offer from the streamer
    if (streamState.active && !iAmStreaming) {
      streamConn.requestStatus();
    }
  }, [webrtc, streamState.active, iAmStreaming, streamConn]);

  const isPartnerOnline = onlineUsers.some((u) => u.userId !== user?.id);

  if (!user) return null;

  return (
    <div
      className={`min-h-screen pt-24 pb-8 px-4 md:px-6 transition-colors duration-500 ${
        isTheaterMode ? 'bg-black/80' : ''
      }`}
    >
      <div className="mx-auto max-w-7xl">

        {/* ── Page header (hidden in theater mode) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`mb-6 transition-all duration-500 ${
            isTheaterMode ? 'opacity-0 pointer-events-none h-0 mb-0 overflow-hidden' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl glass flex items-center justify-center shadow-glow">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary shadow-glow anim-heart-pulse" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gradient">Watch Together</h1>
              <p className="text-sm text-muted-foreground">
                Share your screen privately with your partner
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Screen-share error banner ── */}
        <AnimatePresence>
          {screenShare.state.error && screenShare.state.error !== 'aborted' && (
            <motion.div
              key="share-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 flex items-start gap-3 glass-strong rounded-xl px-4 py-3 border border-destructive/30"
            >
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Screen sharing failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">{screenShare.state.errorMessage}</p>
              </div>
              <button onClick={screenShare.clearError} className="btn-glass-icon" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Autoplay blocked banner ── */}
        <AnimatePresence>
          {autoplayBlocked && (
            <div className="mb-4">
              <AutoplayBanner onResume={handleAutoplayResume} />
            </div>
          )}
        </AnimatePresence>

        {/* ── Main layout: Video column + Sidebar ── */}
        <div
          className={`flex flex-col transition-all duration-500 streaming-container ${
            isTheaterMode ? 'gap-0' : 'lg:flex-row gap-6'
          }`}
        >
          {/* ── Video column ── */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">

            {/* Stream status bar */}
            <StreamStatus
              isActive={streamState.active}
              hasAudio={streamState.hasAudio}
              streamerName={iAmStreaming ? 'You' : streamState.streamerName}
              startedAt={streamState.startedAt}
            />

            {/* Video player */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <StreamPlayer
                ref={playerRef}
                isActive={streamState.active}
                iAmStreaming={iAmStreaming}
                isFullscreen={isFullscreen}
                isTheaterMode={isTheaterMode}
                streamerName={iAmStreaming ? 'You' : streamState.streamerName}
                remoteHasAudio={streamState.hasAudio}
                onAutoplayBlocked={() => setAutoplayBlocked(true)}
              />
            </motion.div>

            {/* Controls bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="glass-card rounded-2xl p-3 md:p-4"
            >
              <StreamControls
                iAmStreaming={iAmStreaming}
                streamActive={streamState.active}
                isMuted={isMuted}
                isFullscreen={isFullscreen}
                isTheaterMode={isTheaterMode}
                isStarting={isStarting}
                volume={volume}
                remoteHasAudio={streamState.hasAudio}
                onStartStream={handleStartStream}
                onStopStream={handleStopStream}
                onToggleMute={() => setIsMuted((m) => !m)}
                onVolumeChange={(v) => setVolume(v)}
                onToggleFullscreen={handleToggleFullscreen}
                onToggleTheaterMode={() => setIsTheaterMode((t) => !t)}
                onLeaveRoom={handleLeaveRoom}
              />
            </motion.div>

            {/* Connection status — mobile (below controls) */}
            <div className={`lg:hidden ${isTheaterMode ? 'hidden' : ''}`}>
              <ConnectionStatus
                state={connectionState}
                error={connectionError}
                onRetry={handleRetry}
              />
            </div>
          </div>

          {/* ── Sidebar (hidden in theater mode) ── */}
          <AnimatePresence>
            {!isTheaterMode && (
              <motion.aside
                key="sidebar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-4 lg:w-72 flex-shrink-0"
              >
                {/* Participant panel */}
                <ParticipantPanel
                  user={user}
                  partner={partner}
                  isPartnerOnline={isPartnerOnline}
                  presence={streamConn.presence}
                  isStreaming={streamState.active}
                  partnerIsStreaming={streamState.active && !iAmStreaming}
                  iAmStreaming={iAmStreaming}
                />

                {/* Connection status — desktop */}
                <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Connection
                  </h3>
                  <ConnectionStatus
                    state={connectionState}
                    error={connectionError}
                    onRetry={handleRetry}
                  />
                </div>

                {/* Empty state card */}
                <AnimatePresence>
                  {!streamState.active && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="glass-card rounded-2xl p-5 flex flex-col items-center gap-4 text-center"
                    >
                      <div className="relative">
                        <div className="h-14 w-14 rounded-2xl glass flex items-center justify-center">
                          <Monitor className="h-7 w-7 text-primary/60" />
                        </div>
                        <Heart className="absolute -bottom-1 -right-1 h-5 w-5 text-primary fill-primary anim-heart-pulse" />
                      </div>
                      <div>
                        <p className="font-display text-base font-bold text-foreground">
                          Watch Together
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Share your screen, watch videos, or listen to music together in private.
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground/60 space-y-1">
                        <p>🖥️ Browser tabs · Windows · Entire screen</p>
                        <p>🎵 System audio where supported</p>
                        <p>🔒 Completely private, just the two of you</p>
                      </div>
                      <button
                        onClick={handleStartStream}
                        disabled={isStarting}
                        className="btn-primary w-full justify-center"
                        aria-label="Start screen sharing"
                      >
                        <Play className="h-4 w-4" />
                        {isStarting ? 'Starting…' : 'Start Streaming'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
