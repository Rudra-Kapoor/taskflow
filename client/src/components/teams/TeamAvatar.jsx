import { cn } from '@/lib/cn';
import { AVATAR_COLORS, calmColor } from '@/lib/constants';
import { getInitials, pickFromPalette } from '@/lib/format';

const SIZES = {
  sm: 'h-8 w-8 rounded-md text-[11px]',
  md: 'h-10 w-10 rounded-md text-[13px]',
  lg: 'h-12 w-12 rounded-lg text-[15px]',
  xl: 'h-14 w-14 rounded-lg text-lg',
};

/**
 * Team monogram: initials on a flat, calm tone of the team's colour (white text >= 4.5:1).
 * `tone="ink"` sets it in neutral ink instead, e.g. for a team that has no id (colour) yet.
 * `className` can resize it or stretch it to fill a container.
 */
export function TeamAvatar({ team, size = 'md', tone = 'hue', className }) {
  const color = calmColor(pickFromPalette(team?._id ?? team?.name ?? '', AVATAR_COLORS));
  const ink = tone === 'ink';

  return (
    <span
      aria-hidden="true"
      style={ink ? undefined : { backgroundColor: color }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
        'font-semibold leading-none tracking-[-0.01em]',
        ink ? 'bg-fg text-canvas' : 'text-white',
        SIZES[size] ?? SIZES.md,
        className,
      )}
    >
      {getInitials(team?.name)}
    </span>
  );
}
