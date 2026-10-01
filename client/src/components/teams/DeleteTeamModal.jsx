import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { Alert, Button, FormField, Input, Modal } from '@/components/ui';
import { useDeleteTeam } from '@/hooks/queries/teams';
import { pluralize } from '@/lib/format';

/**
 * Deleting a team wipes its projects, tasks and history, so the owner confirms by typing the
 * team name. `onDeleted()` runs right after the deletion succeeded.
 */
export function DeleteTeamModal({ open, ...props }) {
  if (!open) return null;
  return <DeleteTeamDialog {...props} />;
}

function DeleteTeamDialog({ team, onClose, onDeleted }) {
  const formId = useId();
  const [confirmation, setConfirmation] = useState('');
  const deleteTeam = useDeleteTeam();
  const confirmed = confirmation.trim() === team.name.trim();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!confirmed) return;
    deleteTeam.mutate(team._id, {
      onSuccess: () => {
        toast.success(`Team “${team.name}” was deleted`);
        onDeleted?.();
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Could not delete the team.')),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      dismissible={!deleteTeam.isPending}
      title="Delete team"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deleteTeam.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="danger"
            icon={Trash2}
            disabled={!confirmed}
            loading={deleteTeam.isPending}
          >
            Delete team
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4">
        <Alert variant="warning" title="This can’t be undone">
          Deleting <strong>{team.name}</strong> permanently removes its{' '}
          {pluralize(team.projectCount ?? 0, 'project')} with all their tasks, comments and
          activity, for all {pluralize(team.members?.length ?? 0, 'member')}.
        </Alert>
        <FormField
          label={
            <>
              Type <span className="font-semibold">{team.name}</span> to confirm
            </>
          }
        >
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={team.name}
            autoComplete="off"
            spellCheck={false}
            data-autofocus
          />
        </FormField>
      </form>
    </Modal>
  );
}
