import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FolderX, History, List, Lock, Plus, SquareKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { ActivityPanel } from '@/components/board/ActivityPanel';
import { ArchivedBanner } from '@/components/board/ArchivedBanner';
import { Board } from '@/components/board/Board';
import { BoardFilters, BoardFilterSummary } from '@/components/board/BoardFilters';
import {
  BoardColumnsSkeleton,
  BoardSkeleton,
  ListViewSkeleton,
} from '@/components/board/BoardSkeleton';
import { isModalOpen, isTypingTarget } from '@/components/board/keyboard';
import { ListView } from '@/components/board/ListView';
import { PresenceAvatars } from '@/components/board/PresenceAvatars';
import { ProjectHeader } from '@/components/board/ProjectHeader';
import { ProjectActions } from '@/components/projects/ProjectActions';
import { Button, Card, EmptyState, ErrorState, SegmentedControl } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useProjectRoom } from '@/context/SocketContext';
import { matchesBoardFilters, useBoardFilters } from '@/hooks/board/useBoardFilters';
import { useProjectArchive } from '@/hooks/board/useProjectArchive';
import { useRemoteTaskHighlights } from '@/hooks/board/useRemoteTaskHighlights';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import { useProject } from '@/hooks/queries/projects';
import { useProjectTasks } from '@/hooks/queries/tasks';
import { useTaskModal } from '@/hooks/useTaskModal';
import { MANAGER_ROLES } from '@/lib/constants';
import { getTaskKey } from '@/lib/format';
import { lazyNamed } from '@/lib/lazy';

const TaskFormModal = lazyNamed(() => import('@/components/tasks/TaskFormModal'), 'TaskFormModal');

const VIEW_OPTIONS = [
  { value: 'board', label: 'Board', icon: SquareKanban },
  { value: 'list', label: 'List', icon: List },
];

const NO_TASKS = [];
/** 400 = malformed id, 403 = not a member, 404 = missing or deleted. */
const UNAVAILABLE_STATUSES = new Set([400, 403, 404]);
/** Same column as every other page, so the board lines up with the top bar on wide screens. */
const PAGE_CLASS = 'mx-auto flex w-full max-w-7xl flex-1 flex-col';

function BackToProjects() {
  return (
    <Button as={Link} to="/projects" variant="secondary" icon={ArrowLeft}>
      Back to projects
    </Button>
  );
}

function UnavailableProject({ forbidden }) {
  return (
    <Card className="flex flex-1 items-center justify-center">
      {forbidden ? (
        <EmptyState
          icon={Lock}
          title="You don't have access to this project"
          description="Only members of the project's team can see its board. Ask a team owner or admin to add you."
          action={<BackToProjects />}
        />
      ) : (
        <EmptyState
          icon={FolderX}
          title="Project not found"
          description="It may have been deleted, or the link you followed is incorrect."
          action={<BackToProjects />}
        />
      )}
    </Card>
  );
}

/** `/projects/:projectId` - loads the project and its tasks, then renders the board. */
export function ProjectBoardPage() {
  const { projectId } = useParams();
  const { view } = useBoardFilters();
  const projectQuery = useProject(projectId);
  // Requested in parallel with the project so the board appears in one go.
  const tasksQuery = useProjectTasks(projectId);
  useDocumentTitle(projectQuery.data?.name ?? 'Board');

  const errorStatus = projectQuery.error?.response?.status;
  const unavailable = projectQuery.isError && UNAVAILABLE_STATUSES.has(errorStatus);
  const lostWhileOpen = unavailable && projectQuery.data !== undefined;

  useEffect(() => {
    if (!lostWhileOpen) return;
    // Same id as the real-time "project deleted" toast, so the user never sees two.
    toast('This project is no longer available.', { id: `project-deleted:${projectId}` });
  }, [lostWhileOpen, projectId]);

  if (unavailable) {
    return (
      <div className={PAGE_CLASS}>
        <UnavailableProject forbidden={errorStatus === 403} />
      </div>
    );
  }

  if (projectQuery.isError && !projectQuery.data) {
    return (
      <div className={PAGE_CLASS}>
        <Card className="flex flex-1 items-center justify-center">
          <ErrorState
            title="Couldn't load this project"
            error={projectQuery.error}
            onRetry={() => {
              projectQuery.refetch();
              tasksQuery.refetch();
            }}
          />
        </Card>
      </div>
    );
  }

  if (!projectQuery.data) return <BoardSkeleton view={view} />;

  return <ProjectBoard key={projectId} project={projectQuery.data} tasksQuery={tasksQuery} />;
}

