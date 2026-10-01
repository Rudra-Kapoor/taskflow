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
import { AVATAR_COLORS, MANAGER_ROLES } from '@/lib/constants';
import { formatBadgeCount, pickFromPalette } from '@/lib/format';
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
  { to: '/tasks', label: 'My Tasks', icon: ListTodo },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: true },
  { to: '/teams', label: 'Teams', icon: Users, end: true },
  { to: '/notifications', label: 'Notifications', icon: Bell, showUnread: true },
];

const navLinkClass = ({ isActive }) =>
  cn(
    'focus-ring group flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
      : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
  );

const subLinkClass = ({ isActive }) =>
  cn(
    'focus-ring group flex h-8 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors duration-150',
    isActive
      ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
      : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
  );

/**
 * Main navigation: logo, primary links, projects & teams shortcuts and a link to the profile
 * (account actions live in the top bar's menu). Rendered statically on desktop and inside the
 * mobile drawer (pass `onClose` there).
 */
export function Sidebar({ onClose }) {
  const unreadCount = useUnreadCount() ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line px-5">
        <Logo to="/" />
        {onClose && <IconButton icon={X} label="Close navigation" size="sm" onClick={onClose} />}
      </div>

      <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <PrimaryNavLink item={item} badge={item.showUnread ? unreadCount : 0} />
            </li>
          ))}
        </ul>
        <ProjectsSection />
        <TeamsSection />
      </nav>

      <div className="shrink-0 border-t border-line p-3">
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
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0 transition-colors',
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-fg-subtle group-hover:text-fg-muted',
            )}
            aria-hidden="true"
          />
          <span className="flex-1 truncate">{item.label}</span>
          {badge > 0 && (
            <span
              className={cn(
                'min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none tabular-nums',
                isActive ? 'bg-brand-600 text-white dark:bg-brand-500' : 'bg-rose-600 text-white',
              )}
            >
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
      <div className="mb-1 mt-7 flex h-7 items-center justify-between pl-3 pr-1">
        <h2
          id={headingId}
          className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle"
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
    <ul className="space-y-1 px-3 py-1" aria-hidden="true">
      {[70, 55, 80].map((width) => (
        <li key={width} className="flex h-7 items-center gap-2.5">
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3" style={{ width: `${width}%` }} />
        </li>
      ))}
    </ul>
  );
}

function SectionMessage({ children }) {
  return <p className="px-3 py-1.5 text-xs text-fg-muted">{children}</p>;
}

function RetryMessage({ what, onRetry }) {
  return (
    <SectionMessage>
      Couldn&apos;t load {what}.{' '}
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring rounded font-medium text-brand-600 hover:underline dark:text-brand-400"
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
        <ul className="space-y-0.5">
          {listed.map((project) => {
            const open = (project.taskCounts?.todo ?? 0) + (project.taskCounts?.in_progress ?? 0);
            return (
              <li key={project._id}>
                <NavLink to={`/projects/${project._id}`} className={subLinkClass}>
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center"
                    aria-hidden="true"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-[4px] shadow-sm"
                      style={{ backgroundColor: project.color || '#6366f1' }}
                    />
                  </span>
                  <span className="flex-1 truncate">{project.name}</span>
                  {open > 0 && (
                    <span className="text-xs tabular-nums text-fg-muted">
                      {open}
                      <span className="sr-only"> open {open === 1 ? 'task' : 'tasks'}</span>
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
          {projects.length > MAX_LISTED && (
            <li>
              <NavLink to="/projects" end className={subLinkClass}>
                <span className="w-4" aria-hidden="true" />
                <span className="text-xs font-medium">View all {projects.length} projects</span>
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
        <ul className="space-y-0.5">
          {listed.map((team) => (
            <li key={team._id}>
              <NavLink to={`/teams/${team._id}`} className={subLinkClass}>
                <span
                  aria-hidden="true"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold uppercase leading-none text-white"
                  style={{ backgroundColor: pickFromPalette(team._id, AVATAR_COLORS) }}
                >
                  {team.name?.charAt(0) ?? '?'}
                </span>
                <span className="flex-1 truncate">{team.name}</span>
              </NavLink>
            </li>
          ))}
          {teams.length > MAX_LISTED && (
            <li>
              <NavLink to="/teams" end className={subLinkClass}>
                <span className="w-4" aria-hidden="true" />
                <span className="text-xs font-medium">View all {teams.length} teams</span>
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
          'focus-ring group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-surface-hover',
          isActive && 'bg-surface-hover',
        )
      }
    >
      <Avatar user={user} size="md" online={isConnected} decorative />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-fg">{user.name}</span>
        <span className="block truncate text-xs text-fg-muted">{user.title || user.email}</span>
        <span className="sr-only">, profile &amp; settings</span>
      </span>
      <Settings
        className="h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg-muted"
        aria-hidden="true"
      />
    </NavLink>
  );
}
