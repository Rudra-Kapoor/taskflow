import { Suspense, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu, Plus, Search } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { useProject } from '@/hooks/queries/projects';
import { useTeam } from '@/hooks/queries/teams';
import { cn } from '@/lib/cn';
import { isObjectId } from '@/lib/ids';
import { lazyNamed } from '@/lib/lazy';
import { ConnectionStatus } from './ConnectionStatus';
import { GlobalSearch } from './GlobalSearch';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { calmColor } from '@/lib/constants';
import { UserMenu } from './UserMenu';

const TaskFormModal = lazyNamed(() => import('@/components/tasks/TaskFormModal'), 'TaskFormModal');

/** Top-level sections, named as in the sidebar. */
const SECTIONS = {
  '/': 'Dashboard',
  '/tasks': 'My tasks',
  '/projects': 'Projects',
  '/teams': 'Teams',
  '/notifications': 'Notifications',
  '/profile': 'Profile & settings',
};

/**
 * Where you are: "Projects / ▪ Website relaunch SITE". Project and team names come from the same
 * queries their pages run (shared cache, so no extra requests); until they arrive only the parent
 * section shows.
 */
function PageContext({ className }) {
  const { pathname } = useLocation();
  const projectId = matchPath('/projects/:projectId', pathname)?.params.projectId;
  const teamId = matchPath('/teams/:teamId', pathname)?.params.teamId;
  const { data: project } = useProject(projectId);
  const { data: team } = useTeam(isObjectId(teamId) ? teamId : undefined);

  let crumbs = [];
  if (projectId) {
    crumbs = [
      { label: 'Projects', to: '/projects' },
      project?.name && { label: project.name, color: project.color, code: project.key },
    ];
  } else if (teamId) {
    crumbs = [{ label: 'Teams', to: '/teams' }, team?.name && { label: team.name }];
  } else if (SECTIONS[pathname]) {
    crumbs = [{ label: SECTIONS[pathname] }];
  }
  crumbs = crumbs.filter(Boolean);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex min-w-0 items-center gap-2 text-sm">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li
              key={crumb.label}
              className={cn('flex items-center gap-2', current ? 'min-w-0' : 'shrink-0')}
            >
              {index > 0 && (
                <span aria-hidden="true" className="select-none text-line-strong">
                  /
                </span>
              )}
              {current ? (
                <span aria-current="page" className="flex min-w-0 items-center gap-2">
                  {crumb.color && (
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: calmColor(crumb.color) }}
                    />
                  )}
                  <span className="truncate font-medium text-fg">{crumb.label}</span>
                  {crumb.code && (
                    <span className="hidden shrink-0 font-mono text-[11px] uppercase tracking-[0.04em] text-fg-subtle md:inline">
                      {crumb.code}
                    </span>
                  )}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="focus-ring rounded-sm text-fg-muted transition-colors hover:text-fg"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Sticky app header: navigation toggle, where you are, search, live status, quick create and
 * account menus. Flat paper with a hairline (no blur). Its content shares the pages' `max-w-7xl`
 * column; the extra right padding matches <main>'s scrollbar gutter (`--main-gutter`, set by
 * AppLayout), so both line up exactly.
 */
export function Topbar({ onOpenSidebar, navigationOpen, menuButtonRef }) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-14 shrink-0 border-b border-line bg-canvas',
        'pl-3 pr-[calc(0.75rem+var(--main-gutter,0px))]',
        'sm:pl-6 sm:pr-[calc(1.5rem+var(--main-gutter,0px))]',
        'lg:pl-8 lg:pr-[calc(2rem+var(--main-gutter,0px))]',
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center gap-2 sm:gap-3">
        <IconButton
          ref={menuButtonRef}
          icon={Menu}
          label="Open navigation"
          aria-expanded={navigationOpen}
          onClick={onOpenSidebar}
          className="-ml-1.5 lg:hidden"
        />
        <Logo to="/" size="sm" showText={false} className="sm:hidden" />
        <PageContext className="hidden sm:block" />

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <GlobalSearch enableShortcut className="mr-1 hidden w-44 sm:block md:w-56 xl:w-64" />
          <IconButton
            icon={Search}
            label="Search tasks"
            onClick={() => setMobileSearchOpen(true)}
            className="sm:hidden"
          />
          <ConnectionStatus className="mr-1 hidden md:inline-flex" />
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setTaskModalOpen(true)}
            className="hidden sm:inline-flex"
          >
            New task
          </Button>
          <Button
            size="sm"
            icon={Plus}
            aria-label="New task"
            title="New task"
            onClick={() => setTaskModalOpen(true)}
            className="sm:hidden"
          />
          <span aria-hidden="true" className="mx-1.5 hidden h-5 w-px bg-line md:block" />
          <ThemeToggle className="hidden md:inline-flex" />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="absolute inset-0 z-10 flex animate-fade-in items-center gap-2 border-b border-line bg-canvas px-3 sm:hidden">
          <IconButton
            icon={ArrowLeft}
            label="Close search"
            onClick={() => setMobileSearchOpen(false)}
            className="-ml-1.5"
          />
          <GlobalSearch autoFocus className="flex-1" onDone={() => setMobileSearchOpen(false)} />
        </div>
      )}

      {taskModalOpen && (
        <Suspense fallback={null}>
          <TaskFormModal open onClose={() => setTaskModalOpen(false)} />
        </Suspense>
      )}
    </header>
  );
}
