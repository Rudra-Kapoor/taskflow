import { Link } from 'react-router-dom';
import { Archive } from 'lucide-react';
import { AvatarGroup, Badge, ProgressBar, Skeleton, TimeAgo } from '@/components/ui';
import { cn } from '@/lib/cn';
import { MANAGER_ROLES, PROJECT_COLORS, TASK_STATUSES } from '@/lib/constants';
import { pluralize } from '@/lib/format';
import { ProjectActions } from './ProjectActions';
import { ProjectTile } from './ProjectTile';

/**
 * Project summary: identity, description, completion progress with per-status counts, the
 * team's members and when something last happened in it. The card links to the board; owners
 * and admins also get an actions menu. `members` = the users of the project's team (optional).
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
    <article className="card group relative isolate flex min-w-0 flex-col overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
      {/* Soft wash of the project colour behind the top corner. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 -z-10 h-36 w-36 rounded-full opacity-[0.14] blur-2xl transition-opacity duration-300 group-hover:opacity-25 dark:opacity-[0.18]"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start gap-3">
        <ProjectTile projectKey={project.key} color={color} className={archived && 'grayscale'} />
        <div className="min-w-0 flex-1">
          <Heading className="truncate text-[15px] font-semibold tracking-tight text-fg">
            <Link
              to={`/projects/${project._id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-brand-500/60"
            >
              {project.name}
            </Link>
          </Heading>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-fg-muted">
            <span className="truncate">{project.team?.name ?? 'Team'}</span>
            {archived && (
              <Badge color="yellow" size="sm">
                <Archive className="h-3 w-3" aria-hidden="true" />
                Archived
              </Badge>
            )}
          </p>
        </div>
        {canManage && <ProjectActions project={project} className="relative z-10 -mr-2 -mt-1" />}
      </div>

      <p className="mt-4 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-fg-muted">
        {project.description || <span className="text-fg-subtle">No description yet.</span>}
      </p>

      <div className="mb-5 mt-5">
        <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
          <span className="text-fg-muted">
            {total ? `${completed} of ${pluralize(total, 'task')} done` : 'No tasks yet'}
          </span>
          <span className="font-semibold tabular-nums text-fg">{percent}%</span>
        </div>
        <ProgressBar
          value={percent}
          color={color}
          label={`${project.name}: ${percent}% of tasks completed`}
        />
        <ul className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-fg-muted">
          {TASK_STATUSES.map((status) => (
            <li key={status.value} className="inline-flex items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} aria-hidden="true" />
              <span className="font-medium tabular-nums text-fg">{counts[status.value] ?? 0}</span>
              {status.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Three avatars leave room for "Active 10 hours ago" even in the four-up dashboard row. */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        {members?.length ? (
          <AvatarGroup users={members} max={3} size="sm" />
        ) : (
          <span className="text-xs text-fg-muted">{pluralize(total, 'task')}</span>
        )}
        <span className="min-w-0 truncate text-xs text-fg-muted">
          Active <TimeAgo date={project.lastActivityAt ?? project.updatedAt} />
        </span>
      </div>
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="card p-5" aria-hidden="true">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-3/4" />
      </div>
      <div className="mt-6 space-y-2.5">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <div className="flex -space-x-1.5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-6 w-6 rounded-full ring-2 ring-surface" />
          ))}
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}
