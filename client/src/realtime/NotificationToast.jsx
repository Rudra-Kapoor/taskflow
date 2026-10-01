import { ArrowRight, X } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getNotificationMeta } from '@/lib/notifications';

const FALLBACK_PROJECT_COLOR = '#8A857A';

/**
 * Card rendered through `toast.custom` when a notification arrives in real time: a mono eyebrow
 * with the notification type, the actor's avatar (or the type's glyph for system notifications
 * such as "due soon"), message, project and a "View" affordance. Clicking the card opens the
 * notification target.
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
        'pointer-events-auto flex w-[22rem] max-w-[calc(100vw-2rem)] items-start rounded-lg',
        'border border-line bg-surface text-fg shadow-popover transition-all duration-200',
        'dark:border-line-strong/70 dark:shadow-black/50',
        visible ? 'animate-slide-up' : 'translate-y-1 opacity-0',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group flex min-w-0 flex-1 items-start gap-3 rounded-l-[inherit] py-3 pl-3.5 pr-1 text-left transition-colors hover:bg-surface-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        {/* The message names the actor: the avatar is decorative. */}
        <span aria-hidden="true" className="flex shrink-0 pt-[18px]">
          {actor ? (
            <Avatar user={actor} size="sm" />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong text-fg-muted">
              <Icon className="h-3 w-3" strokeWidth={2} />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-fg-subtle">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {meta.label}
          </span>
          <span className="line-clamp-2 break-words text-[13px] leading-[1.45] text-fg [overflow-wrap:anywhere]">
            {message}
          </span>
          <span className="mt-2 flex items-center gap-2 text-xs">
            {project?.name && (
              <span className="flex min-w-0 items-center gap-1.5 text-fg-muted">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-[1px]"
                  style={{ backgroundColor: project.color || FALLBACK_PROJECT_COLOR }}
                />
                <span className="truncate">{project.name}</span>
              </span>
            )}
            <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-fg underline decoration-line-strong underline-offset-[3px] transition-colors group-hover:decoration-fg">
              View
              <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="m-1.5 shrink-0 rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
