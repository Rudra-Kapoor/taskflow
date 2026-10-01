import { Suspense, useId, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Plus,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { Avatar, IconButton, Skeleton, Tooltip } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useUnreadCount } from '@/hooks/queries/notifications';
import { useProjects } from '@/hooks/queries/projects';
import { useTeams } from '@/hooks/queries/teams';
import { cn } from '@/lib/cn';
import { MANAGER_ROLES, calmColor } from '@/lib/constants';
import { formatBadgeCount } from '@/lib/format';
import { lazyNamed } from '@/lib/lazy';
import { Logo } from './Logo';

const ProjectFormModal = lazyNamed(
  () => import('@/components/projects/ProjectFormModal'),
  'ProjectFormModal',
);
const TeamFormModal = lazyNamed(() => import('@/components/teams/TeamFormModal'), 'TeamFormModal');

const MAX_LISTED = 8;
const NO_TEAMS = [];

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tasks', label: 'My tasks', icon: ListTodo },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: true },
  { to: '/teams', label: 'Teams', icon: Users, end: true },
  { to: '/notifications', label: 'Notifications', icon: Bell, showUnread: true },
];

/*
 * Rows share one left edge (20px from the sidebar edge: nav `px-2` + row `pl-3`) with the logo,
 * the section eyebrows and the user row. The active row is marked by a 2px vermilion rule in the
 * row's left gutter instead of a tinted pill.
 */
const rowBase =
  'focus-ring group relative flex items-center rounded-md pl-3 pr-2 transition-colors duration-150';

// 32px rows for mouse users, 40px on touch screens (the drawer).
const navLinkClass = ({ isActive }) =>
  cn(
    rowBase,
    'h-8 gap-2.5 text-sm font-medium touch:h-10',
    isActive ? 'text-fg' : 'text-fg-muted hover:bg-surface-hover/70 hover:text-fg',
  );

const subLinkClass = ({ isActive }) =>
  cn(
    rowBase,
    'h-8 gap-2.5 text-[13px] touch:h-10',
    isActive ? 'font-medium text-fg' : 'text-fg-muted hover:bg-surface-hover/70 hover:text-fg',
  );

/** The 2px vermilion marker of the current row. */
function ActiveMarker({ active }) {
  if (!active) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand-500"
    />
  );
}

/**
 * Main navigation: logo, primary links, projects & teams shortcuts and a link to the profile
 * (account actions live in the top bar's menu). Rendered statically on desktop and inside the
 * mobile drawer (pass `onClose` there).
 */
export function Sidebar({ onClose }) {
  const unreadCount = useUnreadCount() ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line pl-5 pr-3">
        <Logo to="/" size="sm" />
        {onClose && <IconButton icon={X} label="Close navigation" size="sm" onClick={onClose} />}
      </div>

      <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-3">
        <ul className="space-y-px">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <PrimaryNavLink item={item} badge={item.showUnread ? unreadCount : 0} />
            </li>
          ))}
        </ul>
        <ProjectsSection />
        <TeamsSection />
      </nav>

      <div className="shrink-0 border-t border-line px-2 py-2">
        <ProfileLink />
      </div>
    </div>
  );
}

