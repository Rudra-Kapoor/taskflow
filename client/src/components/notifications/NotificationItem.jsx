import { Avatar, TimeAgo } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getNotificationMeta } from '@/lib/notifications';

/** Emphasises the actor's name when the message starts with it ("**Priya Patel** assigned you…"). */
function NotificationMessage({ message = '', actorName, unread }) {
  if (actorName && message.startsWith(actorName)) {
    return (
      <>
        <span className={cn('font-medium', unread ? 'text-fg' : 'text-fg-muted')}>
          {actorName}
        </span>
        {message.slice(actorName.length)}
      </>
    );
  }
  return message;
}

/** Actor avatar, or an outlined glyph for system notifications ("due soon"). */
function NotificationIcon({ actor, meta, compact }) {
  const Icon = meta.icon;

  if (!actor) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-full border border-line-strong bg-surface text-fg-muted',
          compact ? 'h-6 w-6' : 'h-8 w-8',
        )}
      >
        <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2} />
      </span>
    );
  }

  return <Avatar user={actor} size={compact ? 'sm' : 'md'} decorative />;
}

/**
 * One notification row: actor avatar, the message (long words wrap), then a mono meta line with
 * the project key and relative time. Unread rows carry a small vermilion dot in the left gutter
 * and ink text; read ones fall back to muted text. With `onClick` the whole row is one button.
 *
 * `actions` (e.g. small icon buttons) get their own slot: beside the message from `sm` up,
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
        'group/notification relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-lg',
        'transition-colors duration-150',
        actions && 'sm:grid-cols-[auto_minmax(0,1fr)_auto]',
        compact ? 'py-3 pl-7 pr-4' : 'py-3.5 pl-8 pr-4',
        onClick && 'hover:bg-surface-muted/60',
        className,
      )}
    >
      <div className="relative flex self-start">
        {/* Unread marker: in the left gutter, 6px from the avatar whatever the row padding. */}
        {unread && (
          <span
            aria-hidden="true"
            className="absolute -left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-500"
          />
        )}
        <NotificationIcon actor={actor} meta={meta} compact={compact} />
      </div>

      <Body
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'min-w-0 rounded-[inherit] text-left',
          // The button's hit area (and focus ring) covers the whole row, following its corners.
          onClick &&
            'outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-500',
        )}
      >
        {unread && <span className="sr-only">Unread: </span>}
        <span
          className={cn(
            'block break-words [overflow-wrap:anywhere]',
            compact
              ? 'line-clamp-2 text-[13px] leading-[1.45]'
              : 'line-clamp-3 text-sm leading-[1.45] sm:line-clamp-2',
            unread ? 'text-fg' : 'text-fg-muted',
          )}
        >
          <NotificationMessage
            message={notification.message}
            actorName={actor?.name}
            unread={unread}
          />
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] leading-4 tabular-nums text-fg-subtle">
          {project && (
            <>
              <span className="inline-flex max-w-[11rem] items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-[1px]"
                  style={{ backgroundColor: project.color || '#8A857A' }}
                  aria-hidden="true"
                />
                <span className="truncate uppercase tracking-[0.04em]">
                  {project.key || project.name}
                </span>
              </span>
              <span aria-hidden="true" className="text-line-strong">
                /
              </span>
            </>
          )}
          <span className="sr-only">{meta.label}, </span>
          <TimeAgo date={notification.createdAt} />
        </span>
      </Body>

      {actions && (
        <div
          className={cn(
            'relative z-10 col-start-2 row-start-2 -ml-1.5 mt-1.5 flex items-center gap-0.5',
            'sm:col-start-3 sm:row-start-1 sm:-my-1 sm:ml-0 sm:mt-0 sm:self-start',
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
