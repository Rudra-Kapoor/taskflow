import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { useUpdateProject } from '@/hooks/queries/projects';

/** Archives / restores a project with success and error toasts (naming it when known). */
export function useProjectArchive(projectId, projectName) {
  const { mutate, isPending } = useUpdateProject(projectId);

  const setArchived = useCallback(
    (archived) => {
      const name = projectName ? `“${projectName}”` : 'the project';
      mutate(
        { status: archived ? 'archived' : 'active' },
        {
          onSuccess: () => {
            toast.success(archived ? `Archived ${name}. It is now read-only.` : `Restored ${name}`);
          },
          onError: (error) => {
            toast.error(
              getErrorMessage(
                error,
                archived ? `Could not archive ${name}` : `Could not restore ${name}`,
              ),
            );
          },
        },
      );
    },
    [mutate, projectName],
  );

  return { setArchived, isPending };
}
