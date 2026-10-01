import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban, Users } from 'lucide-react';
import { AvatarGroup, Skeleton } from '@/components/ui';
import { pluralize } from '@/lib/format';
import { RoleBadge } from './RoleBadge';
import { TeamAvatar } from './TeamAvatar';

/** Team summary for the teams grid; the whole card links to the team page. */
export function TeamCard({ team }) {
  const members = team.members ?? [];
  const users = members.map((member) => member.user).filter(Boolean);

  return (
    <article className="card group relative flex min-w-0 flex-col p-5 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
      <div className="flex items-start gap-3.5">
        <TeamAvatar team={team} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="truncate text-[15px] font-semibold tracking-tight text-fg">
            <Link
              to={`/teams/${team._id}`}
              title={team.name}
              className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-brand-500/60"
            >
              {team.name}
            </Link>
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
              {pluralize(members.length, 'member')}
            </span>
            <span className="inline-flex items-center gap-1">
              <FolderKanban className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
              {pluralize(team.projectCount ?? 0, 'project')}
            </span>
          </div>
        </div>
        <RoleBadge role={team.myRole} />
      </div>

      <p className="mt-4 line-clamp-2 min-h-[2.5rem] break-words text-sm leading-5 text-fg-muted">
        {team.description || <span className="text-fg-subtle">No description yet.</span>}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <AvatarGroup users={users} max={5} size="sm" />
        <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-300">
          Open team
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </article>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="card p-5" aria-hidden="true">
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <div className="flex -space-x-1.5">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-6 w-6 rounded-full ring-2 ring-surface" />
          ))}
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
