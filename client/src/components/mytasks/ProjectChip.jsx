import { cn } from '@/lib/cn';
import { PROJECT_COLORS, calmColor } from '@/lib/constants';

/** Project colour square + name, as used in the sidebar ("■ TaskFlow Web App"). */
export function ProjectChip({ project, className }) {
  if (!project) return null;

  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-2 text-xs text-fg-muted', className)}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-[2px]"
        style={{ backgroundColor: calmColor(project.color || PROJECT_COLORS[0]) }}
      />
      <span className="truncate">{project.name}</span>
    </span>
  );
}
