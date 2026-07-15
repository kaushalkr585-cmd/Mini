import { useRef, useCallback, useEffect } from 'react';
import { getSocket } from '@/lib/socket';

// ── ICE Server Configuration ───────────────────────────────────────────────
// For development: Google's public STUN servers are sufficient on the same
// network. For production across different networks / restrictive NAT, a TURN
// server is strongly recommended.
//
// To add TURN support, set these environment variables:
//   VITE_TURN_SERVER     e.g. "turn:your-turn-server.com:3478"
//   VITE_TURN_USERNAME   your TURN username
//   VITE_TURN_CREDENTIAL your TURN password
//
// NEVER commit TURN credentials to source control.
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
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

export type WebRTCConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

interface UseWebRTCOptions {
  onRemoteStream: (stream: MediaStream) => void;
  onRemoteStreamEnded: () => void;
  onConnectionStateChange: (state: WebRTCConnectionState) => void;
  onError: (error: string) => void;
}

export function useWebRTC(options: UseWebRTCOptions) {
  const { onRemoteStream, onRemoteStreamEnded, onConnectionStateChange, onError } = options;

  // Store all WebRTC objects in refs — never in React state — to avoid
  // triggering re-renders on every ICE candidate or track event.
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerSocketIdRef = useRef<string | null>(null);

  // ICE candidate queue — buffers candidates that arrive before the
  // remote description is set, which is common in fast networks.
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  // ── Stable callback refs (prevent stale closures in PC event handlers) ──
  const onRemoteStreamRef = useRef(onRemoteStream);
  const onRemoteStreamEndedRef = useRef(onRemoteStreamEnded);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  const onErrorRef = useRef(onError);

  useEffect(() => { onRemoteStreamRef.current = onRemoteStream; }, [onRemoteStream]);
  useEffect(() => { onRemoteStreamEndedRef.current = onRemoteStreamEnded; }, [onRemoteStreamEnded]);
  useEffect(() => { onConnectionStateChangeRef.current = onConnectionStateChange; }, [onConnectionStateChange]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // ── Create a fresh RTCPeerConnection ────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    // Close any existing connection before creating a new one
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      // CRITICAL: Set onnegotiationneeded to null immediately to prevent
      // the old handler from firing after we close the connection
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // Clear ICE candidate queue for the new connection
    iceCandidateQueueRef.current = [];
    peerSocketIdRef.current = null;

    const pc = new RTCPeerConnection({
      iceServers: buildIceServers(),
      bundlePolicy: 'max-bundle',
      // Important: disable ICE TCP candidates for faster connection in LAN
      iceCandidatePoolSize: 5,
    });

    // Remote track handler — attach incoming media to the remote video element
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;

      remoteStreamRef.current = stream;
      onRemoteStreamRef.current(stream);

      // Detect when the remote stream tracks end (streamer stopped sharing)
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          const allEnded = stream.getTracks().every((t) => t.readyState === 'ended');
          if (allEnded) onRemoteStreamEndedRef.current();
        };
      });
    };

    // ICE candidate handler — relay candidates to the peer via signaling
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const socket = getSocket();
      socket.emit('stream:ice-candidate', {
        candidate: event.candidate.toJSON(),
        to: peerSocketIdRef.current,
      });
    };

    pc.onicegatheringstatechange = () => {
      if (import.meta.env.DEV) {
        console.debug('[WebRTC] ICE gathering:', pc.iceGatheringState);
      }
    };

    // Connection state → update UI
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (import.meta.env.DEV) {
        console.debug('[WebRTC] Connection state:', state);
      }

      switch (state) {
        case 'connecting':
          onConnectionStateChangeRef.current('connecting');
          break;
        case 'connected':
          onConnectionStateChangeRef.current('connected');
          break;
        case 'disconnected':
          onConnectionStateChangeRef.current('disconnected');
          break;
        case 'failed':
          onConnectionStateChangeRef.current('failed');
          onErrorRef.current('WebRTC connection failed. Check your network and try again.');
          break;
        case 'closed':
          onConnectionStateChangeRef.current('closed');
          break;
      }
    };

    pc.onsignalingstatechange = () => {
      if (import.meta.env.DEV) {
        console.debug('[WebRTC] Signaling state:', pc.signalingState);
      }
    };

    // IMPORTANT: We do NOT use onnegotiationneeded because we call createOffer()
    // manually after adding tracks. Using both causes a race condition where two
    // concurrent setLocalDescription calls produce the "m-lines order" error.
    pc.onnegotiationneeded = null;

    pcRef.current = pc;
    return pc;
  }, []);

  // ── Add local tracks to the peer connection (streamer side) ─────────────
  // NOTE: Do NOT call createOffer() inside this function. Call it separately
  // after addLocalStream() completes, to avoid triggering onnegotiationneeded.
  const addLocalStream = useCallback((stream: MediaStream) => {
    const pc = pcRef.current;
    if (!pc) return;
    stream.getTracks().forEach((track) => {
      if (track.kind === 'video') {
        track.contentHint = 'motion';
      }
      const sender = pc.addTrack(track, stream);

      if (track.kind === 'video') {
        const params = sender.getParameters();
        if (!params.encodings) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = 5000000; // 5 Mbps for high quality 1080p without artifacts
        params.encodings[0].maxFramerate = 30;
        
        // Prioritize framerate over resolution if network drops, minimizing lag
        if ('degradationPreference' in params) {
          params.degradationPreference = 'maintain-framerate';
        }

        try {
          sender.setParameters(params);
        } catch (e) {
          console.warn('[WebRTC] Could not set sender parameters:', e);
        }
      }
    });
    if (import.meta.env.DEV) {
      console.debug('[WebRTC] Local tracks added:', stream.getTracks().length);
    }
  }, []);

  // ── Replace local tracks dynamically (e.g. switching screens) ───────────
  const replaceLocalStream = useCallback(async (newStream: MediaStream) => {
    const pc = pcRef.current;
    if (!pc) return;

    const senders = pc.getSenders();
    
    // Create an array of replaceTrack promises
    const replacePromises = newStream.getTracks().map(async (track) => {
      if (track.kind === 'video') {
        track.contentHint = 'motion';
      }
      
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) {
        await sender.replaceTrack(track);
        
        if (track.kind === 'video') {
          const params = sender.getParameters();
          if (!params.encodings) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 5000000; // 5 Mbps
          params.encodings[0].maxFramerate = 30;
          
          if ('degradationPreference' in params) {
            params.degradationPreference = 'maintain-framerate';
          }

          try {
            sender.setParameters(params);
          } catch (e) {
            console.warn('[WebRTC] Could not set sender parameters on replace:', e);
          }
        }
      } else {
        // If there wasn't a sender for this kind of track, we add it.
        // However, this might require renegotiation, which we want to avoid if possible.
        // For screen sharing, we usually swap video for video, and audio for audio.
        pc.addTrack(track, newStream);
      }
    });

    await Promise.all(replacePromises);
    if (import.meta.env.DEV) {
      console.debug('[WebRTC] Local tracks replaced:', newStream.getTracks().length);
    }
  }, []);

  // ── Create and send a WebRTC SDP offer (streamer initiates) ─────────────
  const createOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) {
      console.error('[WebRTC] createOffer: No peer connection');
      return;
    }

    // Only create an offer from a stable state
    if (pc.signalingState !== 'stable') {
      console.warn('[WebRTC] createOffer: skipping, signalingState =', pc.signalingState);
      return;
    }

    try {
      if (import.meta.env.DEV) console.debug('[WebRTC] Creating offer…');
      const offer = await pc.createOffer({
        offerToReceiveVideo: false, // Streamer only sends, doesn't receive
        offerToReceiveAudio: false,
      });
      await pc.setLocalDescription(offer);
      const socket = getSocket();
      socket.emit('stream:offer', { offer: pc.localDescription });
      if (import.meta.env.DEV) console.debug('[WebRTC] Offer sent');
    } catch (err) {
      console.error('[WebRTC] createOffer error:', err);
      onErrorRef.current('Failed to initiate stream connection.');
    }
  }, []);

  // ── Handle incoming SDP offer (viewer side) ─────────────────────────────
  const handleOffer = useCallback(
    async (offer: RTCSessionDescriptionInit, fromSocketId: string) => {
      const pc = pcRef.current;
      if (!pc) {
        console.error('[WebRTC] handleOffer: No peer connection');
        return;
      }

      peerSocketIdRef.current = fromSocketId;

      try {
        if (import.meta.env.DEV) console.debug('[WebRTC] Handling offer from', fromSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Drain any buffered ICE candidates that arrived before the offer
        const queue = iceCandidateQueueRef.current.splice(0);
        for (const candidate of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Queued ICE candidate error:', e);
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const socket = getSocket();
        socket.emit('stream:answer', {
          answer: pc.localDescription,
          to: fromSocketId,
        });
        if (import.meta.env.DEV) console.debug('[WebRTC] Answer sent');
      } catch (err) {
        console.error('[WebRTC] handleOffer error:', err);
        onErrorRef.current('Failed to process stream connection. Please try again.');
      }
    },
    [],
  );

  // ── Handle incoming SDP answer (streamer side) ───────────────────────────
  const handleAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit, fromSocketId: string) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (pc.signalingState !== 'have-local-offer') {
        console.warn('[WebRTC] handleAnswer: unexpected signalingState:', pc.signalingState);
        return;
      }

      peerSocketIdRef.current = fromSocketId;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        if (import.meta.env.DEV) console.debug('[WebRTC] Remote description set from answer');

        // Drain any buffered ICE candidates
        const queue = iceCandidateQueueRef.current.splice(0);
        for (const candidate of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Queued ICE candidate error:', e);
          }
        }
      } catch (err) {
        console.error('[WebRTC] handleAnswer error:', err);
      }
    },
    [],
  );

  // ── Handle incoming ICE candidate ────────────────────────────────────────
  const handleIceCandidate = useCallback(
    async (candidateInit: RTCIceCandidateInit) => {
      const pc = pcRef.current;
      if (!pc) return;

      // If remote description is not set yet, buffer the candidate
      if (!pc.remoteDescription) {
        iceCandidateQueueRef.current.push(candidateInit);
        if (import.meta.env.DEV) {
          console.debug('[WebRTC] ICE candidate queued (no remote desc yet)');
        }
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        // Silently ignore — can happen with stale candidates from a previous session
        if (import.meta.env.DEV) {
          console.warn('[WebRTC] addIceCandidate error:', err);
        }
      }
    },
    [],
  );

  // ── Clean up the peer connection and all references ──────────────────────
  const closePeerConnection = useCallback(() => {
    iceCandidateQueueRef.current = [];
    peerSocketIdRef.current = null;

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      remoteStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    onConnectionStateChangeRef.current('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePeerConnection();
    };
  }, [closePeerConnection]);

  return {
    pcRef,
    createPeerConnection,
    addLocalStream,
    replaceLocalStream,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closePeerConnection,
  };
}
