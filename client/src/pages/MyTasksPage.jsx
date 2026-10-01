import { useCallback, useEffect, useRef } from 'react';
import { LoadingBar } from '@/components/mytasks/LoadingBar';
import { NoTasksYet } from '@/components/mytasks/NoTasksYet';
import { Pagination } from '@/components/mytasks/Pagination';
import { QuickFilters } from '@/components/mytasks/QuickFilters';
import { TaskCardList } from '@/components/mytasks/TaskCardList';
import { TaskFilterBar } from '@/components/mytasks/TaskFilterBar';
import { TaskResultsSkeleton } from '@/components/mytasks/TaskResultsSkeleton';
import { TaskTable } from '@/components/mytasks/TaskTable';
import { Button, Card, EmptyState, ErrorState, PageHeader } from '@/components/ui';
import { useDebouncedInput } from '@/hooks/pages/useDebouncedInput';
import { useDocumentTitle } from '@/hooks/pages/useDocumentTitle';
import {
  DEFAULT_TASK_FILTERS,
  EMPTY_TASK_FILTERS,
  matchesTaskPreset,
  useTaskFilters,
} from '@/hooks/pages/useTaskFilters';
import { useProjects } from '@/hooks/queries/projects';
import { useSearchTasks } from '@/hooks/queries/tasks';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { pluralize } from '@/lib/format';

const PAGE_SIZE = 20;
const ALL_PROJECTS = { status: 'all' };

/**
 * Global task search & filtering. Every filter lives in the URL (shareable, survives reloads and
 * the browser's back button); without any filter it shows the user's open tasks.
 */
export function MyTasksPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const resultsRef = useRef(null);
  const { filters, setFilters, applyPreset, activeCount } = useTaskFilters();
  const [searchInput, setSearchInput] = useDebouncedInput(filters.search, (search) =>
    setFilters({ search }),
  );
  const { data: projects } = useProjects(ALL_PROJECTS);
  useDocumentTitle(filters.search.trim() ? `Search “${filters.search.trim()}”` : 'My tasks');

  const { data, isLoading, isFetching, isError, error, refetch } = useSearchTasks({
    ...filters,
    limit: PAGE_SIZE,
  });
  const tasks = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 0;
  const hasSearch = Boolean(filters.search.trim());
  const hasFilters = activeCount > 0 || hasSearch;
  const isDefaultView = !hasSearch && matchesTaskPreset(filters, DEFAULT_TASK_FILTERS);

  // A page past the end (e.g. tasks were completed meanwhile): jump to the last one.
  useEffect(() => {
    if (!isFetching && totalPages > 0 && filters.page > totalPages) {
      setFilters({ page: totalPages });
    }
  }, [isFetching, totalPages, filters.page, setFilters]);

  const clearFilters = useCallback(() => applyPreset(EMPTY_TASK_FILTERS), [applyPreset]);

  const changePage = (page) => {
    setFilters({ page });
    const top = resultsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 72) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  let results;
  if (isError && !data) {
    results = (
      <ErrorState title="Couldn’t load tasks" error={error} onRetry={refetch} />
    );
  } else if (isLoading) {
    results = <TaskResultsSkeleton />;
  } else if (tasks.length === 0 && (isDefaultView || !hasFilters)) {
    results = (
      <NoTasksYet assignedToMe={isDefaultView} projects={projects} onShowAll={clearFilters} />
    );
  } else if (tasks.length === 0) {
    results = (
      <EmptyState
        title="No tasks match your filters"
        description="Try another search term, or loosen a filter or two."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    );
  } else if (isDesktop) {
    results = <TaskTable tasks={tasks} />;
  } else {
    results = <TaskCardList tasks={tasks} />;
  }

  let summary = 'Search and filter work across all of your projects.';
  if (data && isDefaultView) {
    summary = `${pluralize(total, 'open task')} assigned to you.`;
  } else if (data && hasFilters) {
    summary = `${pluralize(total, 'task')} ${total === 1 ? 'matches' : 'match'} your filters.`;
  } else if (data) {
    summary = `${pluralize(total, 'task')} across your active projects.`;
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader eyebrow="Your work" title="My tasks" description={summary} />

      <QuickFilters filters={filters} onApply={applyPreset} className="mb-5" />

      <section ref={resultsRef} aria-label="Task results" className="scroll-mt-4">
        <Card padding={false} className="relative overflow-hidden">
          <LoadingBar active={isFetching && !isLoading} />
          <TaskFilterBar
            filters={filters}
            onChange={setFilters}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            projects={projects}
            activeCount={activeCount}
            total={data?.meta?.total}
            canClear={hasFilters}
            onClear={clearFilters}
            collapsed={!isDesktop}
          />
          <div aria-busy={isFetching}>{results}</div>
          <Pagination
            page={filters.page}
            totalPages={totalPages}
            total={tasks.length ? total : 0}
            noun="task"
            onPageChange={changePage}
          />
        </Card>
      </section>
    </div>
  );
}
