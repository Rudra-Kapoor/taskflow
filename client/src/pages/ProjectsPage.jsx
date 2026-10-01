import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Archive, FolderKanban, FolderOpen, Plus, SearchX, Users } from 'lucide-react';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  Select,
  Tabs,
  Tooltip,
} from '@/components/ui';
import { useDebouncedInput } from '@/hooks/pages/useDebouncedInput';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { useManagedTeams } from '@/hooks/pages/useManagedTeams';
import { useProjects } from '@/hooks/queries/projects';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import { updateSearchParams } from '@/lib/searchParams';

const STATUS_TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];
const DEFAULT_STATUS = 'active';
/** The API rejects longer project searches. */
const SEARCH_MAX = 100;

/** Projects of all the user's teams: search, team filter and Active / Archived / All tabs. */
export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const { teams, canManageAny, isLoading: teamsLoading } = useManagedTeams();
  useDocumentTitle('Projects');

  const statusParam = searchParams.get('status');
  const status = STATUS_TABS.some((tab) => tab.value === statusParam)
    ? statusParam
    : DEFAULT_STATUS;
  const search = (searchParams.get('search') ?? '').slice(0, SEARCH_MAX);
  // Only filter by a team the user belongs to (a stale link would be rejected by the API).
  const teamParam = searchParams.get('team') ?? '';
  const teamFilter = teams.some((team) => team._id === teamParam) ? teamParam : '';

  const setParam = useCallback(
    (key, value, fallback = '') => {
      updateSearchParams(
        setSearchParams,
        (params) => {
          if (value && value !== fallback) params.set(key, value);
          else params.delete(key);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [searchInput, setSearchInput] = useDebouncedInput(search, (value) =>
    setParam('search', value),
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useProjects({
    status: 'all',
    search,
    team: teamFilter,
  });
  const projects = useMemo(() => data ?? [], [data]);
  // Counts are only meaningful once a list arrived (not while loading, nor after a failed load).
  const countsKnown = data !== undefined;

  const counts = useMemo(
    () => ({
      active: projects.filter((project) => project.status === 'active').length,
      archived: projects.filter((project) => project.status === 'archived').length,
      all: projects.length,
    }),
    [projects],
  );
  const visible =
    status === 'all' ? projects : projects.filter((project) => project.status === status);
  const isFiltered = Boolean(search.trim() || teamFilter);

  const clearFilters = () => {
    setSearchInput('');
    updateSearchParams(
      setSearchParams,
      (params) => {
        params.delete('search');
        params.delete('team');
      },
      { replace: true },
    );
  };

  let content;
  if (isError && projects.length === 0) {
    content = (
      <Card>
        <ErrorState title="Couldn’t load projects" error={error} onRetry={refetch} />
      </Card>
    );
  } else if (isLoading) {
    content = <ProjectGrid loading skeletons={6} />;
  } else if (projects.length === 0 && !isFiltered) {
    content = (
      <Card>
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            !teams.length
              ? 'Projects belong to teams. Create a team first, then add its first project.'
              : canManageAny
                ? 'Projects hold your team’s board, tasks and activity. Create the first one to get going.'
                : 'Your teams have no projects yet. A team owner or admin can create the first one.'
          }
          action={
            teams.length ? (
              canManageAny && (
                <Button icon={Plus} onClick={() => setCreateOpen(true)}>
                  New project
                </Button>
              )
            ) : (
              <Button as={Link} to="/teams" icon={Users}>
                Go to teams
              </Button>
            )
          }
        />
      </Card>
    );
  } else if (visible.length === 0) {
    content = (
      <Card>
        {isFiltered ? (
          <EmptyState
            icon={SearchX}
            title="No projects match your filters"
            description="Try a different search term or team."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : status === 'archived' ? (
          <EmptyState
            icon={Archive}
            title="No archived projects"
            description="Archived projects are read-only and hidden from the sidebar. Archive one from its card menu."
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No active projects"
            description="Every project is archived right now."
            action={
              <Button variant="secondary" onClick={() => setParam('status', 'archived')}>
                View archived
              </Button>
            }
          />
        )}
      </Card>
    );
  } else {
    content = (
      <ProjectGrid
        projects={visible}
        className={cn('transition-opacity duration-200', isFetching && 'opacity-70')}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        eyebrow="Workspace"
        icon={FolderKanban}
        title="Projects"
        description="Every board across your teams, with its progress at a glance."
        actions={
          <Tooltip
            content={
              !teamsLoading && !canManageAny
                ? 'Create a team (or become a team admin) first'
                : null
            }
            align="end"
          >
            <Button
              icon={Plus}
              onClick={() => setCreateOpen(true)}
              disabled={teamsLoading || !canManageAny}
            >
              New project
            </Button>
          </Tooltip>
        }
      />

      {/* From `sm` up the status tabs and the filters share one hairline. */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:border-b sm:border-line">
        <Tabs
          aria-label="Project status"
          className="sm:-mb-px sm:border-b-0"
          value={status}
          onChange={(value) => setParam('status', value, DEFAULT_STATUS)}
          tabs={STATUS_TABS.map((tab) => ({
            ...tab,
            count: countsKnown ? counts[tab.value] : undefined,
          }))}
        />

        <div className="flex flex-col gap-2 xs:flex-row sm:pb-2">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search projects…"
            aria-label="Search projects"
            maxLength={SEARCH_MAX}
            className="w-full xs:flex-1 sm:w-56 sm:flex-none lg:w-64"
          />
          <Select
            aria-label="Filter by team"
            value={teamFilter}
            onChange={(event) => setParam('team', event.target.value)}
            className="xs:w-44"
          >
            <option value="">All teams</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {countsKnown && (
        <p
          className="eyebrow mb-3 flex min-h-5 items-center gap-3"
          aria-live="polite"
        >
          {pluralize(visible.length, 'project')}
          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="focus-ring rounded-sm font-sans text-xs font-medium normal-case tracking-normal text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
            >
              Clear filters
            </button>
          )}
        </p>
      )}

      {content}

      <ProjectFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTeamId={teamFilter || undefined}
      />
    </div>
  );
}
