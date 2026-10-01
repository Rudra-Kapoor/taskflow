import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { UserMinus, UserPlus } from 'lucide-react';
import { getErrorMessage } from '@/api/client';
import { Avatar, Badge, Button, Card, ConfirmDialog, IconButton, Select } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useRemoveMember, useUpdateMemberRole } from '@/hooks/queries/teams';
import { MANAGER_ROLES, ROLE_META } from '@/lib/constants';
import { formatDate, getFirstName } from '@/lib/format';
import { getId } from '@/lib/ids';
import { AddMemberModal } from './AddMemberModal';
import { RoleBadge } from './RoleBadge';

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
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
            Members
            <Badge color="gray" size="sm">
              {members.length}
            </Badge>
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Everyone here can see the team’s projects and be assigned tasks.
          </p>
        </div>
        {canManage && (
          <Button size="sm" icon={UserPlus} onClick={() => setAddOpen(true)}>
            Add member
          </Button>
        )}
      </div>

      <div
        className="hidden items-center gap-6 border-b border-line bg-surface-muted/60 px-5 py-2 text-2xs font-semibold uppercase tracking-wider text-fg-muted lg:flex"
        aria-hidden="true"
      >
        <span className="flex-1">Member</span>
        <span className="w-32">Role</span>
        <span className="w-28">Joined</span>
        <span className="w-8" />
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
    <li className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 transition-colors hover:bg-surface-hover/50 sm:px-5">
      <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
        <Avatar user={member.user} size="lg" />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-fg">{name}</span>
            {isMe && (
              <Badge color="brand" size="sm">
                You
              </Badge>
            )}
          </p>
          <p className="truncate text-xs text-fg-muted">
            {person.title ? `${person.title} · ` : ''}
            {person.email}
          </p>
        </div>
      </div>

      {/* Phones: role and remove get a row of their own, aligned with the name (40px avatar +
          12px gap); from `sm` up they sit at the end of the member's row. */}
      <div className="flex basis-full items-center justify-between gap-6 pl-[52px] sm:ml-auto sm:basis-auto sm:justify-end sm:pl-0">
        <div className="w-32">
          {canEditRole ? (
            <Select
              aria-label={`Role of ${name}`}
              value={displayRole}
              disabled={roleBusy}
              onChange={(event) => onRoleChange(event.target.value)}
              className="h-8 text-[13px]"
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
        <p className="hidden w-28 text-xs text-fg-muted lg:block">
          <span className="sr-only">Joined </span>
          {member.joinedAt ? formatDate(member.joinedAt) : '—'}
        </p>
        <div className="flex w-8 justify-end">
          {canRemove && (
            <IconButton
              icon={UserMinus}
              label={`Remove ${name}`}
              variant="danger"
              size="sm"
              onClick={onRemove}
            />
          )}
        </div>
      </div>
    </li>
  );
}
