import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { Avatar, Button, Card, ConfirmDialog, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useRemoveMember, useUpdateMemberRole } from '@/hooks/queries/teams';
import { cn } from '@/lib/cn';
import { MANAGER_ROLES, ROLE_META } from '@/lib/constants';
import { formatDate, getFirstName } from '@/lib/format';
import { getId } from '@/lib/ids';
import { AddMemberModal } from './AddMemberModal';
import { RoleBadge } from './RoleBadge';

/**
 * Column grid shared by the header and the rows. Phones: the member, then role + remove on a
 * second line; `sm`: member · role · remove; `lg`: member · email · role · joined · remove.
 */
const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 sm:grid-cols-[minmax(0,1fr)_8.5rem_4.5rem] ' +
  'sm:gap-x-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_8.5rem_7rem_4.5rem]';

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };

const byRoleThenName = (a, b) =>
  (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3) ||
  (a.user?.name ?? '').localeCompare(b.user?.name ?? '');

/**
 * Who may remove whom (API rules): the owner removes anyone but themselves, admins remove plain
 * members, nobody removes the owner. Leaving the team is a separate action.
 */
function canRemoveMember(myRole, member, isMe) {
  if (isMe || member.role === 'owner') return false;
  if (myRole === 'owner') return true;
  return myRole === 'admin' && member.role === 'member';
}

/** Team roster: roles (editable by the owner), join dates, add & remove members. */
export function MembersCard({ team }) {
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const updateRole = useUpdateMemberRole(team._id);
  const removeMember = useRemoveMember(team._id);

  const myRole = team.myRole;
  const canManage = MANAGER_ROLES.includes(myRole);
  const members = useMemo(() => [...(team.members ?? [])].sort(byRoleThenName), [team.members]);

  const changeRole = (member, role) => {
    const name = member.user?.name ?? 'This member';
    updateRole.mutate(
      { userId: getId(member.user), role },
      {
        onSuccess: () =>
          toast.success(`${name} is now ${role === 'admin' ? 'an admin' : 'a member'}`),
        onError: (error) => toast.error(getErrorMessage(error, 'Could not change the role.')),
      },
    );
  };

  const confirmRemoval = () => {
    const member = memberToRemove;
    removeMember.mutate(getId(member.user), {
      onSuccess: () => {
        toast.success(`${member.user?.name ?? 'The member'} was removed from ${team.name}`);
        setMemberToRemove(null);
      },
      onError: (error) => toast.error(getErrorMessage(error, 'Could not remove this member.')),
    });
  };

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="flex items-baseline gap-2 text-[15px] font-semibold tracking-[-0.005em] text-fg">
            Members
            <span className="font-mono text-xs font-normal tabular-nums text-fg-muted">
              {members.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Everyone here can see the team’s projects and be assigned tasks.
          </p>
        </div>
        {canManage && (
          <Button variant="secondary" size="sm" icon={UserPlus} onClick={() => setAddOpen(true)}>
            Add member
          </Button>
        )}
      </div>

      <div
        className={cn(
          ROW_GRID,
          'eyebrow hidden border-b border-line px-5 py-2.5 lg:grid',
        )}
        aria-hidden="true"
      >
        <span>Member</span>
        <span>Email</span>
        <span>Role</span>
        <span>Joined</span>
        <span />
      </div>

      <ul className="divide-y divide-line">
        {members.map((member) => {
          const userId = getId(member.user);
          const isMe = userId === user?._id;
          const pendingRole =
            updateRole.isPending && updateRole.variables?.userId === userId
              ? updateRole.variables.role
              : null;

          return (
            <MemberRow
              key={userId}
              member={member}
              isMe={isMe}
              canEditRole={myRole === 'owner' && member.role !== 'owner'}
              canRemove={canRemoveMember(myRole, member, isMe)}
              displayRole={pendingRole ?? member.role}
              roleBusy={Boolean(pendingRole)}
              onRoleChange={(role) => changeRole(member, role)}
              onRemove={() => setMemberToRemove(member)}
            />
          );
        })}
      </ul>

      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} team={team} />

      <ConfirmDialog
        open={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={confirmRemoval}
        loading={removeMember.isPending}
        title={`Remove ${memberToRemove?.user?.name ?? 'member'}?`}
        description={
          <>
            {getFirstName(memberToRemove?.user?.name) || 'They'} will lose access to{' '}
            <span className="font-medium text-fg">{team.name}</span> and its projects. Tasks
            assigned to them become unassigned.
          </>
        }
        confirmLabel="Remove member"
      />
    </Card>
  );
}

function MemberRow({
  member,
  isMe,
  canEditRole,
  canRemove,
  displayRole,
  roleBusy,
  onRoleChange,
  onRemove,
}) {
  const person = member.user ?? {};
  const name = person.name ?? 'Unknown user';

  return (
    <li
      className={cn(
        ROW_GRID,
        'items-center gap-y-2 px-4 py-3 transition-colors hover:bg-surface-muted/40 sm:px-5',
      )}
    >
      <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
        <Avatar user={member.user} size="md" />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">{name}</span>
            {isMe && (
              <span className="inline-flex h-[18px] shrink-0 items-center rounded-sm border border-line-strong px-1 font-mono text-[11px] uppercase leading-none tracking-[0.04em] text-fg-muted">
                You
              </span>
            )}
          </p>
          {/* Below `lg` the email has no column of its own: it follows the job title here. */}
          <p className={cn('truncate text-xs text-fg-muted', !person.title && 'lg:hidden')}>
            {person.title}
            {person.title && person.email && (
              <span aria-hidden="true" className="lg:hidden">
                {' · '}
              </span>
            )}
            <span className="font-mono text-[11px] lg:hidden">{person.email}</span>
          </p>
        </div>
      </div>

      <p className="hidden truncate font-mono text-xs text-fg-muted lg:block">{person.email}</p>

      {/* Phones: role and remove share a second line, aligned with the name (32px avatar +
          12px gap); from `sm` up they are columns of the member's row. */}
      <div className="pl-11 sm:pl-0">
        {canEditRole ? (
          <Select
            aria-label={`Role of ${name}`}
            value={displayRole}
            disabled={roleBusy}
            onChange={(event) => onRoleChange(event.target.value)}
            className="h-8 w-32 text-[13px] sm:w-full"
          >
            {['admin', 'member'].map((role) => (
              <option key={role} value={role}>
                {ROLE_META[role].label}
              </option>
            ))}
          </Select>
        ) : (
          <RoleBadge role={member.role} size="md" />
        )}
      </div>

      <p className="hidden font-mono text-xs tabular-nums text-fg-muted lg:block">
        <span className="sr-only">Joined </span>
        {member.joinedAt ? formatDate(member.joinedAt) : '—'}
      </p>

      <div className="flex justify-end">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${name}`}
            className="focus-ring -mr-2 inline-flex h-8 items-center rounded-md px-2 text-[13px] font-medium text-danger underline-offset-2 transition-colors hover:underline touch:h-9"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}
