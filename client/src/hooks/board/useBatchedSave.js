import { useCallback, useEffect, useRef } from 'react';

/**
 * Batches rapid edits of the same record: changes are merged and handed to `save(data)` after
 * `delay` ms without new edits, never while the previous batch is still being saved (concurrent
 * writes to the same document can conflict), and flushed when the component unmounts.
 */
export function useBatchedSave(save, delay = 400) {
  const saveRef = useRef(save);
  const stateRef = useRef({ pending: null, timer: null, saving: false });

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    const state = stateRef.current;
    window.clearTimeout(state.timer);
    state.timer = null;
    if (!state.pending || state.saving) return;

    const data = state.pending;
    state.pending = null;
    state.saving = true;
    Promise.resolve(saveRef.current(data)).finally(() => {
      state.saving = false;
      if (state.pending && !state.timer) flush();
    });
  }, []);

  // Closing the dialog must not drop the last edit.
  useEffect(() => flush, [flush]);

  return useCallback(
    (data) => {
      const state = stateRef.current;
      state.pending = { ...state.pending, ...data };
      window.clearTimeout(state.timer);
      state.timer = window.setTimeout(flush, delay);
    },
    [delay, flush],
  );
}
