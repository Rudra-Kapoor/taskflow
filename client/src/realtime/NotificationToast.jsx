import { ArrowRight, X } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getNotificationMeta } from '@/lib/notifications';

const FALLBACK_PROJECT_COLOR = '#6366f1';

/**
 * Card rendered through `toast.custom` when a notification arrives in real time: actor avatar (or
 * the type's icon for system notifications such as "due soon"), message, project and a "View"
 * affordance. Clicking the card opens the notification target.
 */
export function NotificationToast({ notification, visible, onOpen, onDismiss }) {
  const { actor, message, project, type } = notification;
  const meta = getNotificationMeta(type);
  const Icon = meta.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-1 rounded-xl',
        'border border-line bg-surface p-2 text-fg shadow-popover transition-all duration-200',
        visible ? 'animate-slide-up' : 'translate-y-1 opacity-0',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {/* The message names the actor: the avatar is decorative. */}
        <span aria-hidden="true" className="flex shrink-0">
          {actor ? (
            <Avatar user={actor} size="md" />
          ) : (
            <span
              className={cn('flex h-8 w-8 items-center justify-center rounded-full', meta.tile)}
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 break-words text-sm leading-snug text-fg [overflow-wrap:anywhere]">
            {message}
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-xs">
            {project?.name && (
              <span className="flex min-w-0 items-center gap-1.5 text-fg-muted">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color || FALLBACK_PROJECT_COLOR }}
                />
                <span className="truncate">{project.name}</span>
              </span>
            )}
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-400">
              View
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
