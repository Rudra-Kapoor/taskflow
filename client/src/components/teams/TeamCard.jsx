import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AvatarGroup, Skeleton } from '@/components/ui';
import { RoleBadge } from './RoleBadge';
import { TeamAvatar } from './TeamAvatar';

/** "3 members": the count in mono, the noun in the running text. */
function Count({ value, noun }) {
  return (
    <span>
      <span className="font-mono tabular-nums text-fg">{value}</span> {value === 1 ? noun : `${noun}s`}
    </span>
  );
}

/** Team summary for the teams grid; the whole card links to the team page. */
export function TeamCard({ team }) {
  const members = team.members ?? [];
  const users = members.map((member) => member.user).filter(Boolean);

  return (
    <article className="card group relative flex min-w-0 flex-col p-5 transition-colors duration-150 hover:border-line-strong">
      <div className="flex items-start gap-3.5">
        <TeamAvatar team={team} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-5 tracking-[-0.005em] text-fg">
            <Link
              to={`/teams/${team._id}`}
              title={team.name}
              className="outline-none after:absolute after:-inset-px after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-brand-500 focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-canvas"
            >
              {team.name}
            </Link>
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-fg-muted">
            <Count value={members.length} noun="member" />
            <span aria-hidden="true" className="text-fg-subtle">
              ·
            </span>
            <Count value={team.projectCount ?? 0} noun="project" />
          </p>
        </div>
        <RoleBadge role={team.myRole} className="mt-px" />
      </div>

      <p className="mt-4 line-clamp-2 min-h-10 break-words text-[13px] leading-5 text-fg-muted">
        {team.description || <span className="text-fg-subtle">No description yet.</span>}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <AvatarGroup users={users} max={5} size="sm" />
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors group-hover:text-fg"
        >
          Open team
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

export function TeamCardSkeleton() {
  return (
    <div className="card p-5" aria-hidden="true">
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <div className="flex -space-x-0.5">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-6 w-6 rounded-full ring-2 ring-surface" />
          ))}
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
