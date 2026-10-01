import { useState } from 'react';
import { PieChart } from 'lucide-react';
import { EmptyState, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { STATUS_META, TASK_STATUSES } from '@/lib/constants';
import { formatNumber } from '@/lib/format';

const SIZE = 120;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface-coloured gap between segments, in viewBox units (~2px at the rendered size). */
const GAP = 1.6;

const percentOf = (count, total) => (total ? Math.round((count / total) * 100) : 0);

/** Arc length + start offset of every non-empty status, clockwise from 12 o'clock. */
function buildSegments(breakdown, total) {
  const visible = TASK_STATUSES.filter((status) => (breakdown[status.value] ?? 0) > 0);
  const gap = visible.length > 1 ? GAP : 0;
  let offset = 0;
  return visible.map((status) => {
    const share = (breakdown[status.value] / total) * CIRCUMFERENCE;
    const segment = { status, length: Math.max(share - gap, 0.5), offset: offset + gap / 2 };
    offset += share;
    return segment;
  });
}

/**
 * Donut of task counts per status (`{ todo, in_progress, completed }`) with a legend that always
 * lists every value; hovering a segment or legend row focuses it in the centre label.
 */
export function StatusChart({ breakdown = {} }) {
  const [activeStatus, setActiveStatus] = useState(null);
  const total = TASK_STATUSES.reduce((sum, status) => sum + (breakdown[status.value] ?? 0), 0);

  if (total === 0) {
    return (
      <EmptyState
        compact
        icon={PieChart}
        title="No tasks yet"
        description="Task counts per status appear here once your projects have tasks."
      />
    );
  }

  const segments = buildSegments(breakdown, total);
  const active = activeStatus ? STATUS_META[activeStatus] : null;
  const activeCount = active ? (breakdown[active.value] ?? 0) : total;
  const summary = TASK_STATUSES.map(
    (status) => `${breakdown[status.value] ?? 0} ${status.label}`,
  ).join(', ');

  return (
    <div className="my-auto flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-12 lg:flex-col lg:gap-6">
      <div className="relative h-44 w-44 shrink-0" onMouseLeave={() => setActiveStatus(null)}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`Tasks by status: ${summary}`}
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-surface-muted"
          />
          {segments.map(({ status, length, offset }) => (
            <circle
              key={status.value}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={status.color}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
              onMouseEnter={() => setActiveStatus(status.value)}
              className={cn(
                'cursor-default transition-opacity duration-200',
                activeStatus && activeStatus !== status.value && 'opacity-30',
              )}
            >
              <title>{`${status.label}: ${breakdown[status.value]}`}</title>
            </circle>
          ))}
        </svg>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-3xl font-semibold leading-none tracking-tight text-fg">
            {formatNumber(activeCount)}
          </span>
          <span className="mt-1.5 text-xs text-fg-muted">
            {active
              ? `${active.label} · ${percentOf(activeCount, total)}%`
              : `${total === 1 ? 'task' : 'tasks'} in total`}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-1 md:max-w-xs lg:max-w-none">
        {TASK_STATUSES.map((status) => {
          const count = breakdown[status.value] ?? 0;
          return (
            <li
              key={status.value}
              onMouseEnter={() => setActiveStatus(status.value)}
              onMouseLeave={() => setActiveStatus(null)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                activeStatus === status.value ? 'bg-surface-hover' : 'hover:bg-surface-hover',
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: status.color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-fg-muted">{status.label}</span>
              <span className="font-semibold tabular-nums text-fg">{formatNumber(count)}</span>
              <span className="w-10 text-right text-xs tabular-nums text-fg-muted">
                {percentOf(count, total)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function StatusChartSkeleton() {
  return (
    <div
      className="my-auto flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-12 lg:flex-col lg:gap-6"
      aria-hidden="true"
    >
      {/* A ring with the donut's proportions: its hole is 46/60 of the outer radius. */}
      <Skeleton className="h-44 w-44 shrink-0 rounded-full [mask-image:radial-gradient(closest-side,transparent_76%,black_77%)]" />
      <div className="w-full space-y-1 md:max-w-xs lg:max-w-none">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex h-9 items-center gap-3 px-2.5">
            <Skeleton className="h-2.5 w-2.5 rounded-[3px]" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
