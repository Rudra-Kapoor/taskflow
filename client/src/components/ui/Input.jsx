import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { ControlError } from './ControlError';
import { useControlProps } from './FormFieldContext';

/**
 * Text input. Works with react-hook-form's `register()`.
 * - `icon`: lucide component shown on the left
 * - `trailing`: node rendered inside the right edge (e.g. a show-password button)
 * - `error`: string (message + red styling) or boolean
 * - `className` styles the <input>; `wrapperClassName` styles the wrapper, which is only rendered
 *   when there is an icon, trailing node or standalone error message.
 */
export const Input = forwardRef(function Input(
  {
    error,
    icon: Icon,
    trailing,
    className,
    wrapperClassName,
    id,
    type = 'text',
    'aria-describedby': describedBy,
    ...props
  },
  ref,
) {
  const { controlId, invalid, standaloneMessage, messageId, ariaRequired, ariaDescribedBy } =
    useControlProps({ id, error, describedBy });

  const input = (
    <input
      ref={ref}
      id={controlId}
      type={type}
      aria-invalid={invalid || undefined}
      aria-required={ariaRequired}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'input-base peer h-9',
        Icon && 'pl-9',
        trailing && 'pr-10',
        invalid && 'input-error',
        className,
      )}
      {...props}
    />
  );

  if (!Icon && !trailing && !standaloneMessage) return input;

  return (
    <div className={cn('w-full', wrapperClassName)}>
      <div className="relative">
        {input}
        {Icon && (
          <Icon
            className={cn(
              'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors',
              invalid ? 'text-rose-500' : 'text-fg-subtle peer-focus:text-brand-500',
            )}
            aria-hidden="true"
          />
        )}
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>
        )}
      </div>
      {standaloneMessage && <ControlError id={messageId}>{standaloneMessage}</ControlError>}
    </div>
  );
});
