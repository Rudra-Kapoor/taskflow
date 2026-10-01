import { Link, useLocation } from 'react-router-dom';
import { Check, ChevronRight, Link2, SquareKanban, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, IconButton, Spinner } from '@/components/ui';
import { useTaskSaveStatus } from '@/hooks/board/useTaskUpdater';
import { getTaskKey } from '@/lib/format';
import { getId } from '@/lib/ids';
import { taskBoardPath } from '@/lib/taskLinks';

const FALLBACK_COLOR = '#6366f1';

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
        <span className="flex animate-fade-in items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
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
 * Sticky top bar of the task dialog: project + task key, save status and actions (open board,
 * copy link, delete, close). It bleeds to the dialog edges while its body scrolls under it
 * (`-top-5` cancels the body padding, which sticky offsets are measured from).
 */
export function TaskDetailHeader({ task, canDelete, onDelete, onClose }) {
  const location = useLocation();
  const projectId = getId(task.project);
  const onBoard = location.pathname === `/projects/${projectId}`;
  const taskPath = taskBoardPath(projectId, task._id);
  const taskKey = getTaskKey(task);

  return (
    <div className="sticky -top-5 z-10 -mx-5 -mt-5 mb-5 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:-mx-6 sm:px-6">
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-fg-muted">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-[4px] shadow-sm"
            style={{ backgroundColor: task.project?.color || FALLBACK_COLOR }}
          />
          <span className="hidden truncate font-medium sm:inline">{task.project?.name}</span>
        </span>
        <ChevronRight
          className="hidden h-3.5 w-3.5 shrink-0 text-fg-subtle sm:block"
          aria-hidden="true"
        />
        <span className="shrink-0 font-mono text-xs font-semibold text-fg">{taskKey}</span>
      </div>

      <div className="ml-2 min-w-0">
        <SaveStatus taskId={task._id} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
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
        />
        {canDelete && (
          <IconButton
            icon={Trash2}
            label="Delete task"
            size="sm"
            variant="danger"
            onClick={onDelete}
          />
        )}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
        <IconButton icon={X} label="Close" size="sm" onClick={onClose} data-modal-close="" />
      </div>
    </div>
  );
}
