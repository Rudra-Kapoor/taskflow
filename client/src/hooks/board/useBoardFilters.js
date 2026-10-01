import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DUE_FILTERS, TASK_PRIORITIES } from '@/lib/constants';
import { getTaskKey, matchesDueFilter } from '@/lib/format';
import { updateSearchParams } from '@/lib/searchParams';

const FILTER_KEYS = ['q', 'priority', 'assignee', 'due'];
const PRIORITY_VALUES = new Set(TASK_PRIORITIES.map((priority) => priority.value));
const DUE_VALUES = new Set(DUE_FILTERS.map((filter) => filter.value).filter(Boolean));

/** Special `assignee` filter values (anything else is a user id). */
export const ASSIGNEE_ME = 'me';
export const ASSIGNEE_NONE = 'unassigned';

/**
 * Board filters and view mode, stored in the URL (`q`, `priority`, `assignee`, `due`, `view`) so
 * a filtered board can be shared. Updates start from the live URL (rapid changes never undo each
 * other) and keep unrelated params (e.g. `task`).
 */
export function useBoardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const priorityParam = searchParams.get('priority') ?? '';
  const dueParam = searchParams.get('due') ?? '';
  const assignee = searchParams.get('assignee') ?? '';
  const priority = PRIORITY_VALUES.has(priorityParam) ? priorityParam : '';
  const due = DUE_VALUES.has(dueParam) ? dueParam : '';
  const view = searchParams.get('view') === 'list' ? 'list' : 'board';

  const filters = useMemo(() => ({ q, priority, assignee, due }), [q, priority, assignee, due]);
  const activeCount = [q.trim(), priority, assignee, due].filter(Boolean).length;

  const updateParams = useCallback(
    (changes) => {
      updateSearchParams(
        setSearchParams,
        (params) => {
          Object.entries(changes).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
          });
        },
        // Keep the entry's state (e.g. an open task's "go back to close" marker).
        { replace: true, state: window.history.state?.usr },
      );
    },
    [setSearchParams],
  );

  const setFilter = useCallback((key, value) => updateParams({ [key]: value }), [updateParams]);

  const clearFilters = useCallback(
    () => updateParams(Object.fromEntries(FILTER_KEYS.map((key) => [key, '']))),
    [updateParams],
  );

  const setView = useCallback(
    (value) => updateParams({ view: value === 'list' ? 'list' : '' }),
    [updateParams],
  );

  return { filters, activeCount, setFilter, clearFilters, view, setView };
}

function matchesAssignee(task, assignee, currentUserId) {
  if (!assignee) return true;
  const assigneeId = task.assignee?._id ?? null;
  if (assignee === ASSIGNEE_NONE) return assigneeId === null;
  if (assignee === ASSIGNEE_ME) return Boolean(currentUserId) && assigneeId === currentUserId;
  return assigneeId === assignee;
}

function matchesQuery(task, query) {
  if (!query) return true;
  const haystack = [task.title, task.description, getTaskKey(task), ...(task.labels ?? [])]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  return haystack.includes(query);
}

/** True when `task` passes every active board filter. */
export function matchesBoardFilters(task, { q, priority, assignee, due }, currentUserId) {
  return (
    (!priority || task.priority === priority) &&
    matchesAssignee(task, assignee, currentUserId) &&
    matchesDueFilter(task, due) &&
    matchesQuery(task, q.trim().toLowerCase())
  );
}
