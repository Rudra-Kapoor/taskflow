import { cn } from '@/lib/cn';
import { Avatar } from './Avatar';

/** Overlap per size, small enough that the next avatar (and its ring) never covers initials. */
const OVERLAP = {
  xs: '-space-x-px',
  sm: '-space-x-0.5',
  md: '-space-x-1',
  lg: '-space-x-1.5',
  xl: '-space-x-2',
};

const MORE_SIZES = {
  xs: 'h-5 min-w-5 px-1 text-2xs',
  sm: 'h-6 min-w-6 px-1 text-2xs',
  md: 'h-8 min-w-8 px-1.5 text-xs',
  lg: 'h-10 min-w-10 px-2 text-sm',
  xl: 'h-14 min-w-14 px-2 text-base',
};

/** Overlapping avatars with a "+N" bubble for the overflow (names in its tooltip). */
export function AvatarGroup({ users = [], max = 4, size = 'sm', className }) {
  const list = users.filter(Boolean);
  const visible = list.slice(0, max);
  const hidden = list.slice(max);

  return (
    <div className={cn('flex items-center', OVERLAP[size] ?? OVERLAP.sm, className)}>
      {visible.map((user, index) => (
        <Avatar
          key={`${user._id ?? 'user'}-${index}`}
          user={user}
          size={size}
          showTooltip
          className="ring-2 ring-surface"
        />
      ))}
      {hidden.length > 0 && (
        <span
          title={hidden.map((user) => user.name).join(', ')}
          className={cn(
            'relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface-muted',
            MORE_SIZES[size] ?? MORE_SIZES.sm,
            'font-semibold leading-none text-fg-muted ring-2 ring-surface',
          )}
        >
          <span aria-hidden="true">+{hidden.length}</span>
          <span className="sr-only">and {hidden.length} more</span>
        </span>
      )}
    </div>
  );
}
