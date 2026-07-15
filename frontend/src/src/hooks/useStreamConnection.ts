import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

export interface StreamRoomState {
  /** Number of peers currently in the room */
  peersInRoom: number;
  /** Socket ID of the active streamer, null if nobody is streaming */
  streaming: string | null;
  /** ISO string when stream started */
  streamStartedAt: string | null;
  /** Whether the active stream has audio */
  hasAudio: boolean;
  /** Human-readable name of the streamer */
  streamerName: string | null;
}

export interface StreamPresence {
  partnerInRoom: boolean;
  partnerSocketId: string | null;
  partnerName: string | null;
}

interface UseStreamConnectionOptions {
  onPeerJoined: (socketId: string, name: string) => void;
  onPeerLeft: (socketId: string) => void;
  onStreamStarted: (streamerId: string, hasAudio: boolean, name: string) => void;
  onStreamStopped: () => void;
  onOffer: (offer: RTCSessionDescriptionInit, from: string) => void;
  onAnswer: (answer: RTCSessionDescriptionInit, from: string) => void;
  onIceCandidate: (candidate: RTCIceCandidateInit, from: string) => void;
  onRoomState: (state: StreamRoomState) => void;
  onError: (message: string) => void;
}

/**
 * Manages Socket.IO-based presence and signaling for the streaming room.
 *
 * Responsibilities:
 * - Joining and leaving the private streaming room
 * - Receiving room state on join (current stream status)
 * - Relaying WebRTC signaling events (offer/answer/ICE) to/from the peer
 * - Partner presence tracking
 * - Reconnection: on socket reconnect, re-joins the room and requests status
 * - Properly removes all listeners on unmount
 */
