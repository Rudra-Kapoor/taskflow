import { cn } from '@/lib/cn';
import { PROJECT_COLORS } from '@/lib/constants';

/**
 * Box per size, then the type for keys of up to 3, 4 and 5-6 characters: never below 11px,
 * long keys are set tighter instead so they still fit the square.
 */
const SIZES = {
  md: {
    box: 'h-10 w-10 rounded-xl',
    text: ['text-xs tracking-tight', 'text-xs tracking-tight', 'text-[11px] tracking-tighter'],
  },
  lg: {
    box: 'h-12 w-12 rounded-xl',
    text: ['text-sm tracking-tight', 'text-[13px] tracking-tight', 'text-xs tracking-tighter'],
  },
};

/** Project identity tile: its key in white on the project colour (like a Jira project avatar). */
export function ProjectTile({ projectKey, color, size = 'md', className }) {
  const key = (projectKey || '?').toUpperCase();
  const sizing = SIZES[size] ?? SIZES.md;
  const textSize = sizing.text[key.length <= 3 ? 0 : key.length === 4 ? 1 : 2];

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color || PROJECT_COLORS[0] }}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
        'font-bold text-white shadow-sm',
        sizing.box,
        textSize,
        className,
      )}
    >
      <span className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/20" />
      <span className="relative">{key}</span>
    </span>
  );
}
