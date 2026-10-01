import { Link } from 'react-router-dom';
import { ArrowRight, FolderKanban } from 'lucide-react';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { Button, Card, EmptyState, ErrorState } from '@/components/ui';
import { useProjects } from '@/hooks/queries/projects';

const SHOWN = 4;

/**
 * The most recently active projects (lists come sorted by `lastActivityAt`, kept in order by
 * live activity), with a link to the full list.
 */
export function ProjectsOverview() {
  const { data: projects = [], isLoading, isError, error, refetch } = useProjects();

  return (
    <section aria-labelledby="dashboard-projects-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="dashboard-projects-title" className="text-base font-semibold text-fg">
            Projects
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">Recently active across your teams</p>
        </div>
        <Button as={Link} to="/projects" variant="ghost" size="sm" iconRight={ArrowRight}>
          View all
        </Button>
      </div>

      {isError && projects.length === 0 ? (
        <Card>
          <ErrorState compact title="Couldn’t load projects" error={error} onRetry={refetch} />
        </Card>
      ) : !isLoading && projects.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon={FolderKanban}
            title="No active projects"
            description="Active projects of your teams will show up here."
            action={
              <Button as={Link} to="/projects" variant="secondary" size="sm">
                Go to projects
              </Button>
            }
          />
        </Card>
      ) : (
        <ProjectGrid
          projects={projects.slice(0, SHOWN)}
          loading={isLoading}
          skeletons={SHOWN}
          columns="sm:grid-cols-2 xl:grid-cols-4"
          headingAs="h3"
        />
      )}
    </section>
  );
}
