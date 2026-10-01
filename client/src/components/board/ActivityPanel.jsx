import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { History, X } from 'lucide-react';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { IconButton } from '@/components/ui';
import { useProjectActivity } from '@/hooks/queries/activity';
import { isModalOpen } from './keyboard';

function PanelContent({ projectId, projectName, onClose }) {
  const query = useProjectActivity(projectId);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isModalOpen()) return;
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 animate-fade-in bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="project-activity-title"
        className="fixed inset-y-0 right-0 z-40 flex w-full animate-slide-in-right flex-col border-l border-line bg-surface shadow-2xl sm:w-[420px] lg:top-16 dark:shadow-black/50"
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20">
            <History className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="project-activity-title" className="text-sm font-semibold text-fg">
              Project activity
            </h2>
            <p className="truncate text-xs text-fg-muted">
              Live updates in <span className="font-medium">{projectName}</span>
            </p>
          </div>
          <IconButton
            ref={closeButtonRef}
            icon={X}
            label="Close activity"
            size="sm"
            onClick={onClose}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <ActivityFeed
            query={query}
            compact
            emptyTitle="No activity yet"
            emptyDescription="Task changes, comments and assignments in this project will appear here live."
          />
        </div>
      </div>
    </>
  );
}

/**
 * Slide-over with the project's live activity feed. Full screen on phones, a 420px panel beside
 * the board on larger screens (dimmed backdrop below `lg`). Escape or the close button hides it.
 */
export function ActivityPanel({ open, projectId, projectName, onClose }) {
  if (!open) return null;
  return createPortal(
    <PanelContent projectId={projectId} projectName={projectName} onClose={onClose} />,
    document.body,
  );
}
