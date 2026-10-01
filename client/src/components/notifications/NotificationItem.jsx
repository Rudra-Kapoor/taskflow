import { Avatar, TimeAgo } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getNotificationMeta } from '@/lib/notifications';

/** Emphasises the actor's name when the message starts with it ("**Priya Patel** assigned you…"). */
function NotificationMessage({ message = '', actorName }) {
  if (actorName && message.startsWith(actorName)) {
    return (
      <>
        <span className="font-semibold text-fg">{actorName}</span>
        {message.slice(actorName.length)}
      </>
    );
  }
  return message;
}

/** Actor avatar with a small type badge, or a type tile for system notifications ("due soon"). */
function NotificationIcon({ actor, meta, compact }) {
  const Icon = meta.icon;

  if (!actor) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-full',
          compact ? 'h-8 w-8' : 'h-10 w-10',
          meta.tile,
        )}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </span>
    );
  }

  return (
    <span className="relative flex" aria-hidden="true">
      <Avatar user={actor} size={compact ? 'md' : 'lg'} decorative />
      <span
        className={cn(
          'absolute flex items-center justify-center rounded-full ring-2 ring-surface',
          compact ? '-bottom-0.5 -right-1 h-3.5 w-3.5' : '-bottom-1 -right-1 h-[18px] w-[18px]',
          meta.badge,
        )}
      >
        <Icon className={compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} strokeWidth={2.5} />
      </span>
    </span>
  );
}

/**
 * One notification row: actor avatar with a type badge, the message (long words wrap), project
 * chip, relative time and an unread dot. With `onClick` the whole row is one button.
 *
 * `actions` (e.g. small icon buttons) get their own slot: beside the unread dot from `sm` up,
 * below the time on phones (so the message keeps the full width). Mouse users see them on hover
 * or focus; touch screens always show them.
 */
export function NotificationItem({ notification, onClick, actions, compact = false, className }) {
  const meta = getNotificationMeta(notification.type);
  const unread = !notification.read;
  const { actor, project } = notification;
  const Body = onClick ? 'button' : 'div';

  return (
    <div
      className={cn(
        'group/notification relative grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 rounded-lg',
        'transition-colors duration-150',
        actions && 'sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]',
        compact ? 'px-2.5 py-2.5' : 'px-4 py-3.5',
        unread ? 'bg-brand-50/70 dark:bg-brand-500/[0.07]' : onClick && 'hover:bg-surface-hover',
        unread && onClick && 'hover:bg-brand-50 dark:hover:bg-brand-500/10',
        className,
      )}
    >
      <div className="self-start">
        <NotificationIcon actor={actor} meta={meta} compact={compact} />
      </div>

      <Body
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'min-w-0 text-left',
          // The button's hit area (and focus ring) covers the whole row.
          onClick &&
            'outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-brand-500',
        )}
      >
        {unread && <span className="sr-only">Unread: </span>}
        <span
          className={cn(
            'break-words leading-snug [overflow-wrap:anywhere]',
            compact ? 'line-clamp-2 text-[13px]' : 'line-clamp-3 text-sm sm:line-clamp-2',
            unread ? 'text-fg' : 'text-fg-muted',
          )}
        >
          <NotificationMessage message={notification.message} actorName={actor?.name} />
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          {project && (
            <span className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-md bg-surface-muted px-1.5 py-0.5 font-medium ring-1 ring-inset ring-line">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: project.color || '#6366f1' }}
                aria-hidden="true"
              />
              <span className="truncate">{project.key || project.name}</span>
            </span>
          )}
          <span className="sr-only">{meta.label}, </span>
          <TimeAgo date={notification.createdAt} />
        </span>
      </Body>

      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          unread ? 'bg-brand-500' : 'invisible',
        )}
      />

      {actions && (
        <div
          className={cn(
            'relative z-10 col-start-2 row-start-2 -ml-1.5 mt-1.5 flex items-center gap-0.5',
            'sm:col-start-4 sm:row-start-1 sm:-my-1 sm:ml-0 sm:mt-0 sm:self-start',
            'transition-opacity duration-150 [@media(hover:hover)]:opacity-0',
            '[@media(hover:hover)]:group-focus-within/notification:opacity-100',
            '[@media(hover:hover)]:group-hover/notification:opacity-100',
          )}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
