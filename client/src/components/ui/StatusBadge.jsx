import { cn } from '@/lib/cn';
import { STATUS_META } from '@/lib/constants';
import { Badge } from './Badge';

/** Task status tag: outlined, neutral text, the status glyph in its colour. */
export function StatusBadge({ status, size = 'md', className }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <Badge color="gray" size={size} className={cn('text-fg', className)}>
      <Icon
        className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', meta.text)}
        strokeWidth={2.25}
        aria-hidden="true"
      />
      {meta.label}
    </Badge>
  );
}
