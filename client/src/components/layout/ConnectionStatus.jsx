import { useEffect, useState } from 'react';
import { Tooltip } from '@/components/ui';
import { useSocket } from '@/context/SocketContext';
import { cn } from '@/lib/cn';

/** Grace period before a missing connection is reported as "Offline" (initial connect). */
const CONNECT_GRACE_MS = 2500;

const STATES = {
  live: {
    label: 'Live',
    hint: 'Connected: changes from your team appear instantly',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    dot: 'bg-emerald-500',
  },
  connecting: {
    label: 'Connecting',
    hint: 'Connecting to real-time updates…',
    pill: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
    dot: 'bg-amber-500 animate-pulse',
  },
  offline: {
    label: 'Offline',
    hint: 'Real-time updates paused. Reconnecting automatically…',
    pill: 'bg-surface-muted text-fg-muted ring-line',
    dot: 'bg-slate-400',
  },
};

/**
 * "Live" / "Offline" pill reflecting the Socket.IO connection (hover for details). Purely
 * informative: not focusable, and the offline banner announces lasting outages.
 */
export function ConnectionStatus({ className }) {
  const { isConnected } = useSocket();
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setGraceOver(true), CONNECT_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const state = isConnected ? 'live' : graceOver ? 'offline' : 'connecting';
  const styles = STATES[state];

  return (
    <Tooltip content={styles.hint} side="bottom" align="end" className={className}>
      <span
        className={cn(
          'inline-flex h-7 cursor-default items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset',
          styles.pill,
        )}
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {state === 'live' && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', styles.dot)} />
        </span>
        <span className="sr-only">Real-time updates: </span>
        {styles.label}
      </span>
    </Tooltip>
  );
}
