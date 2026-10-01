import { Suspense, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import {
  ConfirmDialog,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  IconButton,
} from '@/components/ui';
import { useProjectArchive } from '@/hooks/board/useProjectArchive';
import { useDeleteProject } from '@/hooks/queries/projects';
import { pluralize } from '@/lib/format';
import { lazyNamed } from '@/lib/lazy';

const ProjectFormModal = lazyNamed(() => import('./ProjectFormModal'), 'ProjectFormModal');

/** Trigger button per placement. */
const TRIGGERS = {
  card: { variant: 'ghost', size: 'sm' },
  header: { variant: 'secondary', size: 'md' },
};

/**
 * Owner / admin menu of a project: edit, archive or restore, and delete (confirmed).
 * - `variant`: `card` (project cards, default) or `header` (board page, larger trigger)
 * - `taskCount`: shown in the delete warning (defaults to `project.taskCounts.total`)
 * - `onDeleted()`: runs after a successful delete, e.g. to leave the deleted project's board
 */
export function ProjectActions({ project, variant = 'card', taskCount, onDeleted, className }) {
  const [dialog, setDialog] = useState(null); // 'edit' | 'delete'
  const { setArchived, isPending: archivePending } = useProjectArchive(project._id, project.name);
  const deleteProject = useDeleteProject();
  const archived = project.status === 'archived';
  const tasks = taskCount ?? project.taskCounts?.total ?? 0;
  const trigger = TRIGGERS[variant] ?? TRIGGERS.card;

  const handleDelete = () => {
    deleteProject.mutate(project._id, {
      onSuccess: () => {
        toast.success(`Deleted “${project.name}”`);
        setDialog(null);
        onDeleted?.();
      },
      onError: (error) => {
        setDialog(null);
        toast.error(getErrorMessage(error, 'Could not delete the project'));
      },
    });
  };

  return (
    <div className={className}>
      <DropdownMenu
        align="end"
        trigger={
          <IconButton
            icon={MoreHorizontal}
            label={`Actions for ${project.name}`}
            variant={trigger.variant}
            size={trigger.size}
          />
        }
      >
        <DropdownLabel>Project</DropdownLabel>
        <DropdownItem icon={Pencil} onClick={() => setDialog('edit')}>
          Edit details
        </DropdownItem>
        <DropdownItem
          icon={archived ? ArchiveRestore : Archive}
          disabled={archivePending}
          onClick={() => setArchived(!archived)}
        >
          {archived ? 'Restore project' : 'Archive project'}
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem icon={Trash2} danger onClick={() => setDialog('delete')}>
          Delete project
        </DropdownItem>
      </DropdownMenu>

      {dialog === 'edit' && (
        <Suspense fallback={null}>
          <ProjectFormModal open project={project} onClose={() => setDialog(null)} />
        </Suspense>
      )}
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={handleDelete}
        loading={deleteProject.isPending}
        title={`Delete “${project.name}”?`}
        description={
          tasks > 0
            ? `Its ${pluralize(tasks, 'task')}, their comments and the project history will be permanently deleted. This can’t be undone.`
            : 'The project and its history will be permanently deleted. This can’t be undone.'
        }
        confirmLabel="Delete project"
      />
    </div>
  );
}
