import { useEffect, useState } from 'react';
import { Lock, MessagesSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { ConfirmDialog, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import {
  useAddComment,
  useComments,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/queries/comments';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';

function CommentsSkeleton() {
  return (
    <ul className="space-y-5" aria-label="Loading comments">
      {[80, 55].map((width) => (
        <li key={width} className="flex gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-12 rounded-xl" style={{ width: `${width}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Task conversation: comments oldest to newest (kept live by the real-time cache sync) and the
 * composer. Authors edit their own comments; authors and team managers can delete them.
 * `archived` explains why commenting is off (otherwise the composer is simply hidden).
 */
export function CommentSection({ taskId, currentUser, canComment, canModerate, archived }) {
  const commentsQuery = useComments(taskId);
  const { mutateAsync: addComment } = useAddComment(taskId);
  const { mutateAsync: updateComment } = useUpdateComment(taskId);
  const deleteComment = useDeleteComment(taskId);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [scrollTargetId, setScrollTargetId] = useState(null);
  const comments = commentsQuery.data;

  // Bring a just-posted comment into view once it is rendered.
  useEffect(() => {
    if (!scrollTargetId || !comments?.some((comment) => comment._id === scrollTargetId)) return;
    document
      .getElementById(`comment-${scrollTargetId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setScrollTargetId(null);
  }, [scrollTargetId, comments]);

  const handleAdd = async (body) => {
    try {
      const comment = await addComment(body);
      setScrollTargetId(comment._id);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not post your comment'));
      return false;
    }
  };

  const handleUpdate = async (commentId, body) => {
    try {
      await updateComment({ commentId, body });
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not save your comment'));
      return false;
    }
  };

  const confirmDelete = () => {
    deleteComment.mutate(pendingDelete._id, {
      onSuccess: () => toast.success('Comment deleted'),
      onError: (error) => toast.error(getErrorMessage(error, 'Could not delete the comment')),
      onSettled: () => setPendingDelete(null),
    });
  };

  let list;
  if (commentsQuery.isPending) {
    list = <CommentsSkeleton />;
  } else if (commentsQuery.isError && !comments) {
    list = (
      <ErrorState
        compact
        title="Couldn't load comments"
        error={commentsQuery.error}
        onRetry={() => commentsQuery.refetch()}
      />
    );
  } else if (comments.length === 0) {
    list = (
      <EmptyState
        compact
        icon={MessagesSquare}
        title="No comments yet"
        description={
          canComment ? 'Start the conversation: ask a question or share an update.' : undefined
        }
      />
    );
  } else {
    list = (
      <ol className="space-y-5">
        {comments.map((comment) => {
          const isOwn = comment.author?._id === currentUser?._id;
          return (
            <CommentItem
              key={comment._id}
              comment={comment}
              isOwn={isOwn}
              canEdit={canComment && isOwn}
              canDelete={canComment && (isOwn || canModerate)}
              onUpdate={handleUpdate}
              onRequestDelete={setPendingDelete}
            />
          );
        })}
      </ol>
    );
  }

  return (
    <div className="space-y-6">
      {list}

      {canComment ? (
        <CommentComposer user={currentUser} onSubmit={handleAdd} />
      ) : (
        archived && (
          <p className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted/60 px-3.5 py-2.5 text-xs text-fg-muted">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Comments are read-only while the project is archived.
          </p>
        )
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleteComment.isPending}
        title="Delete this comment?"
        description="The comment will be removed for everyone. This cannot be undone."
        confirmLabel="Delete comment"
      />
    </div>
  );
}
