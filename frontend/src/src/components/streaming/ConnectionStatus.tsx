import { Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';
import type { WebRTCConnectionState } from '@/hooks/useWebRTC';

interface ConnectionStatusProps {
  state: WebRTCConnectionState;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

const stateConfig: Record<
  WebRTCConnectionState,
  { icon: typeof Wifi; label: string; color: string; pulse?: boolean }
> = {
  idle: {
    icon: Wifi,
    label: 'Ready',
    color: 'text-muted-foreground',
  },
  connecting: {
    icon: Loader2,
    label: 'Connecting…',
    color: 'text-primary',
    pulse: true,
  },
  connected: {
    icon: Wifi,
    label: 'Connected',
    color: 'text-emerald-400',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'text-amber-400',
    pulse: true,
  },
  failed: {
    icon: AlertTriangle,
    label: 'Connection failed',
    color: 'text-destructive',
  },
  closed: {
    icon: WifiOff,
    label: 'Closed',
    color: 'text-muted-foreground',
  },
};

export function ConnectionStatus({ state, error, onRetry, className = '' }: ConnectionStatusProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
        <Icon
          className={`h-3.5 w-3.5 ${config.pulse ? 'animate-spin' : ''}`}
          style={config.pulse && state !== 'connecting' ? { animation: 'pulse 1.5s ease-in-out infinite' } : undefined}
        />
        <span>{config.label}</span>
      </div>

      {error && state === 'failed' && (
        <div className="flex flex-col items-center gap-1.5 mt-1">
          <p className="text-xs text-muted-foreground text-center max-w-xs">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn-glass text-xs px-3 py-1.5 rounded-lg"
              aria-label="Retry connection"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
