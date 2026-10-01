import { useLayoutEffect } from 'react';

/**
 * Grows a <textarea> with its content (up to `maxHeight` px, then it scrolls).
 * Call with the textarea ref and its current value.
 */
export function useAutoResize(ref, value, maxHeight = 320) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    const borders = element.offsetHeight - element.clientHeight;
    const height = element.scrollHeight + borders;
    element.style.height = `${Math.min(height, maxHeight)}px`;
    element.style.overflowY = height > maxHeight ? 'auto' : 'hidden';
  }, [ref, value, maxHeight]);
}
