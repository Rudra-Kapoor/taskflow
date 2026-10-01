import { Briefcase, CalendarDays, Mail } from 'lucide-react';
import { Avatar, Card } from '@/components/ui';
import { AVATAR_COLORS } from '@/lib/constants';
import { formatDate } from '@/lib/format';

/** Profile banner in the user's colour with a large avatar (live preview while editing). */
export function ProfileHeader({ user }) {
  const color = user.avatarColor || AVATAR_COLORS[0];

  return (
    <Card padding={false} className="overflow-hidden">
      <div
        aria-hidden="true"
        className="relative h-24 transition-[background] duration-500 sm:h-28"
        style={{ background: `linear-gradient(120deg, ${color} 0%, ${color}cc 45%, #8b5cf6 100%)` }}
      >
        <div className="bg-dot-grid absolute inset-0 [mask-image:linear-gradient(to_right,transparent,black_40%,black)]" />
        <div className="absolute inset-0 hidden bg-black/20 dark:block" />
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
          <Avatar
            user={user}
            size="xl"
            className="-mt-10 h-20 w-20 text-2xl shadow-lg ring-4 ring-surface transition-colors duration-500"
          />
          <div className="min-w-0 sm:pt-3">
            <h2 className="truncate text-xl font-semibold tracking-tight text-fg">{user.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted">
              <Briefcase className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <span className="truncate">{user.title || 'No job title yet'}</span>
            </p>
          </div>
        </div>

        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm text-fg-muted">
          <li className="flex min-w-0 items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span className="sr-only">Email:</span>
            <span className="truncate">{user.email}</span>
          </li>
          {user.createdAt && (
            <li className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              Member since {formatDate(user.createdAt, 'MMMM d, yyyy')}
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
}
