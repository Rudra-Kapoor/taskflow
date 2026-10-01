import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compactParams } from '@/api/client';
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from '@/api/projects';
import { removeProjectFromCaches, syncProjectInCaches } from '@/lib/cache';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';

const ACTIVE_PROJECTS = { status: 'active' };

/** Projects the user can access. `filters`: `{ search?, team?, status? }` (default: active). */
export function useProjects(filters = ACTIVE_PROJECTS) {
  const params = compactParams(filters);
  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: ({ signal }) => getProjects(params, { signal }),
    placeholderData: keepPreviousData,
  });
}

/** One project with its full team (members = assignable users) and the caller's `myRole`. */
export function useProject(projectId) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: ({ signal }) => getProject(projectId, { signal }),
    enabled: Boolean(projectId),
  });
}

/** vars `{ name, key, team, description?, color? }` -> the created project. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.projects.create,
    mutationFn: (data) => createProject(data),
    onSuccess: (project) => {
      // Only the full shape (populated team members) may seed the detail cache.
      if (project?.team?.members) {
        queryClient.setQueryData(queryKeys.projects.detail(project._id), project);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all }); // project counts
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/** vars `{ name?, key?, description?, color?, status? }` -> the updated project. */
export function useUpdateProject(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.projects.update,
    mutationFn: (data) => updateProject(projectId, data),
    onSuccess: (project) => syncProjectInCaches(queryClient, project),
  });
}

/** vars `projectId`. */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.projects.delete,
    mutationFn: (projectId) => deleteProject(projectId),
    onSuccess: (_data, projectId) => removeProjectFromCaches(queryClient, projectId),
  });
}
