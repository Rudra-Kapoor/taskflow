import { PRIORITY_META, TASK_PRIORITIES } from '@/lib/constants';
import { OptionPicker } from './OptionPicker';
import { PickerTrigger } from './PickerTrigger';
import { PriorityGlyph } from './TaskGlyphs';

/** Urgent first, like most trackers list them. */
const PRIORITY_OPTIONS = [...TASK_PRIORITIES].reverse().map((priority) => ({
  value: priority.value,
  label: priority.label,
  icon: <PriorityGlyph priority={priority.value} className="mx-0.5" />,
}));

/** Task priority select with the signal-bar priority glyphs. `variant`: `field` | `ghost`. */
export function PriorityPicker({ value, onChange, disabled, variant = 'field', id, className }) {
  const meta = PRIORITY_META[value] ?? PRIORITY_META.medium;

  return (
    <OptionPicker
      trigger={
        <PickerTrigger id={id} variant={variant} className={className}>
          <PriorityGlyph priority={meta.value} className="mx-0.5" />
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
