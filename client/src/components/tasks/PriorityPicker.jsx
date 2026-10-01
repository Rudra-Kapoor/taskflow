import { PriorityBadge } from '@/components/ui';
import { PRIORITY_META, TASK_PRIORITIES } from '@/lib/constants';
import { OptionPicker } from './OptionPicker';
import { PickerTrigger } from './PickerTrigger';

/** Urgent first, like most trackers list them. */
const PRIORITY_OPTIONS = [...TASK_PRIORITIES].reverse().map((priority) => ({
  value: priority.value,
  label: priority.label,
  icon: (
    <span aria-hidden="true" className="flex">
      <PriorityBadge priority={priority.value} showLabel={false} size="sm" />
    </span>
  ),
}));

/** Task priority select with the coloured priority icons. `variant`: `field` | `ghost`. */
export function PriorityPicker({ value, onChange, disabled, variant = 'field', id, className }) {
  const meta = PRIORITY_META[value] ?? PRIORITY_META.medium;

  return (
    <OptionPicker
      trigger={
        <PickerTrigger id={id} variant={variant} className={className}>
          <span aria-hidden="true" className="flex">
            <PriorityBadge priority={meta.value} showLabel={false} size="sm" />
          </span>
          <span className="truncate">{meta.label}</span>
        </PickerTrigger>
      }
      options={PRIORITY_OPTIONS}
      value={meta.value}
      onChange={onChange}
      label="Priority"
      disabled={disabled}
      width="w-48"
    />
  );
}
