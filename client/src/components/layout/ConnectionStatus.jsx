import { useEffect, useState } from 'react';
import { Tooltip } from '@/components/ui';
import { useSocket } from '@/context/SocketContext';
import { cn } from '@/lib/cn';

/** Grace period before a missing connection is reported as "Offline" (initial connect). */
const CONNECT_GRACE_MS = 2500;

/** Dot colours are the status palette: green (completed), ochre (medium) and stone (to do). */
const STATES = {
  live: {
    label: 'Live',
    hint: 'Connected: changes from your team appear instantly',
    dot: 'bg-[#2F8F5B] shadow-[0_0_0_3px_rgb(47_143_91/0.16)] dark:bg-[#3FA56E]',
  },
  connecting: {
    label: 'Connecting',
    hint: 'Connecting to real-time updates…',
    dot: 'bg-[#C9A227] animate-pulse',
  },
  offline: {
    label: 'Offline',
    hint: 'Real-time updates paused. Reconnecting automatically…',
    dot: 'bg-[#8A857A]',
  },
};

/**
 * "Live" / "Offline" status: a tiny dot and a mono label reflecting the Socket.IO connection
 * (hover for details). Purely informative: not focusable, and the offline banner announces
 * lasting outages.
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
      <span className="inline-flex h-8 cursor-default select-none items-center gap-2 px-1 font-mono text-[11px] uppercase leading-none tracking-[0.08em] text-fg-muted">
        <span
          className={cn('inline-flex h-1.5 w-1.5 shrink-0 rounded-full', styles.dot)}
          aria-hidden="true"
        />
        <span className="sr-only">Real-time updates: </span>
        {styles.label}
      </span>
    </Tooltip>
  );
}
