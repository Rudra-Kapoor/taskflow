import { Avatar, Tooltip } from '@/components/ui';
import { joinList } from '@/lib/activity';

const MAX_VISIBLE = 4;

/**
 * Live "who is on this board" pill: overlapping avatars with online dots, a count and the names
 * in a tooltip. The current user is listed last and marked "you".
 */
export function PresenceAvatars({ viewers, currentUserId, className }) {
  if (viewers.length === 0) return null;

  const isMe = (user) => user._id === currentUserId;
  const ordered = [...viewers].sort((a, b) => Number(isMe(a)) - Number(isMe(b)));
  const visible = ordered.slice(0, MAX_VISIBLE);
  const hiddenCount = ordered.length - visible.length;
  const onlyMe = ordered.length === 1 && isMe(ordered[0]);
  const names = ordered.map((user) => (isMe(user) ? 'you' : user.name));
  const description = onlyMe
    ? 'Only you are viewing this board right now'
    : `Viewing now: ${joinList(names)}`;

  return (
    <Tooltip content={description} side="bottom" align="end" className={className}>
      <div
        role="status"
        tabIndex={0}
        aria-label={description}
        className="focus-ring inline-flex h-9 cursor-default items-center gap-2.5 rounded-full border border-line bg-surface px-1.5 shadow-xs sm:pr-3"
      >
        <div className="flex items-center -space-x-0.5">
          {visible.map((user, index) => (
            <span
              key={user._id}
              className="relative flex rounded-full"
              style={{ zIndex: visible.length - index }}
            >
              <Avatar user={user} size="sm" online decorative className="ring-2 ring-surface" />
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="relative flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-muted px-1 text-2xs font-semibold text-fg-muted ring-2 ring-surface">
              +{hiddenCount}
            </span>
          )}
        </div>
        <span className="hidden items-center gap-1.5 whitespace-nowrap text-xs font-medium text-fg-muted sm:flex">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          {ordered.length} viewing
        </span>
      </div>
    </Tooltip>
  );
}
