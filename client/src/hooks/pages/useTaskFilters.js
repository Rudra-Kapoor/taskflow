import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DUE_FILTERS, TASK_PRIORITIES, TASK_SORT_OPTIONS, TASK_STATUSES } from '@/lib/constants';
import { isObjectId } from '@/lib/ids';
import { updateSearchParams } from '@/lib/searchParams';

/** URL params that filter the task search (`sort` and `page` are handled separately). */
export const TASK_FILTER_KEYS = [
  'search',
  'status',
  'priority',
  'assignee',
  'project',
  'due',
  'completedWithin',
  'includeArchived',
];

/** What `/tasks` shows when the URL carries no filter at all: my open work. */
export const DEFAULT_TASK_FILTERS = { assignee: 'me', status: 'open' };

export const DEFAULT_TASK_SORT = 'updated';

/** Every filter cleared ("any"). */
export const EMPTY_TASK_FILTERS = Object.fromEntries(TASK_FILTER_KEYS.map((key) => [key, '']));

/**
 * Written as `status=all` when every filter is cleared, so the URL still says "I chose no
 * filters" and the defaults above don't kick back in.
 */
const ALL_STATUSES = 'all';

/** `completedWithin`: a whole number of days, as accepted by the API (1-365). */
const isDayCount = (value) => /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 365;

/** Allowed values per param: anything else in a hand-edited URL is ignored (= any). */
const VALIDATORS = {
  search: (value) => value.length <= 200,
  status: (value) => value === 'open' || TASK_STATUSES.some((status) => status.value === value),
  priority: (value) => TASK_PRIORITIES.some((priority) => priority.value === value),
  assignee: (value) => value === 'me' || value === 'unassigned',
  project: isObjectId,
  due: (value) => DUE_FILTERS.some((filter) => filter.value && filter.value === value),
  completedWithin: isDayCount,
  includeArchived: (value) => value === 'true',
  sort: (value) => TASK_SORT_OPTIONS.some((option) => option.value === value),
};

function readParam(searchParams, key) {
  const value = searchParams.get(key) ?? '';
  return value && VALIDATORS[key](value) ? value : '';
}

/**
 * Filters described by the URL. Without any filter param the defaults apply; as soon as one is
 * present (e.g. the topbar search opens `/tasks?search=login`) the URL is taken literally and
 * missing params mean "any".
 */
export function parseTaskFilters(searchParams) {
  const hasFilters = TASK_FILTER_KEYS.some((key) => searchParams.has(key));
  const filters = hasFilters
    ? Object.fromEntries(TASK_FILTER_KEYS.map((key) => [key, readParam(searchParams, key)]))
    : { ...EMPTY_TASK_FILTERS, ...DEFAULT_TASK_FILTERS };
  const page = Number.parseInt(searchParams.get('page') ?? '', 10);

  return {
    ...filters,
    sort: readParam(searchParams, 'sort') || DEFAULT_TASK_SORT,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Writes `state` into `params`, keeping unrelated ones (e.g. the `task` modal). */
function writeTaskFilters(params, state) {
  [...TASK_FILTER_KEYS, 'sort', 'page'].forEach((key) => params.delete(key));
  TASK_FILTER_KEYS.forEach((key) => {
    if (state[key]) params.set(key, state[key]);
  });
  if (TASK_FILTER_KEYS.every((key) => !state[key])) params.set('status', ALL_STATUSES);
  if (state.sort && state.sort !== DEFAULT_TASK_SORT) params.set('sort', state.sort);
  if (state.page > 1) params.set('page', String(state.page));
}

/** True when `filters` match `preset` exactly (unset preset keys mean "any"). */
export function matchesTaskPreset(filters, preset) {
  return TASK_FILTER_KEYS.every((key) => (preset[key] ?? '') === filters[key]);
}

/**
 * Task search filters stored in the URL (`/tasks?status=open&priority=high&page=2`).
 * `setFilters(patch)` merges a partial update and returns to page 1 unless `page` is part of
 * the patch; `applyPreset(filters, sort?)` replaces every filter at once. Updates always start
 * from the live URL, so several changes in a row never overwrite each other.
 */
export function useTaskFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseTaskFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (patch) => {
      updateSearchParams(
        setSearchParams,
        (params) => writeTaskFilters(params, { ...parseTaskFilters(params), page: 1, ...patch }),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const applyPreset = useCallback(
    (preset, sort) => {
      setFilters({ ...EMPTY_TASK_FILTERS, ...preset, ...(sort ? { sort } : {}) });
    },
    [setFilters],
  );

  const activeCount = TASK_FILTER_KEYS.filter((key) => key !== 'search' && filters[key]).length;

  return { filters, setFilters, applyPreset, activeCount };
}
