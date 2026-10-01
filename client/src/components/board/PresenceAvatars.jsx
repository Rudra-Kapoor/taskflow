import { Avatar, Tooltip } from '@/components/ui';
import { joinList } from '@/lib/activity';

const MAX_VISIBLE = 4;

/**
 * Live "who is on this board": small overlapping avatars and "2 viewing" in mono, with the names
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
        className="focus-ring inline-flex h-9 cursor-default items-center gap-2.5 rounded-md px-1"
      >
        <div className="flex items-center -space-x-1.5">
          {visible.map((user, index) => (
            <span
              key={user._id}
              className="relative flex rounded-full"
              style={{ zIndex: visible.length - index }}
            >
              <Avatar user={user} size="sm" decorative className="ring-2 ring-canvas" />
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="relative flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-muted px-1 font-mono text-[10px] text-fg-muted ring-2 ring-canvas">
              +{hiddenCount}
            </span>
          )}
        </div>
        <span className="hidden items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tabular-nums text-fg-muted sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-status-done" aria-hidden="true" />
          {ordered.length} viewing
        </span>
      </div>
    </Tooltip>
  );
}
