import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * State for a text field whose value is committed after the user pauses typing (e.g. into the
 * URL), while still following outside changes of the committed value (e.g. the topbar search
 * navigating to `/tasks?search=…`). Clearing the field commits immediately.
 *
 * @param {string} committedValue the current source of truth
 * @param {(value: string) => void} onCommit called with the settled input value
 * @returns {[string, (value: string) => void]} `[inputValue, setInputValue]`
 */
export function useDebouncedInput(committedValue, onCommit, delay = 300) {
  const [value, setValue] = useState(committedValue);
  const settledValue = useDebounce(value, value ? delay : 0);
  const lastSyncedRef = useRef(committedValue);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  // Changed elsewhere: mirror it in the field.
  useEffect(() => {
    if (committedValue === lastSyncedRef.current) return;
    lastSyncedRef.current = committedValue;
    setValue(committedValue);
  }, [committedValue]);

  // The user paused typing: commit what they typed.
  useEffect(() => {
    if (settledValue === lastSyncedRef.current) return;
    lastSyncedRef.current = settledValue;
    onCommitRef.current(settledValue);
  }, [settledValue]);

  return [value, setValue];
}
