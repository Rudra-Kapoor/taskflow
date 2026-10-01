import { useMemo } from 'react';
import { Avatar } from '@/components/ui';
import { OptionPicker } from './OptionPicker';
import { PickerTrigger } from './PickerTrigger';

const UNASSIGNED = '';

/**
 * Assignee select with avatars and search. `value` is a user id (`''` = unassigned) and
 * `members` the assignable users (the project's team); the current user is listed first.
 * `selectedUser` (the populated assignee) keeps the trigger right while members load.
 */
export function AssigneeSelect({
  value,
  onChange,
  members,
  selectedUser = null,
  currentUserId,
  loading = false,
  disabled = false,
  variant = 'field',
  id,
  className,
}) {
  const options = useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      if (a._id === currentUserId) return -1;
      if (b._id === currentUserId) return 1;
      return a.name.localeCompare(b.name);
    });
    return [
      {
        value: UNASSIGNED,
        label: 'Unassigned',
        icon: <Avatar user={null} size="xs" decorative />,
      },
      ...sorted.map((user) => ({
        value: user._id,
        label: user._id === currentUserId ? `${user.name} (you)` : user.name,
        description: user.title || user.email,
        keywords: user.email,
        icon: <Avatar user={user} size="xs" decorative />,
      })),
    ];
  }, [members, currentUserId]);

  const selected =
    members.find((user) => user._id === value) ??
    (value && selectedUser?._id === value ? selectedUser : null);

  return (
    <OptionPicker
      trigger={
        <PickerTrigger id={id} variant={variant} className={className}>
          <Avatar user={selected} size="xs" decorative />
          <span className={selected ? 'truncate' : 'truncate text-fg-muted'}>
            {selected ? selected.name : 'Unassigned'}
          </span>
        </PickerTrigger>
      }
      options={options}
      value={selected ? selected._id : UNASSIGNED}
      onChange={onChange}
      label="Assignee"
      searchable
      searchPlaceholder="Search people…"
      emptyText="No team member matches"
      loading={loading}
      disabled={disabled}
      width="w-72"
    />
  );
}