function ProjectBoard({ project, tasksQuery }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?._id;
  const { viewers } = useProjectRoom(project._id);
  const highlightedIds = useRemoteTaskHighlights(project._id);
  const { filters, activeCount, setFilter, clearFilters, view, setView } = useBoardFilters();
  const { openTask } = useTaskModal();
  const { setArchived, isPending: restoring } = useProjectArchive(project._id, project.name);
  const [activityOpen, setActivityOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState(null);
  const searchInputRef = useRef(null);

  const archived = project.status === 'archived';
  const canManage = MANAGER_ROLES.includes(project.myRole);
  const tasks = tasksQuery.data ?? NO_TASKS;

  const members = useMemo(
    () => (project.team?.members ?? []).map((member) => member.user).filter(Boolean),
    [project.team],
  );
  const visibleTasks = useMemo(
    () =>
      activeCount > 0
        ? tasks.filter((task) => matchesBoardFilters(task, filters, currentUserId))
        : tasks,
    [tasks, filters, activeCount, currentUserId],
  );
  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === 'completed').length,
    [tasks],
  );

  const handleTaskCreated = useCallback(
    (task) => {
      if (activeCount > 0 && !matchesBoardFilters(task, filters, currentUserId)) {
        toast(`${getTaskKey(task)} was created but is hidden by your filters.`, {
          id: `hidden-task:${task._id}`,
        });
      }
    },
    [activeCount, filters, currentUserId],
  );

  const closeActivity = useCallback(() => setActivityOpen(false), []);

  // Shortcuts: "/" focuses the search, "c" creates a task.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || isModalOpen()) return;
      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key.toLowerCase() === 'c' && !archived) {
        event.preventDefault();
        setCreateStatus('todo');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [archived]);

  let content;
  if (tasksQuery.isError && !tasksQuery.data) {
    content = (
      <Card className="flex flex-1 items-center justify-center">
        <ErrorState
          title="Couldn't load the tasks"
          error={tasksQuery.error}
          onRetry={() => tasksQuery.refetch()}
        />
      </Card>
    );
  } else if (!tasksQuery.data) {
    content = view === 'list' ? <ListViewSkeleton /> : <BoardColumnsSkeleton />;
  } else if (view === 'list') {
    content = (
      <ListView
        tasks={visibleTasks}
        readOnly={archived}
        filtered={activeCount > 0}
        onClearFilters={clearFilters}
        onOpenTask={openTask}
      />
    );
  } else {
    content = (
      <Board
        projectId={project._id}
        tasks={tasks}
        visibleTasks={visibleTasks}
        filtered={activeCount > 0}
        readOnly={archived}
        highlightedIds={highlightedIds}
        onOpenTask={openTask}
        onAddTask={setCreateStatus}
        onTaskCreated={handleTaskCreated}
      />
    );
  }

  return (
    <div className={`${PAGE_CLASS} gap-6 sm:gap-8`}>
      <ProjectHeader
        project={project}
        completed={completedCount}
        total={tasks.length}
        presence={<PresenceAvatars viewers={viewers} currentUserId={currentUserId} />}
        actions={
          (canManage || !archived) && (
            <>
              {canManage && (
                <ProjectActions
                  project={project}
                  variant="header"
                  taskCount={tasks.length}
                  onDeleted={() => navigate('/projects', { replace: true })}
                />
              )}
              {/* Secondary: the top bar already carries the ink "New task" for the whole app. */}
              {!archived && (
                <Button
                  variant="secondary"
                  icon={Plus}
                  aria-label="New task"
                  title="New task (C)"
                  onClick={() => setCreateStatus('todo')}
                >
                  <span className="hidden xs:inline">New task</span>
                </Button>
              )}
            </>
          )
        }
      />

      {archived && (
        <ArchivedBanner
          canRestore={canManage}
          restoring={restoring}
          onRestore={() => setArchived(false)}
        />
      )}

      <div className="flex flex-1 flex-col gap-4 sm:gap-5">
        {/* One quiet row from `sm` up (filters, mono count, view + actions); stacked on phones. */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <BoardFilters
            filters={filters}
            onChange={setFilter}
            members={members}
            currentUserId={currentUserId}
            searchInputRef={searchInputRef}
          />
          <div className="flex min-w-0 items-center gap-2 sm:contents">
            <BoardFilterSummary
              activeCount={activeCount}
              shownCount={visibleTasks.length}
              totalCount={tasks.length}
              onClear={clearFilters}
              className="mr-auto sm:ml-2 sm:mr-0"
            />
            <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
              <SegmentedControl
                options={VIEW_OPTIONS}
                value={view}
                onChange={setView}
                aria-label="Board layout"
              />
              <Button
                variant="secondary"
                icon={History}
                aria-label="Activity"
                aria-expanded={activityOpen}
                onClick={() => setActivityOpen((open) => !open)}
                className="border-line shadow-none hover:border-line-strong aria-expanded:border-fg/50 aria-expanded:bg-surface-hover"
              >
                <span className="hidden xs:inline">Activity</span>
              </Button>
            </div>
          </div>
        </div>

        {content}
      </div>

      <ActivityPanel
        open={activityOpen}
        projectId={project._id}
        projectName={project.name}
        onClose={closeActivity}
      />

      {createStatus && (
        <Suspense fallback={null}>
          <TaskFormModal
            open
            projectId={project._id}
            defaultStatus={createStatus}
            onClose={() => setCreateStatus(null)}
            onCreated={handleTaskCreated}
          />
        </Suspense>
      )}
    </div>
  );
}
