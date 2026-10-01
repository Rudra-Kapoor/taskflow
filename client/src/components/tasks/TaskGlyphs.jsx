import { cn } from '@/lib/cn';
import { PRIORITY_META, STATUS_META } from '@/lib/constants';

/**
 * Small task glyphs shared by the board, the list view, the pickers and the task dialog, drawn
 * in the Studio workflow colours (`status-*` / `priority-*` in tailwind.config.js). Purely
 * visual: callers provide the accessible text (or use `labelled` to add a visually hidden one).
 */
const STATUS_DOT = {
  todo: 'border-[1.5px] border-status-todo',
  in_progress: 'bg-status-progress',
  completed: 'bg-status-done',
};

const PRIORITY_FILL = {
  urgent: 'fill-priority-urgent',
  high: 'fill-priority-high',
  medium: 'fill-priority-medium',
  low: 'fill-priority-low',
};

const PRIORITY_BARS = { low: 1, medium: 2, high: 3 };
const BARS = [
  { x: 2, y: 9.5, height: 4 },
  { x: 6.5, y: 6.5, height: 7 },
  { x: 11, y: 3.5, height: 10 },
];

/** Status dot: hollow for To Do, filled for In Progress and Completed. */
export function StatusDot({ status, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        STATUS_DOT[status] ?? STATUS_DOT.todo,
        className,
      )}
    />
  );
}

/** Round check used for completed work (completed cards). */
export function CheckGlyph({ className }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn('h-3.5 w-3.5 shrink-0', className)}
      fill="none"
    >
      <circle cx="8" cy="8" r="7.5" className="fill-status-done" />
      <path
        d="M4.9 8.3 7.05 10.4 11.1 6"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Priority as signal bars (low 1, medium 2, high 3) or a red "!" square for urgent.
 * `labelled` adds "<Priority> priority" for screen readers and as a hover title.
 */
export function PriorityGlyph({ priority, labelled = false, muted = false, className }) {
  const meta = PRIORITY_META[priority];
  if (!meta) return null;
  const fill = PRIORITY_FILL[priority];
  const filled = PRIORITY_BARS[priority] ?? 0;

  return (
    <span
      title={labelled ? `${meta.label} priority` : undefined}
      className={cn('inline-flex shrink-0 items-center', muted && 'opacity-50', className)}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none">
        {priority === 'urgent' ? (
          <>
            <rect x="1.5" y="1.5" width="13" height="13" rx="3" className={fill} />
            <path d="M8 4.6v4.1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="8" cy="11.3" r="1" fill="#fff" />
          </>
        ) : (
          BARS.map((bar, index) => (
            <rect
              key={bar.x}
              x={bar.x}
              y={bar.y}
              width="3"
              height={bar.height}
              rx="0.9"
              className={index < filled ? fill : 'fill-fg/[0.16] dark:fill-fg/[0.22]'}
            />
          ))
        )}
      </svg>
      {labelled && <span className="sr-only">{meta.label} priority</span>}
    </span>
  );
}

/** Status dot + label, e.g. in table cells and picker triggers. */
export function StatusLabel({ status, className }) {
  const meta = STATUS_META[status] ?? STATUS_META.todo;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <StatusDot status={meta.value} />
      <span className="truncate">{meta.label}</span>
    </span>
  );
}
