import {
  Monitor,
  MonitorOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  LayoutTemplate,
  LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { StreamResolution } from '@/hooks/useScreenShare';

interface StreamControlsProps {
  /** Whether the local user is the active streamer */
  iAmStreaming: boolean;
  /** Whether any stream is currently active */
  streamActive: boolean;
  /** Whether local video playback is muted */
  isMuted: boolean;
  /** Whether we are in fullscreen */
  isFullscreen: boolean;
  /** Whether theater mode is active */
  isTheaterMode: boolean;
  /** Is screen-share start in progress */
  isStarting: boolean;
  /** Volume 0–1 */
  volume: number;
  /** Whether the remote/local stream has an audio track */
  remoteHasAudio: boolean;
  /** Currently selected resolution */
  selectedResolution: StreamResolution;
  onResolutionChange: (res: StreamResolution) => void;
  onStartStream: () => void;
  onStopStream: () => void;
  onSwitchScreen: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onToggleFullscreen: () => void;
  onToggleTheaterMode: () => void;
  onLeaveRoom: () => void;
  className?: string;
}

interface ControlButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  active?: boolean;
}

function ControlButton({
  onClick,
  icon,
  label,
  variant = 'default',
  disabled = false,
  active = false,
}: ControlButtonProps) {
  const baseClass = {
    default: `btn-glass-icon ${active ? 'bg-primary/20 text-primary' : ''}`,
    primary: 'btn-primary rounded-xl px-4 py-2 text-sm gap-2',
    danger: 'btn-glass-icon hover:bg-destructive/20 hover:text-destructive',
  }[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.93 }}
    >
      {icon}
      {variant === 'primary' && <span>{label}</span>}
    </motion.button>
  );
}

export function StreamControls({
  iAmStreaming,
  streamActive,
  isMuted,
  isFullscreen,
  isTheaterMode,
  isStarting,
  volume,
  remoteHasAudio,
  selectedResolution,
  onResolutionChange,
  onStartStream,
  onStopStream,
  onSwitchScreen,
  onToggleMute,
  onVolumeChange,
  onToggleFullscreen,
  onToggleTheaterMode,
  onLeaveRoom,
  className = '',
}: StreamControlsProps) {
  // Effective mute: either user muted OR no audio in stream
  const effectivelyMuted = isMuted || !remoteHasAudio;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="toolbar"
      aria-label="Stream controls"
    >
      {/* ── Start / Stop stream (left side) ── */}
      {iAmStreaming ? (
        <div className="flex items-center gap-2">
          <ControlButton
            onClick={onStopStream}
            icon={<MonitorOff className="h-4 w-4" />}
            label="Stop Streaming"
            variant="danger"
          />
          <ControlButton
            onClick={onSwitchScreen}
            disabled={isStarting}
            icon={<Monitor className="h-4 w-4" />}
            label={isStarting ? 'Switching…' : 'Switch Screen'}
            variant="default"
          />
          <select
            value={selectedResolution}
            onChange={(e) => onResolutionChange(e.target.value as StreamResolution)}
            className="bg-transparent border border-border/30 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer appearance-none"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            title="Stream Resolution"
          >
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
            <option value="360p">360p</option>
          </select>
        </div>
      ) : !streamActive ? (
        <div className="flex items-center gap-2">
          <ControlButton
            onClick={onStartStream}
            disabled={isStarting}
            icon={<Monitor className="h-4 w-4" />}
            label={isStarting ? 'Starting…' : 'Start Streaming'}
            variant="primary"
          />
          <select
            value={selectedResolution}
            onChange={(e) => onResolutionChange(e.target.value as StreamResolution)}
            className="bg-transparent border border-border/30 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer appearance-none"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
            title="Stream Resolution"
          >
            <option value="1080p">1080p</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
            <option value="360p">360p</option>
          </select>
        </div>
      ) : null}

      {/* ── Volume / Mute — visible for EVERYONE when stream is active ── */}
      {streamActive && (
        <div className="flex items-center gap-2">
          {/* Mute toggle */}
          <motion.button
            onClick={onToggleMute}
            disabled={!remoteHasAudio && !iAmStreaming}
            className={`btn-glass-icon transition-all ${
              !remoteHasAudio && !iAmStreaming ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            aria-label={effectivelyMuted ? 'Unmute' : 'Mute'}
            title={
              !remoteHasAudio
                ? 'No audio in this stream'
                : effectivelyMuted
                ? 'Unmute audio'
                : 'Mute audio'
            }
            whileTap={{ scale: 0.93 }}
          >
            {effectivelyMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4 text-primary" />
            )}
          </motion.button>

          {/* Volume slider — only when audio exists and not muted */}
          {remoteHasAudio && !isMuted && (
            <div className="flex items-center gap-1.5 px-1">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="video-volume-slider w-20 sm:w-28"
                aria-label="Volume"
              />
              <span className="text-xs text-muted-foreground w-7 text-right tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}

          {/* Audio availability hint */}
          {!remoteHasAudio && (
            <span className="text-xs text-muted-foreground/60 hidden sm:inline">
              No audio
            </span>
          )}
        </div>
      )}

      {/* ── Layout controls (right side) ── */}
      <div className="flex items-center gap-1 ml-auto">
        <ControlButton
          onClick={onToggleTheaterMode}
          icon={<LayoutTemplate className="h-4 w-4" />}
          label={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
          active={isTheaterMode}
        />
        <ControlButton
          onClick={onToggleFullscreen}
          icon={
            isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )
          }
          label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        />
        <ControlButton
          onClick={onLeaveRoom}
          icon={<LogOut className="h-4 w-4" />}
          label="Leave Room"
          variant="danger"
        />
      </div>
    </motion.div>
  );
}
