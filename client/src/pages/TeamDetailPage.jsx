import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FolderKanban, Plus, SearchX, ShieldAlert } from 'lucide-react';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { MembersCard } from '@/components/teams/MembersCard';
import { TeamActions } from '@/components/teams/TeamActions';
import { TeamAvatar } from '@/components/teams/TeamAvatar';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { useProjects } from '@/hooks/queries/projects';
import { useTeam } from '@/hooks/queries/teams';
import { cn } from '@/lib/cn';
import { MANAGER_ROLES, ROLE_META } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { getId, isObjectId } from '@/lib/ids';

/**
 * Shared with the projects page and the task filters. Deliberately not filtered by `team` on the
 * server: that request is refused (403) the moment the user leaves or loses the team, while
 * this list simply stops containing its projects.
 */
const ALL_PROJECTS = { status: 'all' };

/** API answers meaning "this team isn't (or is no longer) available to you". */
const UNAVAILABLE_STATUSES = [400, 403, 404];

export function TeamDetailPage() {
  const { teamId } = useParams();
  // A malformed id can't be a team: skip the request that would be refused anyway.
  const validId = isObjectId(teamId);
  const { data: team, isLoading, error, refetch } = useTeam(validId ? teamId : undefined);
  const status = error?.response?.status;
  useDocumentTitle(team?.name ?? 'Team');

  if (!validId || UNAVAILABLE_STATUSES.includes(status)) {
    return <TeamUnavailable notFound={status !== 403} />;
  }
  if (team) return <TeamDetail team={team} />;
  if (error && !isLoading) {
    return (
      <PageShell>
        <Card>
          <ErrorState title="Couldn’t load this team" error={error} onRetry={refetch} />
        </Card>
      </PageShell>
    );
  }
  return <TeamDetailSkeleton />;
}

/**
 * From `sm` up the top bar shows "Teams / <team>"; phones have no room for it there, so the page
 * starts with a quiet way back instead.
 */
function PageShell({ children }) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <p className="-mt-2 mb-3 sm:hidden">
        <Link
          to="/teams"
          className="focus-ring -ml-1.5 inline-flex h-9 items-center gap-1.5 rounded-md px-1.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All teams
        </Link>
      </p>
      {children}
    </div>
  );
}

/** Key facts in a row of columns divided by hairlines (a 2 x 2 grid on phones). */
function TeamFacts({ facts }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:flex sm:flex-wrap sm:gap-y-4">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="min-w-0 sm:border-l sm:border-line sm:px-6 sm:first:border-l-0 sm:first:pl-0"
        >
          <dt className="eyebrow">{fact.label}</dt>
          <dd className={cn('mt-1.5 truncate text-sm text-fg', fact.mono && 'font-mono tabular-nums')}>
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Long descriptions are clamped to three lines with a More / Less toggle. */
function TeamDescription({ text }) {
  const id = useId();
  const textRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  // Only offer "More" when the clamp actually hides something (re-checked on resize).
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || expanded) return undefined;
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <>
      <span
        ref={textRef}
        id={id}
        className={cn('block max-w-3xl text-pretty break-words', !expanded && 'line-clamp-3')}
      >
        {text}
      </span>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls={id}
          className="focus-ring mt-1 rounded font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {expanded ? 'Less' : 'More'}
        </button>
      )}
    </>
  );
}

function TeamDetail({ team }) {
  const navigate = useNavigate();
  // Left, deleted or removed: the team page no longer makes sense.
  const exitTeam = useCallback(() => navigate('/teams', { replace: true }), [navigate]);
  const members = team.members ?? [];
  const facts = [
    { label: 'Your role', value: ROLE_META[team.myRole]?.label ?? '—' },
    { label: 'Members', value: members.length, mono: true },
    team.owner?.name && { label: 'Owner', value: team.owner.name },
    team.createdAt && { label: 'Created', value: formatDate(team.createdAt), mono: true },
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Team"
        icon={<TeamAvatar team={team} size="lg" className="h-full w-full" />}
        // Wraps instead of truncating: a long team name is still readable in full.
        title={<span className="block whitespace-normal break-words">{team.name}</span>}
        description={
          team.description ? <TeamDescription text={team.description} /> : 'No description yet.'
        }
        actions={<TeamActions team={team} onExit={exitTeam} />}
      >
        <TeamFacts facts={facts} />
      </PageHeader>

      <div className="space-y-10">
        <MembersCard team={team} />
        <TeamProjects team={team} />
      </div>
    </PageShell>
  );
}

const byStatus = (a, b) => Number(a.status === 'archived') - Number(b.status === 'archived');

function TeamProjects({ team }) {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useProjects(ALL_PROJECTS);
  const canManage = MANAGER_ROLES.includes(team.myRole);
  const projects = useMemo(
    () => (data ?? []).filter((project) => getId(project.team) === team._id).sort(byStatus),
    [data, team._id],
  );

  let content;
  if (isError && !data) {
    content = (
      <Card>
        <ErrorState compact title="Couldn’t load projects" error={error} onRetry={refetch} />
      </Card>
    );
  } else if (!isLoading && projects.length === 0) {
    content = (
      <Card>
        <EmptyState
          compact
          icon={FolderKanban}
          title="No projects yet"
          description={
            canManage
              ? 'Create the team’s first project to start planning work on a board.'
              : 'A team owner or admin can create the first project.'
          }
          action={
            canManage && (
              <Button size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
                Create a project
              </Button>
            )
          }
        />
      </Card>
    );
  } else {
    content = <ProjectGrid projects={projects} loading={isLoading} headingAs="h3" />;
  }

  return (
    <section aria-labelledby="team-projects-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="team-projects-title"
            className="flex items-baseline gap-2 text-[15px] font-semibold tracking-[-0.005em] text-fg"
          >
            Projects
            {data && (
              <span className="font-mono text-xs font-normal tabular-nums text-fg-muted">
                {projects.length}
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Boards owned by this team, active and archived.
          </p>
        </div>
        {canManage && (
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
            New project
          </Button>
        )}
      </div>

      {content}

      <ProjectFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTeamId={team._id}
      />
    </section>
  );
}

function TeamUnavailable({ notFound }) {
  return (
    <PageShell>
      <Card>
        <EmptyState
          icon={notFound ? SearchX : ShieldAlert}
          title={notFound ? 'Team not found' : 'You’re not a member of this team'}
          description={
            notFound
              ? 'This team doesn’t exist anymore, or the link is incorrect.'
              : 'You may have been removed from it, or the link belongs to a team you haven’t joined.'
          }
          action={
            <Button as={Link} to="/teams" icon={ArrowLeft}>
              Back to teams
            </Button>
          }
        />
      </Card>
    </PageShell>
  );
}

function TeamDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="hidden h-11 w-11 rounded-lg xs:block" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
      </div>
      <div className="mb-8 mt-6 flex gap-12 border-t border-line pt-5">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <Card padding={false}>
        <div className="border-b border-line p-5">
          <Skeleton className="h-4 w-28" />
        </div>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </Card>
    </div>
  );
}
