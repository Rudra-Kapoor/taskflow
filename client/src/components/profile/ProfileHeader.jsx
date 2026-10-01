import { Avatar } from '@/components/ui';
import { formatDate } from '@/lib/format';

/**
 * Identity row: large avatar, name and job title, with the account facts in mono on the right
 * (a live preview of unsaved edits to the name, title and colour).
 */
export function ProfileHeader({ user }) {
  const facts = [
    { label: 'Email', value: user.email },
    user.createdAt && {
      label: 'Member since',
      value: formatDate(user.createdAt, 'MMMM d, yyyy'),
    },
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-6 pb-8 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar
          user={user}
          size="xl"
          className="h-16 w-16 text-xl transition-colors duration-300"
        />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-[-0.01em] text-fg">{user.name}</h2>
          <p className="mt-0.5 truncate text-sm text-fg-muted">
            {user.title || 'No job title yet'}
          </p>
        </div>
      </div>

      <dl className="grid min-w-0 grid-cols-1 gap-4 xs:grid-cols-2 sm:ml-auto sm:flex sm:gap-0">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="min-w-0 sm:border-l sm:border-line sm:px-6 sm:last:pr-0"
          >
            <dt className="eyebrow">{fact.label}</dt>
            <dd className="mt-1.5 truncate font-mono text-[13px] text-fg">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
