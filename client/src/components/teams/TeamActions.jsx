import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LogOut, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { Button, ConfirmDialog, DropdownItem, DropdownMenu, IconButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useRemoveMember } from '@/hooks/queries/teams';
import { MANAGER_ROLES } from '@/lib/constants';
import { queryKeys } from '@/lib/queryKeys';
import { DeleteTeamModal } from './DeleteTeamModal';
import { TeamFormModal } from './TeamFormModal';

/**
 * Team page header actions: edit (owner / admin), leave (everyone but the owner) and, for the
 * owner, a "more" menu holding the destructive "Delete team" in danger red.
 * `onExit()` is called once the user no longer belongs to the team.
 */
export function TeamActions({ team, onExit }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null); // 'edit' | 'delete' | 'leave'
  const leaveTeam = useRemoveMember(team._id);
  const isOwner = team.myRole === 'owner';
  const canManage = MANAGER_ROLES.includes(team.myRole);
  const close = () => setDialog(null);

  // The mutations only invalidate the team list: drop the team from it right away so the
  // teams page we land on doesn't show it until the refetch completes.
  const exitTeam = () => {
    queryClient.setQueryData(queryKeys.teams.list(), (teams) =>
      Array.isArray(teams) ? teams.filter((item) => item._id !== team._id) : teams,
    );
    onExit();
  };

  const handleLeave = () => {
    leaveTeam.mutate(user._id, {
      onSuccess: () => {
        toast.success(`You left ${team.name}`);
        exitTeam();
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Could not leave the team.')),
    });
  };

  return (
    <>
      {canManage && (
        <Button variant="secondary" icon={Pencil} onClick={() => setDialog('edit')}>
          Edit
        </Button>
      )}
      {isOwner ? (
        <DropdownMenu
          align="end"
          trigger={
            <IconButton icon={MoreHorizontal} label="More team actions" variant="secondary" />
          }
        >
          <DropdownItem icon={Trash2} danger onClick={() => setDialog('delete')}>
            Delete team
          </DropdownItem>
        </DropdownMenu>
      ) : (
        <Button variant="secondary" icon={LogOut} onClick={() => setDialog('leave')}>
          Leave team
        </Button>
      )}

      <TeamFormModal open={dialog === 'edit'} onClose={close} team={team} />
      <DeleteTeamModal
        open={dialog === 'delete'}
        onClose={close}
        team={team}
        onDeleted={exitTeam}
      />
      <ConfirmDialog
        open={dialog === 'leave'}
        onClose={close}
        onConfirm={handleLeave}
        loading={leaveTeam.isPending}
        title={`Leave ${team.name}?`}
        description="You’ll lose access to the team’s projects and tasks, and your assigned tasks will be unassigned. A team admin can add you back later."
        confirmLabel="Leave team"
      />
    </>
  );
}
