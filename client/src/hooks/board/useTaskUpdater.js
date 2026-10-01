import { useCallback, useEffect, useState } from 'react';
import { useMutationState } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { useUpdateTask } from '@/hooks/queries/tasks';
import { mutationKeys } from '@/lib/queryKeys';

const SAVED_FLASH_MS = 2000;

/**
 * `save(data)` persists task fields immediately (the update hook is optimistic and rolls back
 * on failure); errors are reported with a toast. Resolves with the saved task or `null`.
 */
export function useTaskUpdater(taskId) {
  const { mutateAsync } = useUpdateTask();
  return useCallback(
    (data) =>
      mutateAsync({ taskId, data }).catch((error) => {
        toast.error(getErrorMessage(error, 'Could not save your change'));
        return null;
      }),
    [mutateAsync, taskId],
  );
}

/** `'saving'` while field updates of the task are in flight, `'saved'` briefly afterwards. */
export function useTaskSaveStatus(taskId) {
  const statuses = useMutationState({
    filters: {
      mutationKey: mutationKeys.tasks.update,
      predicate: (mutation) => mutation.state.variables?.taskId === taskId,
    },
    select: (mutation) => mutation.state.status,
  });
  const saving = statuses.includes('pending');
  const lastStatus = statuses[statuses.length - 1];

  const [savedFlash, setSavedFlash] = useState(false);
  const [wasSaving, setWasSaving] = useState(saving);
  if (saving !== wasSaving) {
    setWasSaving(saving);
    setSavedFlash(!saving && lastStatus === 'success');
  }

  useEffect(() => {
    if (!savedFlash) return undefined;
    const timer = window.setTimeout(() => setSavedFlash(false), SAVED_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [savedFlash]);

  if (saving) return 'saving';
  return savedFlash ? 'saved' : 'idle';
}
