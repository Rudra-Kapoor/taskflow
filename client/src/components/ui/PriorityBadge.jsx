import { cn } from '@/lib/cn';
import { PRIORITY_META } from '@/lib/constants';
import { Badge } from './Badge';

/**
 * Priority indicator. With `showLabel={false}` it renders a compact icon tile (for task cards);
 * the label stays available to screen readers and as a tooltip.
 */
export function PriorityBadge({ priority, showLabel = true, size = 'md', className }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;
  const Icon = meta.icon;

  if (!showLabel) {
    return (
      <span
        title={`${meta.label} priority`}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md',
          size === 'sm' ? 'h-5 w-5' : 'h-6 w-6',
          meta.tile,
          className,
        )}
      >
        <Icon
          className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          strokeWidth={2.5}
          aria-hidden="true"
        />
        <span className="sr-only">{meta.label} priority</span>
      </span>
    );
  }

  return (
    <Badge color={meta.badge} size={size} className={className}>
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
