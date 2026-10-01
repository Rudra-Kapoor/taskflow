import { Link } from 'react-router-dom';
import { ProjectActions } from '@/components/projects/ProjectActions';
import { Button, EmptyState, ErrorState, ProgressBar, Skeleton, TimeAgo } from '@/components/ui';
import { useProjects } from '@/hooks/queries/projects';
import { MANAGER_ROLES, PROJECT_COLORS, calmColor } from '@/lib/constants';
import { DashboardSection, SectionLink } from './DashboardSection';

const SHOWN = 4;

/**
 * The most recently active projects (lists come sorted by `lastActivityAt`, kept in order by
 * live activity) as quiet rows with a thin progress rule, and a link to the full list.
 */
export function ProjectsOverview({ className }) {
  const { data: projects = [], isLoading, isError, error, refetch } = useProjects();

  let content;
  if (isError && projects.length === 0) {
    content = (
      <ErrorState compact title="Couldn’t load projects" error={error} onRetry={refetch} />
    );
  } else if (isLoading) {
    content = <ProjectRowsSkeleton />;
  } else if (projects.length === 0) {
    content = (
      <EmptyState
        compact
        title="No active projects"
        description="Active projects of your teams will show up here."
        action={
          <Button as={Link} to="/projects" variant="secondary" size="sm">
            Go to projects
          </Button>
        }
      />
    );
  } else {
    const shown = projects.slice(0, SHOWN);
    // Rows without an actions menu keep its place, so the percentages line up.
    const hasActions = shown.some((project) => MANAGER_ROLES.includes(project.myRole));
    content = (
      <ul className="divide-y divide-line">
        {shown.map((project) => (
          <ProjectRow key={project._id} project={project} actionsSlot={hasActions} />
        ))}
      </ul>
    );
  }

  return (
    <DashboardSection
      title="Projects"
      description="Recently active across your teams"
      action={<SectionLink to="/projects" />}
      className={className}
    >
      {content}
    </DashboardSection>
  );
}

/** Name and completion on one line, a 2px progress rule, then tasks done, team and last activity. */
function ProjectRow({ project, actionsSlot }) {
  const counts = project.taskCounts ?? {};
  const total = counts.total ?? 0;
  const completed = counts.completed ?? 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const canManage = MANAGER_ROLES.includes(project.myRole);

  return (
    <li className="py-1">
      <div className="group relative -mx-2 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-muted/70 dark:hover:bg-surface-hover/50">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: calmColor(project.color || PROJECT_COLORS[0]) }}
          />
          <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
            {/* The link covers the whole row; the actions menu sits above it. */}
            <Link
              to={`/projects/${project._id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-brand-500"
            >
              {project.name}
            </Link>
          </h3>
          <span className="shrink-0 font-mono text-xs tabular-nums text-fg">{percent}%</span>
          {canManage ? (
            <ProjectActions project={project} className="relative z-10 -my-1.5 -mr-1.5" />
          ) : (
            actionsSlot && <span aria-hidden="true" className="-mr-1.5 w-8 shrink-0" />
          )}
        </div>
        <div className="mt-2.5 pl-5">
          <ProgressBar
            value={percent}
            label={`${project.name}: ${percent}% of tasks completed`}
            className="h-0.5"
          />
          <p className="mt-2 flex min-w-0 items-center justify-between gap-3 text-xs text-fg-muted">
            <span className="min-w-0 truncate">
              <span className="font-mono tabular-nums text-fg">{completed}</span>
              <span className="font-mono tabular-nums">/{total}</span> done
              {project.team?.name && (
                <>
                  <span className="mx-1.5 text-fg-subtle" aria-hidden="true">
                    ·
                  </span>
                  {project.team.name}
                </>
              )}
            </span>
            <span className="shrink-0">
              Active <TimeAgo date={project.lastActivityAt ?? project.updatedAt} />
            </span>
          </p>
        </div>
      </div>
    </li>
  );
}

function ProjectRowsSkeleton() {
  return (
    <ul className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: SHOWN }, (_, index) => (
        <li key={index} className="py-3.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-2 w-2 rounded-[2px]" />
            <Skeleton className="h-3.5" style={{ width: `${[48, 36, 54, 42][index]}%` }} />
            <Skeleton className="ml-auto h-3 w-8" />
          </div>
          <div className="mt-3 space-y-2.5 pl-5">
            <Skeleton className="h-0.5 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}
