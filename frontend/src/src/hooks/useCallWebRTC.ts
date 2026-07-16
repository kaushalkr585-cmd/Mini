import { useRef, useCallback, useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';


// ── ICE Server Configuration ─────────────────────────────────────────────────
// Reads TURN credentials from environment variables.
// For development on the same LAN, the STUN servers are sufficient.
// For production across different networks, set VITE_TURN_SERVER etc.
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const turnServer = import.meta.env.VITE_TURN_SERVER as string | undefined;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

  if (turnServer && turnUsername && turnCredential) {
    servers.push({
      urls: turnServer,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export type CallState =
  | 'idle'
  | 'calling'           // outgoing — waiting for partner to pick up
  | 'ringing'           // incoming — showing accept/decline UI
  | 'connecting'        // both accepted — establishing WebRTC
  | 'connected'         // media flowing
  | 'ended'             // call finished
  | 'permission-denied'; // camera/mic blocked by browser


export type CallType = 'voice' | 'video';

export interface IncomingCallInfo {
  from: string;        // partner socket ID
  callerName: string;
  callType: CallType;
}

export interface UseCallWebRTCReturn {
  callState: CallState;
  callType: CallType | null;
  callDuration: number;          // seconds since connected
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingCall: IncomingCallInfo | null;
  partnerSocketId: string | null;
  startCall: (callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

export function useCallWebRTC(): UseCallWebRTCReturn {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // All WebRTC objects in refs — never triggers re-renders
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const partnerSocketIdRef = useRef<string | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCallTypeRef = useRef<CallType | null>(null);

  // ── Helper: Clean up all call resources ──────────────────────────────────
  const cleanup = useCallback(() => {
    // Stop duration timer
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // Stop all remote media tracks
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(t => t.stop());
      remoteStreamRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    iceCandidateQueueRef.current = [];
    partnerSocketIdRef.current = null;
    pendingCallTypeRef.current = null;

    setLocalStream(null);
    setRemoteStream(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  // ── Helper: Get local media stream ───────────────────────────────────────
  const getLocalMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  }, []);

  // ── Helper: Create RTCPeerConnection ─────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    iceCandidateQueueRef.current = [];

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(),
      bundlePolicy: 'max-bundle',
      iceCandidatePoolSize: 5,
    });

    // Remote track handler — both sides send and receive
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };

    // ICE candidate handler — relay via socket
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const socket = getSocket();
      socket.emit('call:ice-candidate', {
        candidate: event.candidate.toJSON(),
        to: partnerSocketIdRef.current,
      });
    };

    // Connection state tracking
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (import.meta.env.DEV) {
        console.debug('[Call WebRTC] Connection state:', state);
      }
      if (state === 'connected') {
        setCallState('connected');
        // Start duration timer
        let seconds = 0;
        durationTimerRef.current = setInterval(() => {
          seconds++;
          setCallDuration(seconds);
        }, 1000);
      } else if (state === 'failed' || state === 'closed') {
        endCall();
      } else if (state === 'disconnected') {
        // Brief grace period before giving up
        setTimeout(() => {
          if (pcRef.current?.connectionState === 'disconnected') {
            endCall();
          }
        }, 5000);
      }
    };

    // Suppress auto-negotiation to avoid the m-lines order error
    pc.onnegotiationneeded = null;

    pcRef.current = pc;
    return pc;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: Drain buffered ICE candidates ────────────────────────────────
  const drainIceQueue = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queue = iceCandidateQueueRef.current.splice(0);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[Call WebRTC] Queued ICE error:', e);
      }
    }
  }, []);

  // ── Public: Start outgoing call ──────────────────────────────────────────
  const startCall = useCallback(async (type: CallType) => {
    // First check if media devices are available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Your browser does not support audio/video calls.');
      return;
    }

    try {
      setCallType(type);
      pendingCallTypeRef.current = type;
      setCallState('calling');

      const stream = await getLocalMedia(type);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const socket = getSocket();
      socket.emit('call:invite', { callType: type });
    } catch (err: any) {
      console.error('[Call] Failed to get media:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        // Show a friendly permission denied state instead of alert
        setCallState('permission-denied');
        toast.error(
          type === 'video'
            ? '🎥 Camera & microphone blocked. Click the 🔒 icon in your address bar to allow access.'
            : '🎤 Microphone blocked. Click the 🔒 icon in your address bar to allow access.',
          { duration: 6000 }
        );
        // Auto-reset after showing the error state briefly
        setTimeout(() => {
          setCallState('idle');
          setCallType(null);
        }, 3000);
      } else if (err.name === 'NotFoundError') {
        setCallState('idle');
        setCallType(null);
        toast.error(type === 'video'
          ? 'No camera or microphone found on this device.'
          : 'No microphone found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCallState('idle');
        setCallType(null);
        toast.error('Camera or microphone is already in use by another application.');
      } else {
        setCallState('idle');
        setCallType(null);
        toast.error('Failed to start call. Please try again.');
      }
    }
  }, [getLocalMedia]);


  // ── Public: Accept incoming call ─────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const { from, callType: type } = incomingCall;

    try {
      partnerSocketIdRef.current = from;
      setCallType(type);
      setCallState('connecting');

      const stream = await getLocalMedia(type);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection();

      // Add all local tracks to the peer connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const socket = getSocket();
      socket.emit('call:accept', { to: from });
      setIncomingCall(null);
    } catch (err: any) {
      console.error('[Call] Failed to accept call:', err);
      // Decline the call cleanly — can't proceed without media
      const socket = getSocket();
      socket.emit('call:decline', { to: from });
      setIncomingCall(null);
      setCallState('idle');
      setCallType(null);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error(
          type === 'video'
            ? '🎥 Camera & microphone blocked. Allow access to accept calls.'
            : '🎤 Microphone blocked. Allow access to accept calls.',
          { duration: 5000 }
        );
      } else if (err.name === 'NotFoundError') {
        toast.error(type === 'video'
          ? 'No camera or microphone found on this device.'
          : 'No microphone found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error('Camera or microphone is already in use by another application.');
      } else {
        toast.error('Failed to connect. Please try again.');
      }
    }
  }, [incomingCall, getLocalMedia, createPeerConnection]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Public: Decline incoming call ───────────────────────────────────────
  const declineCall = useCallback(() => {
    if (!incomingCall) return;
    const socket = getSocket();
    socket.emit('call:decline', { to: incomingCall.from });
    setIncomingCall(null);
    setCallState('idle');
  }, [incomingCall]);

  // ── Public: End active call ──────────────────────────────────────────────
  const endCall = useCallback(() => {
    const socket = getSocket();
    if (partnerSocketIdRef.current) {
      socket.emit('call:end', { to: partnerSocketIdRef.current });
    }
    cleanup();
    setCallState('ended');
    setCallType(null);
    // Return to idle after brief "ended" state so UI can show end animation
    setTimeout(() => setCallState('idle'), 1500);
  }, [cleanup]);

  // ── Public: Toggle microphone ────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    audioTracks.forEach(track => { track.enabled = !track.enabled; });
    setIsMuted(prev => !prev);
  }, []);

  // ── Public: Toggle camera ────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach(track => { track.enabled = !track.enabled; });
    setIsCameraOff(prev => !prev);
  }, []);

  // ── Socket event listeners ───────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    // Partner accepted our outgoing call — now create offer
    const handleAccepted = async ({ from }: { from: string }) => {
      partnerSocketIdRef.current = from;
      setCallState('connecting');

      const type = pendingCallTypeRef.current ?? 'voice';
      const pc = createPeerConnection();

      // Add local tracks (already acquired in startCall)
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === 'video',
        });
        await pc.setLocalDescription(offer);
        socket.emit('call:offer', { offer: pc.localDescription, to: from });
        if (import.meta.env.DEV) console.debug('[Call WebRTC] Offer sent to', from);
      } catch (err) {
        console.error('[Call WebRTC] createOffer error:', err);
        endCall();
      }
    };

    // We received a call offer (callee side after accepting)
    const handleOffer = async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      const pc = pcRef.current;
      if (!pc) return;
      partnerSocketIdRef.current = from;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceQueue();

        const type = callType ?? 'voice';
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:answer', { answer: pc.localDescription, to: from });
        if (import.meta.env.DEV) console.debug('[Call WebRTC] Answer sent');
      } catch (err) {
        console.error('[Call WebRTC] handleOffer error:', err);
        endCall();
      }
    };

    // We received an answer to our offer (caller side)
    const handleAnswer = async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (pc.signalingState !== 'have-local-offer') {
        if (import.meta.env.DEV) {
          console.warn('[Call WebRTC] handleAnswer: unexpected signalingState:', pc.signalingState);
        }
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        partnerSocketIdRef.current = from;
        await drainIceQueue();
      } catch (err) {
        console.error('[Call WebRTC] handleAnswer error:', err);
      }
    };

    // Received ICE candidate
    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (!pc.remoteDescription) {
        iceCandidateQueueRef.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Call WebRTC] addIceCandidate error:', err);
      }
    };

    // Partner called us
    const handleInvite = ({ from, callerName, callType: type }: {
      from: string; callerName: string; callType: CallType;
    }) => {
      // If we're already in a call, auto-decline
      if (callState !== 'idle') {
        socket.emit('call:decline', { to: from });
        return;
      }
      setIncomingCall({ from, callerName, callType: type });
      setCallState('ringing');
    };

    // Partner declined our call
    const handleDeclined = () => {
      cleanup();
      setCallState('ended');
      setCallType(null);
      setTimeout(() => setCallState('idle'), 1500);
    };

    // Call ended by partner
    const handleEnded = () => {
      cleanup();
      setCallState('ended');
      setCallType(null);
      setTimeout(() => setCallState('idle'), 1500);
    };

    // Partner is busy / offline
    const handleBusy = () => {
      cleanup();
      setCallState('idle');
      setCallType(null);
    };

    const handleNoAnswer = () => {
      cleanup();
      setCallState('idle');
      setCallType(null);
    };

    socket.on('call:accepted',      handleAccepted);
    socket.on('call:offer',         handleOffer);
    socket.on('call:answer',        handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:invite',        handleInvite);
    socket.on('call:declined',      handleDeclined);
    socket.on('call:ended',         handleEnded);
    socket.on('call:busy',          handleBusy);
    socket.on('call:no-answer',     handleNoAnswer);

    return () => {
      socket.off('call:accepted',      handleAccepted);
      socket.off('call:offer',         handleOffer);
      socket.off('call:answer',        handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:invite',        handleInvite);
      socket.off('call:declined',      handleDeclined);
      socket.off('call:ended',         handleEnded);
      socket.off('call:busy',          handleBusy);
      socket.off('call:no-answer',     handleNoAnswer);
    };
  }, [callState, callType, createPeerConnection, drainIceQueue, endCall, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    callType,
    callDuration,
    isMuted,
    isCameraOff,
    localStream,
    remoteStream,
    incomingCall,
    partnerSocketId: partnerSocketIdRef.current,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
