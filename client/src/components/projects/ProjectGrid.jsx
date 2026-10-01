import { useMemo } from 'react';
import { useTeams } from '@/hooks/queries/teams';
import { cn } from '@/lib/cn';
import { getId } from '@/lib/ids';
import { ProjectCard, ProjectCardSkeleton } from './ProjectCard';

const DEFAULT_COLUMNS = 'sm:grid-cols-2 xl:grid-cols-3';

/**
 * Responsive grid of project cards (skeletons while `loading`). Each card shows the members of
 * its team, looked up in the cached team list. `headingAs` is the card titles' heading level
 * (`h2` under a page title, `h3` inside a section).
 */
export function ProjectGrid({
  projects = [],
  loading = false,
  skeletons = 3,
  columns,
  headingAs,
  className,
}) {
  const { data: teams } = useTeams();
  const membersByTeam = useMemo(
    () =>
      new Map(
        (teams ?? []).map((team) => [
          team._id,
          (team.members ?? []).map((member) => member.user).filter(Boolean),
        ]),
      ),
    [teams],
  );

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:gap-5', columns ?? DEFAULT_COLUMNS, className)}>
      {loading
        ? Array.from({ length: skeletons }, (_, index) => <ProjectCardSkeleton key={index} />)
        : projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              members={membersByTeam.get(getId(project.team))}
              headingAs={headingAs}
            />
          ))}
    </div>
  );
}
