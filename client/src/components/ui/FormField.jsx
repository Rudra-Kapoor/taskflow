import { useId, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FormFieldContext } from './FormFieldContext';

/**
 * Label + control + error/hint message. The child control automatically receives the field id,
 * `aria-invalid`, `aria-required` and `aria-describedby`, so passing `htmlFor` is optional.
 *
 * @example
 * <FormField label="Email" error={errors.email?.message} required>
 *   <Input type="email" icon={Mail} {...register('email')} />
 * </FormField>
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  action,
  className,
  children,
}) {
  const generatedId = useId();
  const id = htmlFor ?? `field${generatedId.replace(/:/g, '')}`;
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);

  const context = useMemo(
    () => ({
      id,
      invalid: Boolean(error),
      required,
      describedBy: hasMessage ? messageId : undefined,
    }),
    [id, error, required, hasMessage, messageId],
  );

  return (
    <FormFieldContext.Provider value={context}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        {(label || action) && (
          <div className="flex items-center justify-between gap-3">
            {label && (
              <label htmlFor={id} className="text-[13px] font-medium leading-5 text-fg">
                {label}
                {required && (
                  <span className="ml-0.5 text-brand-600 dark:text-brand-400" aria-hidden="true">
                    *
                  </span>
                )}
              </label>
            )}
            {action}
          </div>
        )}

        {children}

        {error ? (
          <p
            id={messageId}
            className="flex animate-fade-in items-start gap-1.5 text-xs font-medium text-danger"
          >
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : (
          hint && (
            <p id={messageId} className="text-xs text-fg-muted">
              {hint}
            </p>
          )
        )}
      </div>
    </FormFieldContext.Provider>
  );
}
