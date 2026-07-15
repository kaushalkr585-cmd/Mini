import { motion } from 'framer-motion';
import { Eye, Monitor, Radio } from 'lucide-react';
import type { StreamPresence } from '@/hooks/useStreamConnection';

interface ParticipantPanelProps {
  user: { name: string; avatar?: string } | null;
  partner: { name: string; avatar?: string } | null;
  isPartnerOnline: boolean;
  presence: StreamPresence;
  isStreaming: boolean;
  partnerIsStreaming: boolean;
  /** Whether the local user is the one streaming */
  iAmStreaming: boolean;
  className?: string;
}

function Avatar({
  name,
  avatar,
  size = 'md',
  isOnline,
  badge,
}: {
  name?: string;
  avatar?: string;
  size?: 'sm' | 'md';
  isOnline?: boolean;
  badge?: React.ReactNode;
}) {
  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const dotClass = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`relative flex-shrink-0 ${sizeClass}`}>
      <div
        className={`${sizeClass} rounded-full overflow-hidden ring-2 ring-primary/30 bg-gradient-to-br from-primary to-accent`}
      >
        {avatar ? (
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${textClass} font-bold text-white`}>
            {name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
      </div>
      {/* Online indicator */}
      {isOnline !== undefined && (
        <div
          className={`absolute bottom-0 right-0 ${dotClass} rounded-full ring-2 ring-background ${
            isOnline ? 'bg-emerald-400' : 'bg-zinc-500'
          }`}
        />
      )}
      {/* Activity badge */}
      {badge && (
        <div className="absolute -top-1 -right-1">{badge}</div>
      )}
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

export function ParticipantPanel({
  user,
  partner,
  isPartnerOnline,
  presence,
  isStreaming,
  partnerIsStreaming,
  iAmStreaming,
  className = '',
}: ParticipantPanelProps) {
  return (
    <div className={`glass-card rounded-2xl p-4 flex flex-col gap-3 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
        Participants
      </h3>

      {/* You */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <Avatar
          name={user?.name}
          avatar={user?.avatar}
          isOnline={true}
          badge={
            iAmStreaming ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-glow">
                <Monitor className="h-2.5 w-2.5 text-white" />
              </span>
            ) : undefined
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {user?.name || 'You'} <span className="text-xs text-muted-foreground">(you)</span>
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {iAmStreaming ? (
              <StatusBadge label="Streaming" color="bg-primary/20 text-primary" />
            ) : isStreaming ? (
              <StatusBadge label="In Room" color="bg-muted text-muted-foreground" />
            ) : (
              <StatusBadge label="Online" color="bg-emerald-400/15 text-emerald-400" />
            )}
          </div>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="h-px bg-border/50 mx-1" />

      {/* Partner */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-3"
      >
        <Avatar
          name={partner?.name}
          avatar={partner?.avatar}
          isOnline={isPartnerOnline}
          badge={
            partnerIsStreaming ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-glow">
                <Monitor className="h-2.5 w-2.5 text-white" />
              </span>
            ) : presence.partnerInRoom ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/80">
                <Eye className="h-2.5 w-2.5 text-white" />
              </span>
            ) : undefined
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {partner?.name || 'Partner'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {partnerIsStreaming ? (
              <StatusBadge label="Streaming" color="bg-primary/20 text-primary" />
            ) : presence.partnerInRoom ? (
              <StatusBadge label="Watching" color="bg-accent/20 text-accent-foreground" />
            ) : isPartnerOnline ? (
              <StatusBadge label="Online" color="bg-emerald-400/15 text-emerald-400" />
            ) : (
              <StatusBadge label="Offline" color="bg-muted text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Subtle live-presence animation when partner is in room */}
        {presence.partnerInRoom && (
          <div className="flex items-center">
            <Radio className="h-3.5 w-3.5 text-primary anim-heart-pulse" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
