import { Link, useLocation } from 'react-router-dom';
import { Check, Link2, SquareKanban, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, IconButton, Spinner } from '@/components/ui';
import { useTaskSaveStatus } from '@/hooks/board/useTaskUpdater';
import { getTaskKey } from '@/lib/format';
import { getId } from '@/lib/ids';
import { taskBoardPath } from '@/lib/taskLinks';

const FALLBACK_COLOR = '#8A857A';

function SaveStatus({ taskId }) {
  const status = useTaskSaveStatus(taskId);
  return (
    <span role="status" aria-live="polite" className="flex items-center text-xs text-fg-muted">
      {status === 'saving' && (
        <span className="flex items-center gap-1.5">
          <Spinner size="xs" />
          Saving…
        </span>
      )}
      {status === 'saved' && (
        <span className="flex animate-fade-in items-center gap-1 text-fg-muted">
          <Check className="h-3.5 w-3.5 text-status-done" aria-hidden="true" />
          Saved
        </span>
      )}
    </span>
  );
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Link copied');
  } catch {
    toast.error('Could not copy the link. Copy it from the address bar instead.');
  }
}

/**
 * Sticky top bar of the task dialog: project / task key breadcrumb, save status and actions
 * (open board, copy link, delete, close). It bleeds to the dialog edges (`-mx-*` cancels the
 * body's side padding; the body has no top padding) while the body scrolls under it.
 */
export function TaskDetailHeader({ task, canDelete, onDelete, onClose }) {
  const location = useLocation();
  const projectId = getId(task.project);
  const onBoard = location.pathname === `/projects/${projectId}`;
  const taskPath = taskBoardPath(projectId, task._id);
  const taskKey = getTaskKey(task);

  return (
    <div className="sticky top-0 z-10 -mx-5 mb-7 flex h-14 items-center gap-2 border-b border-line bg-surface px-5 sm:-mx-8 sm:mb-9 sm:px-8">
      <div className="flex min-w-0 items-center gap-2 text-[13px]">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-[2px]"
          style={{ backgroundColor: task.project?.color || FALLBACK_COLOR }}
        />
        <span className="hidden min-w-0 truncate text-fg-muted sm:inline">
          {task.project?.name}
        </span>
        <span aria-hidden="true" className="hidden text-fg-subtle sm:inline">
          /
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-fg">{taskKey}</span>
      </div>

      <div className="ml-3 min-w-0">
        <SaveStatus taskId={task._id} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        {!onBoard && (
          <Button
            as={Link}
            to={taskPath}
            variant="ghost"
            size="sm"
            icon={SquareKanban}
            aria-label="Open board"
            title="Open this task on its project board"
          >
            <span className="hidden sm:inline">Open board</span>
          </Button>
        )}
        <IconButton
          icon={Link2}
          label="Copy link to task"
          size="sm"
          onClick={() => copyToClipboard(`${window.location.origin}${taskPath}`)}
          className="touch:h-9 touch:w-9"
        />
        {canDelete && (
          <IconButton
            icon={Trash2}
            label="Delete task"
            size="sm"
            variant="danger"
            onClick={onDelete}
            className="touch:h-9 touch:w-9"
          />
        )}
        <span className="mx-1.5 h-4 w-px bg-line" aria-hidden="true" />
        <IconButton
          icon={X}
          label="Close"
          size="sm"
          onClick={onClose}
          data-modal-close=""
          className="touch:h-9 touch:w-9"
        />
      </div>
    </div>
  );
}
