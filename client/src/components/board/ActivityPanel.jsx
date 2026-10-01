import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
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
        className="fixed inset-0 z-40 animate-fade-in bg-black/30 lg:hidden dark:bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="project-activity-title"
        className="fixed inset-y-0 right-0 z-40 flex w-full animate-slide-in-right flex-col border-l border-line bg-surface shadow-xl sm:w-[420px] lg:top-14 dark:shadow-black/60"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-line px-6 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-done" aria-hidden="true" />
              <span className="truncate">Live · {projectName}</span>
            </p>
            <h2
              id="project-activity-title"
              className="mt-1.5 font-display text-[26px] font-normal leading-[1.1] tracking-[-0.01em] text-fg"
            >
              Project activity
            </h2>
          </div>
          <IconButton
            ref={closeButtonRef}
            icon={X}
            label="Close activity"
            size="sm"
            onClick={onClose}
            className="-mr-2 touch:h-9 touch:w-9"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
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
