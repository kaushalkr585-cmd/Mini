import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls, useAnimation } from "framer-motion";
import {
  Phone, PhoneOff,
  Video, VideoOff,
  Mic, MicOff,
  ShieldAlert,
  MessageSquare,
  Volume2,
  MonitorUp,
  AlarmClock,
  MessageCircle,
} from "lucide-react";
import type { CallState, CallType, IncomingCallInfo } from "@/hooks/useCallWebRTC";

const INCOMING_MODE: 'buttons' | 'slider' = 'slider'; // Toggle this to test different answer modes

/**
 * CallModal
 *
 * Renders a full-screen (mobile) / centered overlay (desktop) call UI.
 * Three distinct states:
 *  1. Ringing (incoming) — Accept / Decline
 *  2. Calling (outgoing) — animated ring + Cancel
 *  3. Connected (active) — video/audio controls + End
 *
 * All animations use GPU-composited transforms only (no layout properties).
 * No internal state — all state comes from useCallWebRTC via props.
 */

interface CallModalProps {
  callState: CallState;
  callType: CallType | null;
  callDuration: number;
  isMuted: boolean;
  isCameraOff: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  incomingCall: IncomingCallInfo | null;
  partnerName: string;
  partnerAvatar?: string;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function CallModal({
  callState,
  callType,
  callDuration,
  isMuted,
  isCameraOff,
  localStream,
  remoteStream,
  incomingCall,
  partnerName,
  partnerAvatar,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleCamera,
}: CallModalProps) {
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const isVisible = callState === 'calling'
    || callState === 'ringing'
    || callState === 'connecting'
    || callState === 'connected'
    || callState === 'ended'
    || callState === 'permission-denied';


  // Attach streams to <video> elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  const isVideo = callType === 'video';
  const displayName = incomingCall?.callerName ?? partnerName;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="call-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-xl"
          />

          {/* Modal */}
          <motion.div
            key="call-modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className={`fixed z-[201] flex items-center justify-center ${
              callState === 'connected' ? 'inset-0' : 'inset-0 p-4 sm:p-8'
            }`}
          >
            <div
              className={`relative w-full overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-white/10 ${
                callState === 'connected'
                  ? 'h-[100dvh] w-full rounded-none'
                  : 'max-w-sm rounded-[32px]'
              }`}
              style={{
                background: callState === 'connected' && isVideo
                  ? '#000'
                  : 'linear-gradient(135deg, rgba(14,8,18,0.95) 0%, rgba(30,12,40,0.95) 100%)',
              }}
            >
              {/* ── Remote Media Stream (Audio/Video) ── */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 pointer-events-none ${
                  isVideo && callState === 'connected' ? 'opacity-100 z-0' : 'opacity-0 -z-10'
                }`}
              />

              {/* ── Overlay gradient for readability ── */}
              {isVideo && callState === 'connected' && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              )}

              {/* ── Main Content ── */}
              {callState === 'connected' ? (
                /* ── FaceTime Style Active Call UI ── */
                <div className="absolute inset-0 z-10 flex flex-col justify-between pt-safe pb-safe">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between w-full p-4 sm:p-6 mt-4">
                    {/* Left: Avatar + Info */}
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 bg-black/50 backdrop-blur-md flex items-center justify-center text-white/50">
                        {partnerAvatar ? (
                          <img src={partnerAvatar} className="h-full w-full object-cover" alt={displayName} />
                        ) : (
                          <span className="text-xl font-bold">{displayName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex flex-col text-left drop-shadow-md">
                        <span className="text-white font-semibold text-lg leading-tight tracking-tight">{displayName}</span>
                        <div className="flex items-center gap-1.5 text-white/90 text-[13px] mt-0.5 font-medium">
                          {isVideo ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                          <span>MINI {isVideo ? 'Video' : 'Audio'}</span>
                          <span className="opacity-50">›</span>
                          <span className="opacity-80 font-mono ml-1">{formatDuration(callDuration)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: End Button */}
                    <button 
                      onClick={onEnd}
                      className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-full font-medium transition-colors shadow-lg text-[15px]"
                    >
                       End
                    </button>
                  </div>

                  {/* Center Avatar (Audio Only) */}
                  {!isVideo && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-40 w-40 sm:h-56 sm:w-56 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-[0_0_60px_rgba(255,79,216,0.15)]"
                      >
                        {partnerAvatar ? (
                          <img src={partnerAvatar} className="h-full w-full object-cover" alt={displayName} />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent text-6xl font-bold text-white">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  )}

                  {/* Local video PiP (video calls only) */}
                  {isVideo && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute bottom-32 right-4 sm:bottom-40 sm:right-8 h-36 w-24 sm:h-48 sm:w-32 overflow-hidden rounded-2xl border-2 border-white/20 shadow-cinema bg-black/50 backdrop-blur-md z-20"
                    >
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`h-full w-full object-cover ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}
                      />
                      {isCameraOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                          <VideoOff className="h-8 w-8 text-white/60" />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Bottom Bar: Controls */}
                  <div className="flex justify-center w-full p-6 pb-8 sm:pb-12 relative z-30 mb-4">
                     <div className="flex items-center gap-3 sm:gap-5 bg-white/10 backdrop-blur-md px-6 py-4 rounded-[2rem] shadow-xl border border-white/10">
                        <FTButton icon={<Volume2 className="h-5 w-5 sm:h-6 sm:w-6" />} color="bg-white/20 text-white" />
                        <FTButton 
                          icon={isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />} 
                          color={isMuted ? "bg-white text-black" : "bg-white/20 text-white"} 
                          onClick={onToggleMute} 
                        />
                        {isVideo && (
                          <FTButton 
                            icon={isCameraOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />} 
                            color={isCameraOff ? "bg-white text-black" : "bg-white/20 text-white"} 
                            onClick={onToggleCamera} 
                          />
                        )}
                     </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex flex-col items-center justify-between p-8 sm:p-12 h-full w-full text-center">
                  
                  {/* ── Top Section: Caller Info ── */}
                  <div className="flex flex-col items-center mt-8 sm:mt-12 w-full gap-2 relative z-20">
                    <div className="flex items-center gap-1.5 text-white/70 text-sm font-medium">
                      <div className="h-1.5 w-1.5 bg-white/70 rounded-full" />
                      <span>mobile</span>
                    </div>
                    
                    <h2 className="text-4xl sm:text-5xl font-light text-white tracking-wide text-center">
                      {displayName}
                    </h2>
                  </div>

                  {/* ── State badge (only if NOT ringing to keep UI clean) ── */}
                  {callState !== 'ringing' && (
                    <div className="flex items-center gap-2 relative z-20 mt-4">
                      <StateBadge state={callState} />
                    </div>
                  )}

                  {/* ── Local video PiP (Ringing/Calling) ── */}
                  {isVideo && (callState === 'calling' || callState === 'ringing') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute top-6 right-6 h-32 w-24 sm:h-40 sm:w-28 overflow-hidden rounded-xl border-2 border-white/20 shadow-cinema bg-black/50 backdrop-blur-md z-30"
                    >
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`h-full w-full object-cover ${isCameraOff ? 'opacity-0' : 'opacity-100'}`}
                      />
                    </motion.div>
                  )}

                  {/* ── Avatar Background Blur ── */}
                  {(callState === 'ringing' || callState === 'calling' || callState === 'connecting') && (
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                      {partnerAvatar ? (
                        <img src={partnerAvatar} className="h-full w-full object-cover blur-[100px]" alt="" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary to-accent blur-[100px]" />
                      )}
                    </div>
                  )}

                  {/* ── Action Area (Bottom) ── */}
                  <div className="flex flex-col items-center w-full gap-8 mb-4 sm:mb-8 relative z-20">
                    {/* Primary Actions */}
                    <div className="flex items-center justify-center gap-16 w-full">
                      {callState === 'ringing' && (
                        /* Unlocked Mode Buttons OR Locked Mode Slider */
                        INCOMING_MODE === 'buttons' ? (
                          <>
                            <div className="flex flex-col items-center gap-3">
                              <button
                                onClick={onDecline}
                                className="flex items-center justify-center h-[72px] w-[72px] sm:h-20 sm:w-20 rounded-full bg-[#FF3B30] hover:bg-[#FF3B30]/90 transition-transform hover:scale-105 active:scale-95 shadow-lg"
                              >
                                <PhoneOff className="h-8 w-8 text-white" />
                              </button>
                              <span className="text-white/90 text-sm font-medium">Decline</span>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                              <button
                                onClick={onAccept}
                                className="flex items-center justify-center h-[72px] w-[72px] sm:h-20 sm:w-20 rounded-full bg-[#34C759] hover:bg-[#34C759]/90 transition-transform hover:scale-105 active:scale-95 shadow-lg"
                              >
                                <Phone className="h-8 w-8 text-white fill-white" />
                              </button>
                              <span className="text-white/90 text-sm font-medium">Accept</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full max-w-[320px]">
                            <SlideToAnswer onAnswer={onAccept} />
                          </div>
                        )
                      )}

                      {(callState === 'calling' || callState === 'connecting') && (
                        <div className="flex flex-col items-center gap-3 mt-12">
                          <button
                            onClick={onEnd}
                            className="flex items-center justify-center h-[72px] w-[72px] sm:h-20 sm:w-20 rounded-full bg-[#FF3B30] hover:bg-[#FF3B30]/90 transition-transform hover:scale-105 active:scale-95 shadow-lg"
                          >
                            <PhoneOff className="h-8 w-8 text-white" />
                          </button>
                          <span className="text-white/90 text-sm font-medium">Cancel</span>
                        </div>
                      )}

                      {callState === 'ended' && (
                        <p className="text-white/60 text-sm font-medium mt-12">Call ended</p>
                      )}

                      {callState === 'permission-denied' && (
                        <div className="flex flex-col items-center gap-3 text-center max-w-xs mt-12">
                          <div className="h-14 w-14 rounded-full bg-red-500/20 flex items-center justify-center">
                            <ShieldAlert className="h-7 w-7 text-red-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-white text-base mb-1">
                              Permission Denied
                            </p>
                            <p className="text-white/60 text-xs leading-relaxed">
                              Click the 🔒 icon in your browser's address bar, then allow <strong>Camera</strong> and <strong>Microphone</strong> access. Then try calling again.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StateBadge({ state }: { state: CallState }) {
  const configs: Record<string, { label: string; dot: string }> = {
    calling:            { label: 'Calling…',         dot: 'bg-yellow-400 animate-pulse' },
    ringing:            { label: 'Incoming call',     dot: 'bg-emerald-400 animate-pulse' },
    connecting:         { label: 'Connecting…',      dot: 'bg-yellow-400 animate-pulse' },
    connected:          { label: 'Connected',         dot: 'bg-emerald-400' },
    ended:              { label: 'Call ended',        dot: 'bg-white/40' },
    'permission-denied':{ label: 'Permission denied', dot: 'bg-red-400' },
  };

  const cfg = configs[state];
  if (!cfg) return null;
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1">
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      <span className="text-xs font-medium text-white/80">{cfg.label}</span>
    </div>
  );
}

interface CallButtonProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  small?: boolean;
}

function CallButton({ icon, label, color, onClick, small }: CallButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-colors ${color} rounded-full ${small ? 'p-3' : 'p-4'} text-white shadow-lg`}
      aria-label={label}
    >
      {icon}
      <span className="text-[10px] font-medium opacity-80">{label}</span>
    </motion.button>
  );
}

function FTButton({ icon, color, onClick }: { icon: React.ReactNode, color: string, onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full transition-colors ${color} shadow-lg shrink-0`}
    >
      {icon}
    </motion.button>
  );
}

function SlideToAnswer({ onAnswer }: { onAnswer: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const animation = useAnimation();
  const [answered, setAnswered] = useState(false);

  const handleDragEnd = (event: any, info: any) => {
    if (answered) return;
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const triggerThreshold = containerWidth * 0.70; // Accept if dragged 70% of the way

    if (info.offset.x >= triggerThreshold) {
      setAnswered(true);
      onAnswer();
    } else {
      animation.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center h-20 rounded-full bg-white/20 backdrop-blur-md overflow-hidden shadow-inner w-full touch-none"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white/80 font-medium text-[17px] tracking-wide ml-12 animate-pulse">
          slide to answer
        </span>
      </div>
      
      <motion.div
        drag="x"
        dragControls={dragControls}
        dragConstraints={containerRef}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={animation}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10 flex items-center justify-center h-[68px] w-[68px] ml-[6px] rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] cursor-grab active:cursor-grabbing"
      >
        <Phone className="h-7 w-7 text-[#34C759] fill-[#34C759]" />
      </motion.div>
    </div>
  );
}
