import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { ControlError } from './ControlError';
import { useControlProps } from './FormFieldContext';

/** Multi-line text input (vertical resize). Works with react-hook-form's `register()`. */
export const Textarea = forwardRef(function Textarea(
  { error, rows = 4, className, id, 'aria-describedby': describedBy, ...props },
  ref,
) {
  const { controlId, invalid, standaloneMessage, messageId, ariaRequired, ariaDescribedBy } =
    useControlProps({ id, error, describedBy });

  const textarea = (
    <textarea
      ref={ref}
      id={controlId}
      rows={rows}
      aria-invalid={invalid || undefined}
      aria-required={ariaRequired}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'input-base min-h-[5rem] resize-y py-2 leading-relaxed',
        invalid && 'input-error',
        className,
      )}
      {...props}
    />
  );

  if (!standaloneMessage) return textarea;

  return (
    <div className="w-full">
      {textarea}
      <ControlError id={messageId}>{standaloneMessage}</ControlError>
    </div>
  );
});
