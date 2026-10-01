import { UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AVATAR_COLORS } from '@/lib/constants';
import { getInitials, pickFromPalette } from '@/lib/format';

const SIZES = {
  xs: { box: 'h-5 w-5 text-[10px]', icon: 'h-3 w-3', dot: 'h-1.5 w-1.5 ring-1' },
  sm: { box: 'h-6 w-6 text-2xs', icon: 'h-3.5 w-3.5', dot: 'h-2 w-2 ring-[1.5px]' },
  md: { box: 'h-8 w-8 text-xs', icon: 'h-4 w-4', dot: 'h-2.5 w-2.5 ring-2' },
  lg: { box: 'h-10 w-10 text-sm', icon: 'h-5 w-5', dot: 'h-3 w-3 ring-2' },
  xl: { box: 'h-14 w-14 text-lg', icon: 'h-7 w-7', dot: 'h-3.5 w-3.5 ring-[3px]' },
};

/**
 * User avatar with initials on the user's `avatarColor`.
 * `user = null` renders a dashed "unassigned" placeholder. `decorative` hides it from assistive
 * technology (use it when the name is already written next to the avatar).
 */
export function Avatar({
  user,
  size = 'md',
  showTooltip = false,
  online = false,
  decorative = false,
  className,
}) {
  const sizing = SIZES[size] ?? SIZES.md;
  const name = user ? user.name || 'Unknown user' : 'Unassigned';
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name };

  if (!user) {
    return (
      <span
        {...a11y}
        title={showTooltip ? name : undefined}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center rounded-full border border-dashed',
          'border-line-strong bg-surface text-fg-subtle',
          sizing.box,
          className,
        )}
      >
        <UserRound className={sizing.icon} aria-hidden="true" />
      </span>
    );
  }

  const color = user.avatarColor || pickFromPalette(user._id ?? name, AVATAR_COLORS);

  return (
    <span
      {...a11y}
      title={showTooltip ? name : undefined}
      style={{ backgroundColor: color }}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center rounded-full',
        sizing.box,
        'font-semibold leading-none tracking-tight text-white',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/10"
      />
      <span aria-hidden="true" className="relative">
        {getInitials(name)}
      </span>
      {online && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 right-0 block rounded-full bg-emerald-500 ring-surface',
            sizing.dot,
          )}
        />
      )}
    </span>
  );
}
