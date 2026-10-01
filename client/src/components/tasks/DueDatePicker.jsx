import { useRef } from 'react';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { CalendarDays, X } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { DUE_TONES } from '@/lib/constants';
import {
  formatDate,
  fromDateInputValue,
  getDueInfo,
  toDate,
  toDateInputValue,
} from '@/lib/format';

const QUICK_PICKS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
];

/** Due dates the API accepts (years 2000-2100). */
const MIN_DATE = '2000-01-01';
const MAX_DATE = '2100-12-31';

/** Tones worth spelling out under the date ("Overdue by 2 days", "Due today", …). */
const HINT_TONES = new Set(['overdue', 'today', 'soon']);

/**
 * Only complete dates within the allowed years are applied, so the intermediate values produced
 * while a year is typed ("0002", "0020", "0202") are never saved. Clearing is explicit.
 */
const isCompleteDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= MIN_DATE && value <= MAX_DATE;

/** Native picker for the ghost variant (falls back to focusing the input). */
function openNativePicker(input) {
  if (!input) return;
  try {
    input.showPicker();
  } catch {
    input.focus();
  }
}

/**
 * Due date control: date input, quick picks (Today / Tomorrow / Next week) and Clear.
 * `value` / `onChange` use ISO strings (end of the chosen local day) or `null`.
 * `variant="ghost"` renders a borderless property row (task detail) that opens the native picker.
 */
export function DueDatePicker({
  value,
  onChange,
  status,
  disabled = false,
  variant = 'field',
  id,
}) {
  const inputRef = useRef(null);
  const inputValue = toDateInputValue(value);
  const selected = toDate(value);
  const today = startOfDay(new Date());
  const due = getDueInfo(value, status);
  const showHint = Boolean(selected) && HINT_TONES.has(due.tone);
  const ghost = variant === 'ghost';

  const handleInputChange = (event) => {
    const next = event.target.value;
    if (isCompleteDate(next) && next !== inputValue) onChange(fromDateInputValue(next));
  };

  const pick = (days) => onChange(fromDateInputValue(format(addDays(today, days), 'yyyy-MM-dd')));

  const input = (
    <input
      ref={inputRef}
      id={ghost ? undefined : id}
      type="date"
      min={MIN_DATE}
      max={MAX_DATE}
      value={inputValue}
      onChange={handleInputChange}
      disabled={disabled}
      tabIndex={ghost ? -1 : undefined}
      aria-hidden={ghost || undefined}
      aria-label={id || ghost ? undefined : 'Due date'}
      className={
        ghost
          ? 'sr-only'
          : cn('input-base h-9 tabular-nums', !inputValue && 'text-fg-subtle')
      }
    />
  );

  return (
    <div className="space-y-2">
      {ghost ? (
        <div className="relative flex items-center gap-1">
          <button
            id={id}
            type="button"
            disabled={disabled}
            onClick={() => openNativePicker(inputRef.current)}
            className="focus-ring flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-surface-hover disabled:cursor-default disabled:hover:bg-transparent"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
            {selected ? (
              <span className="truncate text-fg">{formatDate(value)}</span>
            ) : (
              <span className="truncate text-fg-muted">
                {disabled ? 'No due date' : 'Set a due date'}
              </span>
            )}
          </button>
          {selected && !disabled && (
            <IconButton
              icon={X}
              label="Clear due date"
              size="xs"
              variant="danger"
              onClick={() => onChange(null)}
              className="touch:h-9 touch:w-9"
            />
          )}
          {input}
        </div>
      ) : (
        input
      )}

      {showHint && (
        <p className={cn('text-xs font-medium', ghost && 'px-2', DUE_TONES[due.tone].text)}>
          {due.relative}
        </p>
      )}

      {!disabled && (
        <div className={cn('flex flex-wrap items-center gap-1.5', ghost && 'pl-1')}>
          {QUICK_PICKS.map((quickPick) => {
            const date = addDays(today, quickPick.days);
            const active = Boolean(selected) && isSameDay(selected, date);
            return (
              <button
                key={quickPick.label}
                type="button"
                onClick={() => pick(quickPick.days)}
                aria-pressed={active}
                title={format(date, 'EEEE, MMM d')}
                className={cn(
                  'focus-ring inline-flex h-6 items-center rounded px-1.5 text-xs transition-colors touch:h-9 touch:px-2.5',
                  // Ghost (task panel): quiet text buttons; field (form): hairline outlined.
                  !ghost && 'ring-1 ring-inset',
                  active
                    ? 'bg-brand-50 text-brand-700 ring-brand-300 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-400/40'
                    : 'text-fg-muted ring-line hover:bg-surface-hover hover:text-fg',
                )}
              >
                {quickPick.label}
              </button>
            );
          })}
          {selected && !ghost && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="focus-ring ml-auto inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-rose-600 touch:h-9 dark:hover:text-rose-400"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
