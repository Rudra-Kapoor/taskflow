import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addComment, deleteComment, getComments, updateComment } from '@/api/comments';
import {
  findCachedTask,
  getCachedCommentCount,
  removeCommentFromCache,
  setTaskCommentCount,
  upsertCommentInCache,
} from '@/lib/cache';
import { getId } from '@/lib/ids';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';

/** Aligns the task's `commentCount` with its cached thread (threads are never paginated). */
function syncCommentCount(queryClient, taskId, projectId) {
  const count = getCachedCommentCount(queryClient, taskId);
  if (count === undefined) return;
  const taskProjectId = projectId ?? getId(findCachedTask(queryClient, taskId)?.project);
  setTaskCommentCount(queryClient, taskId, taskProjectId, count);
}

/** Comments of a task, oldest first (kept live by socket events while in the project room). */
export function useComments(taskId) {
  return useQuery({
    queryKey: queryKeys.comments(taskId),
    queryFn: ({ signal }) => getComments(taskId, { signal }),
    enabled: Boolean(taskId),
  });
}

/** vars `body` -> the created comment. */
export function useAddComment(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.comments.add,
    mutationFn: (body) => addComment(taskId, body),
    onSuccess: (comment) => {
      upsertCommentInCache(queryClient, taskId, comment);
      syncCommentCount(queryClient, taskId, getId(comment?.project));
    },
  });
}

/** vars `{ commentId, body }` -> the updated comment. */
export function useUpdateComment(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.comments.update,
    mutationFn: ({ commentId, body }) => updateComment(commentId, body),
    onSuccess: (comment) => upsertCommentInCache(queryClient, taskId, comment),
  });
}

/** vars `commentId`. */
export function useDeleteComment(taskId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.comments.delete,
    mutationFn: (commentId) => deleteComment(commentId),
    onSuccess: (_data, commentId) => {
      removeCommentFromCache(queryClient, taskId, commentId);
      syncCommentCount(queryClient, taskId);
    },
  });
}
