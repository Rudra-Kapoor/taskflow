import { useEffect, useRef } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, CircleDot, Layers } from 'lucide-react';
import { matchesTaskPreset } from '@/hooks/pages/useTaskFilters';
import { cn } from '@/lib/cn';

/** Width of the left edge fade (1rem); the right one is twice as wide. */
const FADE_WIDTH = 16;

/** One-click filter sets; `sort` (optional) is applied along with the filters. */
const PRESETS = [
  {
    label: 'My open tasks',
    icon: CircleDot,
    filters: { assignee: 'me', status: 'open' },
  },
  {
    label: 'Overdue',
    icon: AlertTriangle,
    filters: { assignee: 'me', due: 'overdue' },
    sort: 'due_asc',
  },
  {
    label: 'Due this week',
    icon: CalendarDays,
    filters: { assignee: 'me', status: 'open', due: 'week' },
    sort: 'due_asc',
  },
  {
    // Same figure as the dashboard's "Completed" card.
    label: 'Completed this week',
    icon: CheckCircle2,
    filters: { assignee: 'me', status: 'completed', completedWithin: '7' },
  },
  { label: 'All tasks', icon: Layers, filters: {} },
];

/**
 * Preset chips above the task list; the chip matching the current filters is highlighted.
 * On phones the row scrolls sideways (fading out at the edges) and keeps the active chip in view,
 * e.g. "Completed this week" when arriving from the dashboard.
 */
export function QuickFilters({ filters, onApply, className }) {
  const rowRef = useRef(null);
  const activeLabel = PRESETS.find((preset) => matchesTaskPreset(filters, preset.filters))?.label;

  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector('[aria-pressed="true"]');
    if (!chip || row.scrollWidth <= row.clientWidth) return;
    const start = chip.offsetLeft - FADE_WIDTH;
    const end = chip.offsetLeft + chip.offsetWidth + FADE_WIDTH * 2;
    if (start < row.scrollLeft || end > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: Math.max(0, start) });
    }
  }, [activeLabel]);

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label="Quick filters"
      className={cn(
        // The vertical padding keeps focus rings clear of the scroll container's clipping.
        'scrollbar-none relative -mx-4 flex gap-2 overflow-x-auto px-4 py-1',
        '[mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-2rem),transparent)]',
        'sm:mx-0 sm:flex-wrap sm:overflow-visible sm:p-0 sm:[mask-image:none]',
        className,
      )}
    >
      {PRESETS.map((preset) => {
        const active = matchesTaskPreset(filters, preset.filters);
        const Icon = preset.icon;
        return (
          <button
            key={preset.label}
            type="button"
            aria-pressed={active}
            onClick={() => onApply(preset.filters, preset.sort)}
            className={cn(
              'focus-ring inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3',
              'text-[13px] font-medium transition-colors duration-150',
              active
                ? 'border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/25 dark:border-brand-600 dark:bg-brand-600 dark:shadow-none'
                : 'border-line-strong bg-surface text-fg-muted shadow-xs hover:bg-surface-hover hover:text-fg',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {preset.label}
          </button>
        );
      })}
      {/* Keeps the last chip clear of the fade when the row is scrolled to its end. */}
      <span aria-hidden="true" className="w-4 shrink-0 sm:hidden" />
    </div>
  );
}
