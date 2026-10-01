import { cn } from '@/lib/cn';
import { PROJECT_COLORS, calmColor } from '@/lib/constants';

/**
 * Box and colour mark per size, then the mono type for keys of up to 3, 4 and 5-6 characters:
 * never below 11px, long keys are set tighter instead so they still fit the square.
 */
const SIZES = {
  md: {
    box: 'h-10 w-10 rounded-md',
    mark: 'left-[5px] top-[5px] h-1.5 w-1.5',
    text: ['text-xs', 'text-[11px] tracking-[-0.02em]', 'text-[11px] tracking-[-0.08em]'],
  },
  lg: {
    box: 'h-12 w-12 rounded-lg',
    mark: 'left-1.5 top-1.5 h-[7px] w-[7px]',
    text: ['text-[13px]', 'text-xs tracking-[-0.02em]', 'text-[11px] tracking-[-0.06em]'],
  },
};

/**
 * Project identity chip: the key in mono ink on a hairline tile, with the project colour (its
 * calm display tone) as the small square used for projects everywhere else (sidebar,
 * breadcrumbs, cards). Neutral, so any colour works in both themes.
 */
export function ProjectTile({ projectKey, color, size = 'md', className }) {
  const key = (projectKey || '?').toUpperCase();
  const sizing = SIZES[size] ?? SIZES.md;
  const textSize = sizing.text[key.length <= 3 ? 0 : key.length === 4 ? 1 : 2];

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
        'border border-line-strong bg-surface font-mono font-medium leading-none text-fg',
        sizing.box,
        textSize,
        className,
      )}
    >
      <span
        className={cn('absolute rounded-[1px]', sizing.mark)}
        style={{ backgroundColor: calmColor(color || PROJECT_COLORS[0]) }}
      />
      {key}
    </span>
  );
}
