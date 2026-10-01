import { cn } from '@/lib/cn';
import { AVATAR_COLORS } from '@/lib/constants';
import { getInitials, pickFromPalette } from '@/lib/format';

const SIZES = {
  sm: 'h-8 w-8 rounded-lg text-[11px]',
  md: 'h-10 w-10 rounded-xl text-sm',
  lg: 'h-12 w-12 rounded-xl text-base',
  xl: 'h-14 w-14 rounded-2xl text-lg',
};

/**
 * Team identity tile: initials on the team colour (the same colour as its sidebar shortcut).
 * `className` can stretch it to fill a container (e.g. the PageHeader icon frame).
 */
export function TeamAvatar({ team, size = 'md', className }) {
  const color = pickFromPalette(team?._id ?? team?.name ?? '', AVATAR_COLORS);

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color }}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
        'font-semibold tracking-tight text-white shadow-sm',
        SIZES[size] ?? SIZES.md,
        className,
      )}
    >
      <span className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20" />
      <span className="relative">{getInitials(team?.name)}</span>
    </span>
  );
}
