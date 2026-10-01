import { STATUS_META } from '@/lib/constants';
import { Badge } from './Badge';

/** Task status pill with a coloured dot (To Do = slate, In Progress = blue, Completed = green). */
export function StatusBadge({ status, size = 'md', className }) {
  const meta = STATUS_META[status];
  if (!meta) return null;

  return (
    <Badge color={meta.badge} size={size} dot className={className}>
      {meta.label}
    </Badge>
  );
}
