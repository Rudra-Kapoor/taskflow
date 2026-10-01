import { ChevronDown } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { STATUS_META, TASK_STATUSES } from '@/lib/constants';
import { OptionPicker } from './OptionPicker';
import { PickerTrigger } from './PickerTrigger';

const STATUS_OPTIONS = TASK_STATUSES.map((status) => {
  const Icon = status.icon;
  return {
    value: status.value,
    label: status.label,
    icon: <Icon className={cn('h-4 w-4', status.text)} aria-hidden="true" />,
  };
});

/**
 * Task status select. `variant`: `field` (form input), `ghost` (detail sidebar) or `badge`
 * (compact status pill, e.g. in table rows).
 */
export function StatusPicker({ value, onChange, disabled, variant = 'field', id, className }) {
  const meta = STATUS_META[value] ?? STATUS_META.todo;
  const Icon = meta.icon;

  const trigger =
    variant === 'badge' ? (
      <button
        type="button"
        aria-label={`Status: ${meta.label}. Change status`}
        className={cn(
          'focus-ring group/status inline-flex items-center gap-0.5 rounded-md disabled:cursor-default',
          className,
        )}
      >
        <StatusBadge status={meta.value} size="sm" />
        {!disabled && (
          <ChevronDown
            className="h-3.5 w-3.5 text-fg-subtle opacity-0 transition-opacity group-hover/status:opacity-100 group-focus-visible/status:opacity-100"
            aria-hidden="true"
          />
        )}
      </button>
    ) : (
      <PickerTrigger id={id} variant={variant} className={className}>
        <Icon className={cn('h-4 w-4 shrink-0', meta.text)} aria-hidden="true" />
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
