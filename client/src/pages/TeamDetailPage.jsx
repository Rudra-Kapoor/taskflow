import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Crown,
  FolderKanban,
  Plus,
  SearchX,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { ProjectFormModal } from '@/components/projects/ProjectFormModal';
import { ProjectGrid } from '@/components/projects/ProjectGrid';
import { MembersCard } from '@/components/teams/MembersCard';
import { RoleBadge } from '@/components/teams/RoleBadge';
import { TeamActions } from '@/components/teams/TeamActions';
import { TeamAvatar } from '@/components/teams/TeamAvatar';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { useProjects } from '@/hooks/queries/projects';
import { useTeam } from '@/hooks/queries/teams';
import { cn } from '@/lib/cn';
import { MANAGER_ROLES } from '@/lib/constants';
import { formatDate, pluralize } from '@/lib/format';
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

function PageShell({ teamName, children }) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-fg-muted">
          <li>
            <Link to="/teams" className="focus-ring rounded transition-colors hover:text-fg">
              Teams
            </Link>
          </li>
          {teamName && (
            <>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5 text-fg-subtle" />
              </li>
              <li aria-current="page" className="min-w-0 truncate font-medium text-fg">
                {teamName}
              </li>
            </>
          )}
        </ol>
      </nav>
      {children}
    </div>
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

  return (
    <PageShell teamName={team.name}>
      <PageHeader
        icon={<TeamAvatar team={team} className="h-full w-full rounded-[10px] shadow-none" />}
        // Wraps instead of truncating: a long team name is still readable in full.
        title={<span className="block whitespace-normal break-words">{team.name}</span>}
        description={
          team.description ? <TeamDescription text={team.description} /> : 'No description yet.'
        }
        actions={<TeamActions team={team} onExit={exitTeam} />}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
          <RoleBadge role={team.myRole} size="md" />
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
            {pluralize(members.length, 'member')}
          </span>
          {team.owner?.name && (
            <span className="inline-flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
              Owned by {team.owner.name}
            </span>
          )}
          {team.createdAt && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-fg-subtle" aria-hidden="true" />
              Created {formatDate(team.createdAt)}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="space-y-8">
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
            className="flex items-center gap-2 text-base font-semibold text-fg"
          >
            Projects
            {data && (
              <Badge color="gray" size="sm">
                {projects.length}
              </Badge>
            )}
          </h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Boards owned by this team, active and archived.
          </p>
        </div>
        {canManage && (
          <Button size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
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
      <Skeleton className="mb-5 h-4 w-40" />
      <div className="mb-8 flex items-start gap-3.5">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <Card padding={false}>
        <div className="border-b border-line p-5">
          <Skeleton className="h-4 w-28" />
        </div>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex items-center gap-3 border-b border-line px-5 py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </Card>
    </div>
  );
}
