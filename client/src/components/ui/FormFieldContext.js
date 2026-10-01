import { createContext, useContext } from 'react';
import { joinIds } from '@/lib/dom';

/**
 * Lets form controls (Input, Textarea, Select) inherit the id, invalid / required state and
 * aria-describedby of the surrounding <FormField>, which renders the label and messages.
 */
export const FormFieldContext = createContext(null);

export function useFormField() {
  return useContext(FormFieldContext);
}

/**
 * Resolves id / invalid / required state and aria-describedby for a control, merging its own
 * props with the surrounding FormField (if any). Outside a FormField, a string `error` is rendered
 * by the control. `ariaRequired` exposes a required field to assistive technology.
 */
export function useControlProps({ id, error, describedBy }) {
  const field = useFormField();
  const controlId = id ?? field?.id;
  const invalid = Boolean(error) || Boolean(field?.invalid);
  const standaloneMessage = !field && typeof error === 'string' && error ? error : null;
  const messageId = standaloneMessage && controlId ? `${controlId}-error` : undefined;

  return {
    controlId,
    invalid,
    standaloneMessage,
    messageId,
    ariaRequired: field?.required || undefined,
    ariaDescribedBy: joinIds(describedBy, field?.describedBy, messageId),
  };
}
