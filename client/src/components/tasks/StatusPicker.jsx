import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { STATUS_META, TASK_STATUSES } from '@/lib/constants';
import { OptionPicker } from './OptionPicker';
import { PickerTrigger } from './PickerTrigger';
import { StatusDot, StatusLabel } from './TaskGlyphs';

const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status.value,
  label: status.label,
  icon: <StatusDot status={status.value} className="mx-1" />,
}));

/**
 * Task status select. `variant`: `field` (form input), `ghost` (detail sidebar) or `badge`
 * (compact dot + label, e.g. in table rows).
 */
export function StatusPicker({ value, onChange, disabled, variant = 'field', id, className }) {
  const meta = STATUS_META[value] ?? STATUS_META.todo;

  const trigger =
    variant === 'badge' ? (
      <button
        type="button"
        aria-label={`Status: ${meta.label}. Change status`}
        className={cn(
          'focus-ring group/status -mx-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[13px] text-fg',
          'transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover disabled:cursor-default disabled:hover:bg-transparent',
          className,
        )}
      >
        <StatusLabel status={meta.value} />
        {!disabled && (
          <ChevronDown
            className="h-3.5 w-3.5 text-fg-subtle opacity-0 transition-opacity group-hover/status:opacity-100 group-focus-visible/status:opacity-100"
            aria-hidden="true"
          />
        )}
      </button>
    ) : (
      <PickerTrigger id={id} variant={variant} className={className}>
        <StatusDot status={meta.value} className="mx-1" />
        <span className="truncate">{meta.label}</span>
      </PickerTrigger>
    );

  return (
    <OptionPicker
      trigger={trigger}
      options={STATUS_OPTIONS}
      value={meta.value}
      onChange={onChange}
      label="Status"
      disabled={disabled}
      width="w-52"
    />
  );
}
