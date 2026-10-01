import { X } from 'lucide-react';
import { Kbd, SearchInput, Select } from '@/components/ui';
import { ASSIGNEE_ME, ASSIGNEE_NONE } from '@/hooks/board/useBoardFilters';
import { useDebouncedInput } from '@/hooks/pages/useDebouncedInput';
import { cn } from '@/lib/cn';
import { DUE_FILTERS, TASK_PRIORITIES } from '@/lib/constants';
import { formatNumber, pluralize } from '@/lib/format';

const PRIORITIES_HIGH_FIRST = [...TASK_PRIORITIES].reverse();
const SEARCH_DEBOUNCE_MS = 200;

/** Quiet hairline controls: lighter border and muted text until a filter is set. */
const QUIET_CONTROL = 'border-line bg-surface text-[13px] shadow-none hover:border-line-strong';

/** Search box: typing stays local and reaches the URL after a short pause. */
function BoardSearch({ value, onChange, inputRef }) {
  const [draft, setDraft] = useDebouncedInput(value, onChange, SEARCH_DEBOUNCE_MS);

  return (
    <SearchInput
      value={draft}
      onChange={setDraft}
      inputRef={inputRef}
      placeholder="Search tasks…"
      aria-label="Search tasks by title, description, key or label"
      trailing={<Kbd className="hidden sm:inline-flex">/</Kbd>}
      className="w-full sm:w-56"
      inputClassName={QUIET_CONTROL}
    />
  );
}

function FilterSelect({ label, value, onChange, className, children }) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-auto shrink-0',
        className,
        QUIET_CONTROL,
        // Colour only (no bolder text), so an active filter never changes the toolbar layout.
        value ? 'border-fg/50 text-fg hover:border-fg/70' : 'text-fg-muted hover:text-fg',
      )}
    >
      {children}
    </Select>
  );
}

/**
 * Board toolbar filters: text search, priority, assignee and due date. Values live in the URL;
 * `onChange(key, value)` updates one. From `sm` up the controls join the parent toolbar row
 * (display: contents) so they wrap with it; on phones the selects scroll sideways, with a fade
 * hinting at the hidden ones.
 */
export function BoardFilters({ filters, onChange, members, currentUserId, searchInputRef }) {
  const knownAssignee =
    !filters.assignee ||
    filters.assignee === ASSIGNEE_ME ||
    filters.assignee === ASSIGNEE_NONE ||
    members.some((member) => member._id === filters.assignee);

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:contents">
      <BoardSearch
        value={filters.q}
        onChange={(value) => onChange('q', value)}
        inputRef={searchInputRef}
      />

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto pl-4 pr-10 [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] sm:contents">
        <FilterSelect
          label="Filter by priority"
          className="sm:w-[8.75rem]"
          value={filters.priority}
          onChange={(value) => onChange('priority', value)}
        >
          <option value="">Any priority</option>
          {PRIORITIES_HIGH_FIRST.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.label}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Filter by assignee"
          className="sm:w-[9.5rem]"
          value={filters.assignee}
          onChange={(value) => onChange('assignee', value)}
        >
          <option value="">Anyone</option>
          <option value={ASSIGNEE_ME}>Assigned to me</option>
          <option value={ASSIGNEE_NONE}>Unassigned</option>
          {!knownAssignee && <option value={filters.assignee}>Former member</option>}
          {members.length > 0 && (
            <optgroup label="Team members">
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member._id === currentUserId ? `${member.name} (you)` : member.name}
                </option>
              ))}
            </optgroup>
          )}
        </FilterSelect>

        <FilterSelect
          label="Filter by due date"
          className="sm:w-[9.5rem]"
          value={filters.due}
          onChange={(value) => onChange('due', value)}
        >
          {DUE_FILTERS.map((due) => (
            <option key={due.value || 'any'} value={due.value}>
              {due.label}
            </option>
          ))}
        </FilterSelect>
      </div>
    </div>
  );
}

/**
 * Result count in mono: "12 tasks", or "4 of 12 tasks" plus "Clear" while filtering. It keeps a
 * fixed minimum width (and height) either way, so applying a filter moves nothing around it.
 */
export function BoardFilterSummary({ activeCount, shownCount, totalCount, onClear, className }) {
  const filtering = activeCount > 0;

  return (
    <div
      className={cn(
        'flex min-h-9 min-w-0 items-center gap-2 font-mono text-xs tabular-nums text-fg-muted',
        className,
      )}
    >
      <p role="status" className="truncate">
        {filtering ? (
          <>
            <span className="text-fg">{formatNumber(shownCount)}</span> of{' '}
            {pluralize(totalCount, 'task')}
          </>
        ) : (
          pluralize(totalCount, 'task')
        )}
      </p>
      {filtering && (
        <button
          type="button"
          onClick={onClear}
          className="focus-ring inline-flex h-6 shrink-0 items-center gap-1 rounded px-1.5 font-sans text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50 touch:h-9 dark:text-brand-300 dark:hover:bg-brand-500/10"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Clear filters
          <span className="font-mono tabular-nums">({activeCount})</span>
        </button>
      )}
    </div>
  );
}
