import { Link } from 'react-router-dom';
import { AvatarGroup, Badge, ProgressBar, Skeleton, TimeAgo } from '@/components/ui';
import { cn } from '@/lib/cn';
import { MANAGER_ROLES, PROJECT_COLORS, TASK_STATUSES, calmColor } from '@/lib/constants';
import { pluralize } from '@/lib/format';
import { ProjectActions } from './ProjectActions';

/**
 * Project summary: identity (colour, key, team), description, completion progress with
 * per-status counts, the team's members and when something last happened in it. The card links
 * to the board; owners and admins also get an actions menu. `members` = the users of the
 * project's team (optional).
 */
export function ProjectCard({ project, members, headingAs: Heading = 'h2' }) {
  const counts = project.taskCounts ?? {};
  const total = counts.total ?? 0;
  const completed = counts.completed ?? 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const archived = project.status === 'archived';
  const canManage = MANAGER_ROLES.includes(project.myRole);
  const color = project.color || PROJECT_COLORS[0];

  return (
    <article className="card group relative flex min-w-0 flex-col p-5 transition-colors duration-150 hover:border-line-strong">
      {/* Eyebrow: colour square, key and team. Leaves room for the actions menu on the right. */}
      <p className={cn('flex h-5 min-w-0 items-center gap-2 text-xs', canManage && 'pr-8')}>
        <span
          aria-hidden="true"
          className={cn('h-2.5 w-2.5 shrink-0 rounded-[2px]', archived && 'grayscale')}
          style={{ backgroundColor: calmColor(color) }}
        />
        <span className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg">
          <span className="sr-only">Key </span>
          {project.key}
        </span>
        <span aria-hidden="true" className="text-line-strong">
          /
        </span>
        <span className="min-w-0 truncate text-fg-muted">{project.team?.name ?? 'Team'}</span>
        {archived && (
          <Badge size="sm" className="ml-auto">
            Archived
          </Badge>
        )}
      </p>
      {canManage && (
        <ProjectActions project={project} className="absolute right-3 top-3.5 z-10" />
      )}

      <Heading className="mt-3.5 truncate text-[15px] font-semibold tracking-[-0.005em] text-fg">
        <Link
          to={`/projects/${project._id}`}
          className="outline-none after:absolute after:-inset-px after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-brand-500 focus-visible:after:ring-offset-2 focus-visible:after:ring-offset-canvas"
        >
          {project.name}
        </Link>
      </Heading>
      <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-fg-muted">
        {project.description || <span className="text-fg-subtle">No description yet.</span>}
      </p>

      <div className="mb-5 mt-5">
        <div className="flex items-center gap-3">
          <ProgressBar
            value={percent}
            // Archived boards are read-only: their progress reads as history, not as accent.
            color={archived ? 'bg-fg-subtle/70' : undefined}
            label={`${project.name}: ${percent}% of tasks completed`}
            className="flex-1"
          />
          <span className="shrink-0 font-mono text-xs tabular-nums text-fg">
            <span aria-hidden="true">
              {completed}/{total}
            </span>
            <span className="sr-only">
              {total ? `${completed} of ${pluralize(total, 'task')} done` : 'No tasks yet'}
            </span>
          </span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
          {TASK_STATUSES.map((status) => (
            <li key={status.value} className="inline-flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} aria-hidden="true" />
              <span className="font-mono tabular-nums text-fg">{counts[status.value] ?? 0}</span>
              {status.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Three avatars leave room for "Active 10 hours ago" even in the four-up dashboard row. */}
      <div className="mt-auto flex min-h-6 items-center justify-between gap-3 border-t border-line pt-4">
        {members?.length ? (
          <AvatarGroup users={members} max={3} size="sm" />
        ) : (
          <span className="font-mono text-[11px] tabular-nums text-fg-muted">
            {pluralize(total, 'task')}
          </span>
        )}
        <span className="min-w-0 truncate font-mono text-[11px] text-fg-muted">
          Active <TimeAgo date={project.lastActivityAt ?? project.updatedAt} />
        </span>
      </div>
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="card p-5" aria-hidden="true">
      <div className="flex h-5 items-center gap-2">
        <Skeleton className="h-2.5 w-2.5 rounded-[2px]" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-4 h-4 w-3/5" />
      <div className="mt-2.5 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Skeleton className="h-1 flex-1 rounded-full" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="mt-3.5 h-3 w-4/5" />
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <div className="flex -space-x-0.5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-6 w-6 rounded-full ring-2 ring-surface" />
          ))}
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
