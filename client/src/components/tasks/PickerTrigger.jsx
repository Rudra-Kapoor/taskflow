import { forwardRef } from 'react';
import { ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  /** Looks like a form input (task form). */
  field: 'input-base flex h-9 items-center gap-2 text-left',
  /** Borderless property row value (task detail sidebar). */
  ghost:
    'focus-ring flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm ' +
    'text-fg transition-colors hover:bg-surface-hover aria-expanded:bg-surface-hover ' +
    'disabled:cursor-default disabled:hover:bg-transparent',
};

/** Trigger button for `OptionPicker` (forwards its ref; the picker adds the ARIA wiring). */
export const PickerTrigger = forwardRef(function PickerTrigger(
  { variant = 'field', className, children, disabled, ...props },
  ref,
) {
  const Chevron = variant === 'field' ? ChevronsUpDown : ChevronDown;

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn('group/trigger', VARIANTS[variant] ?? VARIANTS.field, className)}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {!disabled && (
        <Chevron
          className={cn(
            'h-4 w-4 shrink-0 text-fg-subtle transition-opacity',
            variant === 'ghost' &&
              'opacity-0 group-hover/trigger:opacity-100 group-focus-visible/trigger:opacity-100',
          )}
          aria-hidden="true"
        />
      )}
    </button>
  );
});
