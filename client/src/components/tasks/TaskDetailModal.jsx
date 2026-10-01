import { useMemo, useState } from 'react';
import { FileX2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/api/client';
import { ActivityFeed } from '@/components/activity/ActivityFeed';
import { Alert, Button, ConfirmDialog, EmptyState, ErrorState, Modal, Tabs } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useProjectRoom } from '@/context/SocketContext';
import { useTaskUpdater } from '@/hooks/board/useTaskUpdater';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { useTaskActivity } from '@/hooks/queries/activity';
import { useProject } from '@/hooks/queries/projects';
import { useDeleteTask, useTask } from '@/hooks/queries/tasks';
import { MANAGER_ROLES } from '@/lib/constants';
import { getTaskKey } from '@/lib/format';
import { getId } from '@/lib/ids';
import { CommentSection } from './CommentSection';
import { TaskDescriptionEditor } from './TaskDescriptionEditor';
import { TaskDetailHeader } from './TaskDetailHeader';
import { TaskDetailSkeleton } from './TaskDetailSkeleton';
import { TaskProperties } from './TaskProperties';
import { TaskTitleEditor } from './TaskTitleEditor';

/** 400 = malformed id, 403 = no access, 404 = missing or deleted. */
const UNAVAILABLE_STATUSES = new Set([400, 403, 404]);

function TaskActivity({ taskId }) {
  const query = useTaskActivity(taskId);
  return (
    <ActivityFeed
      query={query}
      compact
      emptyTitle="No activity yet"
      emptyDescription="Status changes, assignments and edits of this task will show up here."
    />
  );
}

function TaskDetail({ task, onClose, onDelete }) {
  const { user } = useAuth();
  const projectId = getId(task.project);
  const projectQuery = useProject(projectId);
  const project = projectQuery.data;
  const save = useTaskUpdater(task._id);
  const [tab, setTab] = useState('comments');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const members = useMemo(
    () => (project?.team?.members ?? []).map((member) => member.user).filter(Boolean),
    [project],
  );
  const archived = project?.status === 'archived';
  // Editable only once the project is known: an archived project must never flash editable.
  const readOnly = !project || archived;
  const isManager = MANAGER_ROLES.includes(project?.myRole);
  const isCreator = getId(task.createdBy) === user?._id;
  const taskKey = getTaskKey(task);

  return (
    <>
      <TaskDetailHeader
        task={task}
        canDelete={!readOnly && (isCreator || isManager)}
        onDelete={() => setConfirmingDelete(true)}
        onClose={onClose}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20.5rem] lg:grid-rows-[auto_auto_1fr] lg:gap-x-8">
        <div className="min-w-0 space-y-3 lg:col-start-1">
          {archived && (
            <Alert variant="warning">
              This task is read-only because its project is archived.
            </Alert>
          )}
          <TaskTitleEditor
            key={task._id}
            title={task.title}
            readOnly={readOnly}
            onSave={(title) => save({ title })}
          />
        </div>

        <aside
          aria-label="Task details"
          className="lg:sticky lg:top-[3.25rem] lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start"
        >
          <TaskProperties
            task={task}
            members={members}
            membersLoading={projectQuery.isLoading}
            currentUserId={user?._id}
            readOnly={readOnly}
            onSave={save}
          />
        </aside>

        <div className="min-w-0 lg:col-start-1">
          <TaskDescriptionEditor
            description={task.description}
            readOnly={readOnly}
            onSave={(description) => save({ description })}
          />
        </div>

        <section aria-label="Comments and activity" className="min-w-0 lg:col-start-1">
          <Tabs
            aria-label="Task conversation"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'comments', label: 'Comments', count: task.commentCount ?? 0 },
              { value: 'activity', label: 'Activity' },
            ]}
            className="mb-5"
          />
          {tab === 'comments' ? (
            <CommentSection
              taskId={task._id}
              currentUser={user}
              canComment={!readOnly}
              archived={archived}
              canModerate={isManager}
            />
          ) : (
            <TaskActivity taskId={task._id} />
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete(task);
        }}
        title={`Delete ${taskKey}?`}
        description={
          <>
            “{task.title}” and its comments will be permanently deleted. This cannot be undone.
          </>
        }
        confirmLabel="Delete task"
      />
    </>
  );
}

/**
 * Task dialog rendered by the app layout for `?task=<id>` (any page). Joins the task's project
 * room so edits, comments and deletions from teammates arrive live wherever it is opened.
 */
export function TaskDetailModal({ taskId, onClose }) {
  const [deleting, setDeleting] = useState(false);
  // Once deletion starts the task query is switched off: the dialog must not re-request a task
  // that is about to disappear while the URL change that closes it is still pending.
  const taskQuery = useTask(deleting ? undefined : taskId);
  const deleteTask = useDeleteTask();
  const task = taskQuery.data;
  useProjectRoom(getId(task?.project));
  useDocumentTitle(task ? `${getTaskKey(task)} · ${task.title}` : null);

  const handleDelete = (target) => {
    const taskKey = getTaskKey(target);
    setDeleting(true);
    onClose();
    // The board drops the card optimistically; the toast reports the outcome.
    toast.promise(
      deleteTask.mutateAsync({ taskId: target._id, projectId: getId(target.project) }),
      {
        loading: `Deleting ${taskKey}…`,
        success: `Deleted ${taskKey}`,
        error: (error) => getErrorMessage(error, `Could not delete ${taskKey}`),
      },
      { id: `delete-task:${target._id}` },
    );
  };

  if (deleting) return null;

  const errorStatus = taskQuery.error?.response?.status;
  const unavailable = taskQuery.isError && UNAVAILABLE_STATUSES.has(errorStatus);

  if (unavailable || (taskQuery.isError && !task)) {
    return (
      <Modal open onClose={onClose} size="sm" ariaLabel="Task unavailable">
        {unavailable ? (
          <EmptyState
            compact
            icon={FileX2}
            title="This task no longer exists or you don't have access"
            description="It may have been deleted, or it belongs to a project you are not a member of."
            action={<Button onClick={onClose}>Close</Button>}
          />
        ) : (
          <ErrorState
            compact
            title="Couldn't load this task"
            error={taskQuery.error}
            onRetry={() => taskQuery.refetch()}
          />
        )}
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="2xl"
      hideCloseButton
      ariaLabel={task ? `${getTaskKey(task)}: ${task.title}` : 'Loading task'}
      className="lg:h-auto lg:max-h-[88vh] lg:min-h-[60vh]"
    >
      {task ? (
        <TaskDetail task={task} onClose={onClose} onDelete={handleDelete} />
      ) : (
        <TaskDetailSkeleton />
      )}
    </Modal>
  );
}
