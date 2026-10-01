import { useEffect, useState, useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';

/** Short blips (a server restart, switching networks) reconnect before the notice appears. */
const OFFLINE_NOTICE_DELAY_MS = 5000;

function subscribeToNetwork(onChange) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

const getBrowserOnline = () => navigator.onLine;

/**
 * Thin paper bar under the top bar (ochre status dot, ink lead-in) once real-time updates have
 * been unavailable for a few seconds (no network, or the server is unreachable). Hides as soon as
 * the connection is live.
 */
export function OfflineBanner() {
  const { isConnected } = useSocket();
  const browserOnline = useSyncExternalStore(subscribeToNetwork, getBrowserOnline, () => true);
  const disconnected = !isConnected || !browserOnline;
  const [noticeDue, setNoticeDue] = useState(false);

  useEffect(() => {
    if (!disconnected) {
      setNoticeDue(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setNoticeDue(true), OFFLINE_NOTICE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [disconnected]);

  // The live region stays mounted so screen readers announce the notice when it appears.
  return (
    <div role="status" aria-live="polite" className="shrink-0">
      {disconnected && noticeDue && (
        <p className="flex animate-fade-in items-center justify-center gap-2.5 border-b border-line bg-surface-muted px-4 py-2 text-center text-xs text-fg-muted">
          <span className="relative flex shrink-0" aria-hidden="true">
            <WifiOff className="h-3.5 w-3.5 text-fg-muted" strokeWidth={2} />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#C9A227] ring-2 ring-surface-muted" />
          </span>
          <span>
            <span className="font-medium text-fg">
              {browserOnline ? 'Live updates are paused.' : 'You’re offline.'}
            </span>{' '}
            Reconnecting automatically; your team’s changes will appear once you’re back.
          </span>
        </p>
      )}
    </div>
  );
}
