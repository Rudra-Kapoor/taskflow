import { useEffect, useRef } from 'react';
import { matchesTaskPreset } from '@/hooks/pages/useTaskFilters';
import { cn } from '@/lib/cn';

/** Width of the left edge fade (1rem); the right one is twice as wide. */
const FADE_WIDTH = 16;

/** One-click filter sets; `sort` (optional) is applied along with the filters. */
const PRESETS = [
  {
    label: 'My open tasks',
    filters: { assignee: 'me', status: 'open' },
  },
  {
    label: 'Overdue',
    filters: { assignee: 'me', due: 'overdue' },
    sort: 'due_asc',
  },
  {
    label: 'Due this week',
    filters: { assignee: 'me', status: 'open', due: 'week' },
    sort: 'due_asc',
  },
  {
    // Same figure as the dashboard's "Completed" number.
    label: 'Completed this week',
    filters: { assignee: 'me', status: 'completed', completedWithin: '7' },
  },
  { label: 'All tasks', filters: {} },
];

/**
 * Preset views above the task list, set as text tabs on a hairline: the one matching the current
 * filters is ink with an underline. On phones the row scrolls sideways (fading out at the edges)
 * and keeps the active preset in view, e.g. "Completed this week" when arriving from the dashboard.
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
    <div className={cn('relative', className)}>
      {/* The hairline the active underline sits on (outside the scroller, so it spans the row). */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-line" />
      <div
        ref={rowRef}
        role="group"
        aria-label="Quick filters"
        className={cn(
          'scrollbar-none relative -mx-4 flex gap-1 overflow-x-auto px-2 sm:gap-2',
          '[mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-2rem),transparent)]',
          'sm:-mx-2 sm:overflow-visible sm:px-0 sm:[mask-image:none]',
        )}
      >
        {PRESETS.map((preset) => {
          const active = matchesTaskPreset(filters, preset.filters);
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              onClick={() => onApply(preset.filters, preset.sort)}
              className={cn(
                'focus-ring relative inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-md px-2',
                // Inset ring: the scrolling row would clip one drawn outside the button.
                'focus-visible:ring-inset focus-visible:ring-offset-0',
                'text-sm transition-colors duration-150',
                active ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {preset.label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-2 bottom-0 h-0.5 transition-colors duration-150',
                  active ? 'bg-fg' : 'bg-transparent',
                )}
              />
            </button>
          );
        })}
        {/* Keeps the last preset clear of the fade when the row is scrolled to its end. */}
        <span aria-hidden="true" className="w-4 shrink-0 sm:hidden" />
      </div>
    </div>
  );
}
