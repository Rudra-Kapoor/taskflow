import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { ControlError } from './ControlError';
import { useControlProps } from './FormFieldContext';

/**
 * Native <select> styled like the other inputs, with a chevron. Pass <option>s as children.
 * Works with react-hook-form's `register()`.
 */
export const Select = forwardRef(function Select(
  { error, className, id, children, 'aria-describedby': describedBy, ...props },
  ref,
) {
  const { controlId, invalid, standaloneMessage, messageId, ariaRequired, ariaDescribedBy } =
    useControlProps({ id, error, describedBy });

  const select = (
    <select
      ref={ref}
      id={controlId}
      aria-invalid={invalid || undefined}
      aria-required={ariaRequired}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'input-base select-chevron h-9 cursor-pointer truncate',
        invalid && 'input-error',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (!standaloneMessage) return select;

  return (
    <div className="w-full">
      {select}
      <ControlError id={messageId}>{standaloneMessage}</ControlError>
    </div>
  );
});