export function useStreamConnection(options: UseStreamConnectionOptions) {
  const {
    onPeerJoined,
    onPeerLeft,
    onStreamStarted,
    onStreamStopped,
    onOffer,
    onAnswer,
    onIceCandidate,
    onRoomState,
    onError,
  } = options;

  const user = useAuthStore((s) => s.user);

  const [inRoom, setInRoom] = useState(false);
  const [presence, setPresence] = useState<StreamPresence>({
    partnerInRoom: false,
    partnerSocketId: null,
    partnerName: null,
  });

  // Use a ref to track inRoom inside socket callbacks (avoids stale closure)
  const inRoomRef = useRef(false);

  // ── Stable option refs — avoids stale callbacks in socket listeners ─────
  const onPeerJoinedRef = useRef(onPeerJoined);
  const onPeerLeftRef = useRef(onPeerLeft);
  const onStreamStartedRef = useRef(onStreamStarted);
  const onStreamStoppedRef = useRef(onStreamStopped);
  const onOfferRef = useRef(onOffer);
  const onAnswerRef = useRef(onAnswer);
  const onIceCandidateRef = useRef(onIceCandidate);
  const onRoomStateRef = useRef(onRoomState);
  const onErrorRef = useRef(onError);

  useEffect(() => { onPeerJoinedRef.current = onPeerJoined; }, [onPeerJoined]);
  useEffect(() => { onPeerLeftRef.current = onPeerLeft; }, [onPeerLeft]);
  useEffect(() => { onStreamStartedRef.current = onStreamStarted; }, [onStreamStarted]);
  useEffect(() => { onStreamStoppedRef.current = onStreamStopped; }, [onStreamStopped]);
  useEffect(() => { onOfferRef.current = onOffer; }, [onOffer]);
  useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);
  useEffect(() => { onIceCandidateRef.current = onIceCandidate; }, [onIceCandidate]);
  useEffect(() => { onRoomStateRef.current = onRoomState; }, [onRoomState]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // ── Join the streaming room ─────────────────────────────────────────────
  const joinRoom = useCallback(() => {
    if (!user) return;
    inRoomRef.current = true;
    setInRoom(true);

    const socket = getSocket();
    if (socket.connected) {
      socket.emit('stream:join', { userId: user.id });
    }
  }, [user]);

  // ── Leave the streaming room ────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit('stream:leave');
    inRoomRef.current = false;
    setInRoom(false);
    setPresence({ partnerInRoom: false, partnerSocketId: null, partnerName: null });
  }, []);

  // ── Signal that this user started streaming ─────────────────────────────
  const signalStreamStarted = useCallback((hasAudio: boolean) => {
    const socket = getSocket();
    socket.emit('stream:started', { hasAudio });
  }, []);

  // ── Signal that this user stopped streaming ─────────────────────────────
  const signalStreamStopped = useCallback(() => {
    const socket = getSocket();
    socket.emit('stream:stopped');
  }, []);

  // ── Request current room state (e.g., after reconnection) ───────────────
  const requestStatus = useCallback(() => {
    const socket = getSocket();
    socket.emit('stream:request-status');
  }, []);

  // ── Register socket event listeners ────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handlePeerJoined = ({ socketId, name }: { socketId: string; name: string }) => {
      setPresence({ partnerInRoom: true, partnerSocketId: socketId, partnerName: name });
      onPeerJoinedRef.current(socketId, name);
    };

    const handlePeerLeft = ({ socketId }: { socketId: string }) => {
      setPresence({ partnerInRoom: false, partnerSocketId: null, partnerName: null });
      onPeerLeftRef.current(socketId);
    };

    const handleStreamStarted = ({
      streamerId,
      hasAudio,
      streamerName,
    }: {
      streamerId: string;
      hasAudio: boolean;
      streamerName: string;
    }) => {
      onStreamStartedRef.current(streamerId, hasAudio, streamerName);
    };

    const handleStreamStopped = () => {
      onStreamStoppedRef.current();
    };

    const handleOffer = ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      // Track the peer's socket ID for targeted ICE candidate relay
      setPresence((prev) => ({ ...prev, partnerSocketId: from }));
      onOfferRef.current(offer, from);
    };

    const handleAnswer = ({
      answer,
      from,
    }: {
      answer: RTCSessionDescriptionInit;
      from: string;
    }) => {
      onAnswerRef.current(answer, from);
    };

    const handleIceCandidate = ({
      candidate,
      from,
    }: {
      candidate: RTCIceCandidateInit;
      from: string;
    }) => {
      onIceCandidateRef.current(candidate, from);
    };

    const handleRoomState = (state: StreamRoomState) => {
      onRoomStateRef.current(state);
      if (state.peersInRoom > 1) {
        // At least one other peer is in the room (but we don't have their details here)
        setPresence((prev) => ({ ...prev, partnerInRoom: true }));
      }
    };

    const handleError = ({ message }: { message: string }) => {
      onErrorRef.current(message);
    };

    // Reconnection: rejoin room automatically if socket reconnects while we're on the streaming page
    const handleConnect = () => {
      if (inRoomRef.current && user) {
        socket.emit('stream:join', { userId: user.id });
        socket.emit('stream:request-status');
      }
    };

    socket.on('stream:peer-joined', handlePeerJoined);
    socket.on('stream:peer-left', handlePeerLeft);
    socket.on('stream:started', handleStreamStarted);
    socket.on('stream:stopped', handleStreamStopped);
    socket.on('stream:offer', handleOffer);
    socket.on('stream:answer', handleAnswer);
    socket.on('stream:ice-candidate', handleIceCandidate);
    socket.on('stream:room-state', handleRoomState);
    socket.on('stream:error', handleError);
    socket.on('connect', handleConnect);

    return () => {
      // Precise cleanup — only remove the handlers we registered
      socket.off('stream:peer-joined', handlePeerJoined);
      socket.off('stream:peer-left', handlePeerLeft);
      socket.off('stream:started', handleStreamStarted);
      socket.off('stream:stopped', handleStreamStopped);
      socket.off('stream:offer', handleOffer);
      socket.off('stream:answer', handleAnswer);
      socket.off('stream:ice-candidate', handleIceCandidate);
      socket.off('stream:room-state', handleRoomState);
      socket.off('stream:error', handleError);
      socket.off('connect', handleConnect);
    };
  }, [user]);

  return {
    inRoom,
    presence,
    joinRoom,
    leaveRoom,
    signalStreamStarted,
    signalStreamStopped,
    requestStatus,
  };
}
