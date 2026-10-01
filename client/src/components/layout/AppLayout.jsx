import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ErrorBoundary, ErrorFallback, Modal, PageLoader } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTaskModal } from '@/hooks/useTaskModal';
import { getFocusableElements, lockBodyScroll, trapFocus, unlockBodyScroll } from '@/lib/dom';
import { lazyNamed } from '@/lib/lazy';
import { TASK_PARAM } from '@/lib/taskLinks';
import { OfflineBanner } from './OfflineBanner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const TaskDetailModal = lazyNamed(
  () => import('@/components/tasks/TaskDetailModal'),
  'TaskDetailModal',
);

/**
 * Authenticated app shell: fixed sidebar (drawer below `lg`), sticky top bar and the scrollable
 * <main> that renders the current page (`children`, or the matched route). Any page can open a
 * task by setting `?task=<id>`. A crash inside a page or the task dialog only replaces that part.
 */
export function AppLayout({ children }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { closeTask } = useTaskModal();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const columnRef = useRef(null);
  const mainRef = useRef(null);
  const menuButtonRef = useRef(null);
  const taskId = searchParams.get(TASK_PARAM);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // <main>'s scrollbar gutter, so the top bar can keep its content in line with the page's.
  useLayoutEffect(() => {
    const main = mainRef.current;
    const measure = () => {
      const gutter = main.offsetWidth - main.clientWidth;
      columnRef.current?.style.setProperty('--main-gutter', `${gutter}px`);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(main);
    return () => observer?.disconnect();
  }, []);

  // New page: close the mobile drawer and start at the top.
  useEffect(() => {
    setDrawerOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const skipToContent = (event) => {
    event.preventDefault();
    mainRef.current?.focus();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas supports-[height:100dvh]:h-dvh">
      <a
        href="#main-content"
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-fg focus:shadow-lg focus:ring-2 focus:ring-brand-500"
      >
        Skip to content
      </a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <Sidebar />
      </aside>

      <MobileDrawer open={drawerOpen} onClose={closeDrawer} returnFocusRef={menuButtonRef} />

      <div ref={columnRef} className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenSidebar={openDrawer}
          navigationOpen={drawerOpen}
          menuButtonRef={menuButtonRef}
        />
        <OfflineBanner />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] focus:outline-none"
        >
          <div className="flex min-h-full flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <ErrorBoundary key={location.pathname}>
              <Suspense fallback={<PageLoader />}>{children ?? <Outlet />}</Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {taskId && (
        <ErrorBoundary
          key={taskId}
          fallback={(error) => (
            <Modal open onClose={closeTask} size="sm" ariaLabel="The task could not be shown">
              <ErrorFallback error={error} compact />
            </Modal>
          )}
        >
          <Suspense fallback={null}>
            <TaskDetailModal taskId={taskId} onClose={closeTask} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

/**
 * Off-canvas navigation below `lg`: a modal dialog that traps focus, makes the rest of the app
 * inert, closes on Escape (unless a dialog opened from it is on top) and returns focus to the
 * menu button.
 */
function MobileDrawer({ open, onClose, returnFocusRef }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const panelRef = useRef(null);
  const visible = open && !isDesktop;

  useEffect(() => {
    if (!visible) return undefined;
    const panel = panelRef.current;
    const menuButton = returnFocusRef.current;
    const app = document.getElementById('root');
    lockBodyScroll();
    app?.setAttribute('inert', '');
    (getFocusableElements(panel)[0] ?? panel)?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const dialogOnTop = Array.from(
        document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
      ).some((dialog) => dialog !== panel);
      if (!dialogOnTop) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      app?.removeAttribute('inert');
      unlockBodyScroll();
      menuButton?.focus({ preventScroll: true });
    };
  }, [visible, onClose, returnFocusRef]);

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        tabIndex={-1}
        onKeyDown={(event) => trapFocus(event, panelRef.current)}
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in-left flex-col border-r border-line bg-surface shadow-2xl outline-none"
      >
        <Sidebar onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
