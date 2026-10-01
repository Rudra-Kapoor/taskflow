import { Suspense, useState } from 'react';
import { ArrowLeft, Menu, Plus, Search } from 'lucide-react';
import { Button, IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { lazyNamed } from '@/lib/lazy';
import { ConnectionStatus } from './ConnectionStatus';
import { GlobalSearch } from './GlobalSearch';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

const TaskFormModal = lazyNamed(() => import('@/components/tasks/TaskFormModal'), 'TaskFormModal');

/**
 * Sticky app header: navigation toggle, search, live status, quick create and account menus.
 * Its content shares the pages' `max-w-7xl` column; the extra right padding matches <main>'s
 * scrollbar gutter (`--main-gutter`, set by AppLayout), so both line up exactly.
 */
export function Topbar({ onOpenSidebar, navigationOpen, menuButtonRef }) {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-16 shrink-0 border-b border-line bg-surface/80 backdrop-blur-md',
        'supports-[backdrop-filter]:bg-surface/70',
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
          className="lg:hidden"
        />
        <Logo to="/" size="sm" showText={false} className="sm:hidden" />

        <GlobalSearch enableShortcut className="hidden w-full max-w-md sm:block" />

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <IconButton
            icon={Search}
            label="Search tasks"
            onClick={() => setMobileSearchOpen(true)}
            className="sm:hidden"
          />
          <ConnectionStatus className="hidden sm:inline-flex" />
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
          <ThemeToggle className="hidden sm:inline-flex" />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="absolute inset-0 z-10 flex animate-fade-in items-center gap-2 bg-surface px-3 sm:hidden">
          <IconButton
            icon={ArrowLeft}
            label="Close search"
            onClick={() => setMobileSearchOpen(false)}
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