function PrimaryNavLink({ item, badge }) {
  const Icon = item.icon;

  return (
    <NavLink to={item.to} end={item.end} className={navLinkClass}>
      {({ isActive }) => (
        <>
          <ActiveMarker active={isActive} />
          <Icon
            className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-fg' : 'text-fg-subtle group-hover:text-fg-muted',
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.label}</span>
          {badge > 0 && (
            <span className="font-mono text-[11px] font-medium tabular-nums text-brand-700 dark:text-brand-400">
              {formatBadgeCount(badge)}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/** A labelled group of links (not a landmark: the page has one main navigation). */
function SidebarGroup({ title, action, children }) {
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId}>
      <div className="mb-1 mt-6 flex h-7 items-center justify-between pl-3 pr-1">
        <h2
          id={headingId}
          className="font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-fg-subtle"
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <ul className="space-y-1 py-1 pl-3 pr-2" aria-hidden="true">
      {[70, 55, 80].map((width) => (
        <li key={width} className="flex h-7 items-center gap-2.5">
          <Skeleton className="h-2 w-2 rounded-[2px]" />
          <Skeleton className="h-2.5" style={{ width: `${width}%` }} />
        </li>
      ))}
    </ul>
  );
}

function SectionMessage({ children }) {
  return <p className="py-1.5 pl-3 pr-2 text-xs text-fg-muted">{children}</p>;
}

function RetryMessage({ what, onRetry }) {
  return (
    <SectionMessage>
      Couldn&apos;t load {what}.{' '}
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring rounded-sm font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-400"
      >
        Retry
      </button>
    </SectionMessage>
  );
}

/** "+" for a new project; explains itself (instead of failing) for people who manage no team. */
function CreateProjectButton({ onCreate }) {
  const { data: teams = NO_TEAMS, isLoading } = useTeams();
  const canCreate = teams.some((team) => MANAGER_ROLES.includes(team.myRole));
  let reason = null;
  if (!isLoading && !canCreate) {
    reason = teams.length
      ? 'Only team owners and admins can create projects'
      : 'Projects belong to teams: create a team first';
  }

  return (
    <Tooltip content={reason} align="end" side="bottom" contentClassName="max-w-[12rem]">
      <IconButton
        icon={Plus}
        label="Create project"
        size="xs"
        title={reason ? undefined : 'Create project'}
        aria-disabled={!canCreate || undefined}
        onClick={canCreate ? onCreate : undefined}
        className={cn(!canCreate && 'cursor-not-allowed opacity-50 hover:bg-transparent')}
      />
    </Tooltip>
  );
}

function ProjectsSection() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const listed = projects.slice(0, MAX_LISTED);

  return (
    <SidebarGroup
      title="Projects"
      action={<CreateProjectButton onCreate={() => setModalOpen(true)} />}
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : isError ? (
        <RetryMessage what="projects" onRetry={() => refetch()} />
      ) : listed.length === 0 ? (
        <SectionMessage>No projects yet</SectionMessage>
      ) : (
        <ul className="space-y-px">
          {listed.map((project) => {
            const open = (project.taskCounts?.todo ?? 0) + (project.taskCounts?.in_progress ?? 0);
            return (
              <li key={project._id}>
                <NavLink to={`/projects/${project._id}`} className={subLinkClass}>
                  {({ isActive }) => (
                    <>
                      <ActiveMarker active={isActive} />
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center"
                        aria-hidden="true"
                      >
                        <span
                          className="h-2 w-2 rounded-[2px]"
                          style={{ backgroundColor: calmColor(project.color) || '#8A857A' }}
                        />
                      </span>
                      <span className="flex-1 truncate">{project.name}</span>
                      {open > 0 && (
                        <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
                          {open}
                          <span className="sr-only"> open {open === 1 ? 'task' : 'tasks'}</span>
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
          {projects.length > MAX_LISTED && (
            <li>
              <NavLink to="/projects" end className={subLinkClass}>
                <span className="w-4" aria-hidden="true" />
                <span className="text-xs text-fg-muted">
                  View all <span className="font-mono tabular-nums">{projects.length}</span>{' '}
                  projects
                </span>
              </NavLink>
            </li>
          )}
        </ul>
      )}

      {modalOpen && (
        <Suspense fallback={null}>
          <ProjectFormModal
            open
            onClose={() => setModalOpen(false)}
            onSaved={(project) => {
              if (project?._id) navigate(`/projects/${project._id}`);
            }}
          />
        </Suspense>
      )}
    </SidebarGroup>
  );
}

function TeamsSection() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: teams = NO_TEAMS, isLoading, isError, refetch } = useTeams();
  const listed = teams.slice(0, MAX_LISTED);

  return (
    <SidebarGroup
      title="Teams"
      action={
        <IconButton
          icon={Plus}
          label="Create team"
          size="xs"
          onClick={() => setModalOpen(true)}
        />
      }
    >
      {isLoading ? (
        <SectionSkeleton />
      ) : isError ? (
        <RetryMessage what="teams" onRetry={() => refetch()} />
      ) : listed.length === 0 ? (
        <SectionMessage>No teams yet</SectionMessage>
      ) : (
        <ul className="space-y-px">
          {listed.map((team) => (
            <li key={team._id}>
              <NavLink to={`/teams/${team._id}`} className={subLinkClass}>
                {({ isActive }) => (
                  <>
                    <ActiveMarker active={isActive} />
                    {/* Outlined monogram: teams read as "people", projects as colour swatches. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border font-mono text-[10px] font-medium uppercase leading-none transition-colors',
                        isActive
                          ? 'border-fg/40 text-fg'
                          : 'border-line-strong text-fg-muted group-hover:text-fg',
                      )}
                    >
                      {team.name?.charAt(0) ?? '?'}
                    </span>
                    <span className="flex-1 truncate">{team.name}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
          {teams.length > MAX_LISTED && (
            <li>
              <NavLink to="/teams" end className={subLinkClass}>
                <span className="w-4" aria-hidden="true" />
                <span className="text-xs text-fg-muted">
                  View all <span className="font-mono tabular-nums">{teams.length}</span> teams
                </span>
              </NavLink>
            </li>
          )}
        </ul>
      )}

      {modalOpen && (
        <Suspense fallback={null}>
          <TeamFormModal
            open
            onClose={() => setModalOpen(false)}
            onSaved={(team) => {
              if (team?._id) navigate(`/teams/${team._id}`);
            }}
          />
        </Suspense>
      )}
    </SidebarGroup>
  );
}

/** The signed-in user, linking to profile & settings (sign out is in the top bar's menu). */
function ProfileLink() {
  const { user } = useAuth();
  const { isConnected } = useSocket();

  if (!user) return null;

  return (
    <NavLink
      to="/profile"
      title="Profile & settings"
      className={({ isActive }) =>
        cn(
          'focus-ring group relative flex w-full items-center gap-2.5 rounded-md py-1.5 pl-3 pr-2 text-left transition-colors hover:bg-surface-hover/70',
          isActive && 'bg-surface-hover/70',
        )
      }
    >
      <Avatar user={user} size="sm" online={isConnected} decorative />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[13px] font-medium text-fg">{user.name}</span>
        <span className="mt-0.5 block truncate text-xs text-fg-muted">
          {user.title || user.email}
        </span>
        <span className="sr-only">, profile &amp; settings</span>
      </span>
      <Settings
        className="h-4 w-4 shrink-0 text-fg-subtle transition-[color,opacity] group-hover:text-fg-muted [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </NavLink>
  );
}
