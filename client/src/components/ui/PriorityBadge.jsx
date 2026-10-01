import { cn } from '@/lib/cn';
import { PRIORITY_META } from '@/lib/constants';
import { Badge } from './Badge';

/**
 * Priority indicator. With `showLabel={false}` it renders just the coloured glyph (for task
 * cards); the label stays available to screen readers and as a tooltip.
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
          'inline-flex shrink-0 items-center justify-center',
          size === 'sm' ? 'h-5 w-5' : 'h-6 w-6',
          meta.tile,
          className,
        )}
      >
        <Icon
          className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}
          strokeWidth={2.25}
          aria-hidden="true"
        />
        <span className="sr-only">{meta.label} priority</span>
      </span>
    );
  }

  return (
    <Badge color="gray" size={size} className={cn('text-fg', className)}>
      <Icon className={cn('h-3 w-3 shrink-0', meta.tile)} strokeWidth={2.5} aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
