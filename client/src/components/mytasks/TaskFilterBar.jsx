import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button, FormField, Modal, SearchInput, Select } from '@/components/ui';
import { cn } from '@/lib/cn';
import { DUE_FILTERS, TASK_PRIORITIES, TASK_SORT_OPTIONS, TASK_STATUSES } from '@/lib/constants';
import { pluralize } from '@/lib/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'open', label: 'Open (not done)' },
  ...TASK_STATUSES.map(({ value, label }) => ({ value, label })),
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'Any priority' },
  ...[...TASK_PRIORITIES].reverse().map(({ value, label }) => ({ value, label })),
];

const ASSIGNEE_OPTIONS = [
  { value: '', label: 'Anyone' },
  { value: 'me', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned' },
];

const DUE_OPTIONS = DUE_FILTERS.map(({ value, label }) => ({ value, label }));

/** Quiet hairline control of the toolbar (inline selects, sort, search). */
const QUIET_CONTROL = 'border-line bg-transparent shadow-none hover:border-line-strong';

/** A control that currently narrows the results turns ink. */
const ACTIVE_CONTROL = 'border-fg/40 font-medium text-fg hover:border-fg/60 dark:border-fg/45';

/** Small mono capitals naming a control ("Sort"). */
const CONTROL_EYEBROW = 'font-mono text-[11px] uppercase tracking-[0.08em] text-fg-muted';

/** `completedWithin` chip label: "Completed in the last 7 days". */
const describeCompletedWithin = (days) =>
  Number(days) === 1 ? 'Completed in the last 24 hours' : `Completed in the last ${days} days`;

const renderOptions = (options) =>
  options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));

/** Projects grouped by team for the project filter. */
function groupProjectsByTeam(projects) {
  const groups = new Map();
  projects.forEach((project) => {
    const teamName = project.team?.name ?? 'Other';
    if (!groups.has(teamName)) groups.set(teamName, []);
    groups.get(teamName).push(project);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, items]) => ({
      team,
      projects: [...items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

/**
 * Native select that turns ink while it narrows the results. `stacked` (filters sheet) gives it
 * a visible label above; inline it is a compact hairline control (`width`) labelled for
 * assistive tech only.
 */
function FilterSelect({
  label,
  value,
  onChange,
  stacked,
  width = 'w-auto min-w-[8rem]',
  children,
}) {
  const select = (
    <Select
      aria-label={stacked ? undefined : label}
      title={stacked ? undefined : label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        !stacked && [QUIET_CONTROL, 'h-8 rounded-md text-[13px] text-fg-muted', width],
        value && ACTIVE_CONTROL,
      )}
    >
      {children}
    </Select>
  );
  return stacked ? <FormField label={label}>{select}</FormField> : select;
}

/** `includeArchived`: archived projects are left out of the search unless this is ticked. */
function ArchivedToggle({ checked, onChange, stacked }) {
  // The URL, hence `checked`, updates in a transition: show the click at once until it has.
  const [pending, setPending] = useState(null);
  if (pending !== null && pending === checked) setPending(null);
  const shown = pending ?? checked;

  return (
    <label
      className={cn(
        'inline-flex cursor-pointer select-none items-center gap-2 rounded-md text-[13px]',
        'transition-colors duration-150',
        shown ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
        stacked ? 'min-h-11 w-full border border-line px-3' : 'h-8 whitespace-nowrap px-1',
      )}
    >
      <input
        type="checkbox"
        checked={shown}
        onChange={(event) => {
          setPending(event.target.checked);
          onChange(event.target.checked);
        }}
        className="focus-ring h-3.5 w-3.5 shrink-0 cursor-pointer rounded-sm accent-brand-600"
      />
      Include archived projects
    </label>
  );
}

/** A filter without a select of its own (set by a link, e.g. from the dashboard), removable. */
function RemovableChip({ label, onRemove }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 max-w-full items-center gap-1 rounded-md border pl-2.5 pr-0.5 text-[13px]',
        ACTIVE_CONTROL,
      )}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        title="Remove filter"
        className="focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

/** The filter selects; inline in the bar on wide screens, stacked in the sheet on phones. */
function FilterFields({ filters, onChange, projectGroups, stacked = false }) {
  return (
    <>
      <FilterSelect
        label="Status"
        value={filters.status}
        onChange={(status) => onChange({ status })}
        stacked={stacked}
      >
        {renderOptions(STATUS_OPTIONS)}
      </FilterSelect>
      <FilterSelect
        label="Priority"
        value={filters.priority}
        onChange={(priority) => onChange({ priority })}
        stacked={stacked}
      >
        {renderOptions(PRIORITY_OPTIONS)}
      </FilterSelect>
      <FilterSelect
        label="Assignee"
        value={filters.assignee}
        onChange={(assignee) => onChange({ assignee })}
        stacked={stacked}
      >
        {renderOptions(ASSIGNEE_OPTIONS)}
      </FilterSelect>
      <FilterSelect
        label="Due date"
        value={filters.due}
        onChange={(due) => onChange({ due })}
        stacked={stacked}
      >
        {renderOptions(DUE_OPTIONS)}
      </FilterSelect>
      {/* Any project can be picked (archived ones too), whatever the archived toggle says. */}
      <FilterSelect
        label="Project"
        value={filters.project}
        onChange={(project) => onChange({ project })}
        stacked={stacked}
        width="w-40"
      >
        <option value="">All projects</option>
        {projectGroups.map((group) => (
          <optgroup key={group.team} label={group.team}>
            {group.projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
                {project.status === 'archived' ? ' (archived)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </FilterSelect>
      {filters.completedWithin && (
        <div className={stacked ? 'flex' : 'contents'}>
          <RemovableChip
            label={describeCompletedWithin(filters.completedWithin)}
            onRemove={() => onChange({ completedWithin: '' })}
          />
        </div>
      )}
    </>
  );
}

/**
 * Search box, sort and the filters of the task search. `onChange(patch)` receives the changed
 * filters; the search box is controlled separately (it is debounced by the page). `collapsed`
 * (phones) folds the filters into a "Filters (n)" bottom sheet so results start on screen one.
 */
export function TaskFilterBar({
  filters,
  onChange,
  searchValue,
  onSearchChange,
  projects = [],
  activeCount = 0,
  total,
  canClear,
  onClear,
  collapsed = false,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const projectGroups = useMemo(() => groupProjectsByTeam(projects), [projects]);

  const search = (
    <SearchInput
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search title, description, label or key (e.g. WEB-7)"
      aria-label="Search the task list"
      maxLength={200}
      className="min-w-0 flex-1"
      inputClassName={QUIET_CONTROL}
    />
  );
  const sort = (
    <div className={cn('flex items-center gap-2.5', collapsed && 'min-w-0 flex-1')}>
      <span aria-hidden="true" className={cn(CONTROL_EYEBROW, collapsed && 'hidden sm:inline')}>
        Sort
      </span>
      <Select
        aria-label="Sort tasks"
        value={filters.sort}
        onChange={(event) => onChange({ sort: event.target.value })}
        className={cn(
          QUIET_CONTROL,
          collapsed ? 'min-w-0 flex-1' : 'h-8 w-48 rounded-md text-[13px]',
        )}
      >
        {renderOptions(TASK_SORT_OPTIONS)}
      </Select>
    </div>
  );
  const archivedToggle = (
    <ArchivedToggle
      checked={filters.includeArchived === 'true'}
      onChange={(checked) => onChange({ includeArchived: checked ? 'true' : '' })}
      stacked={collapsed}
    />
  );

  if (!collapsed) {
    return (
      <div className="border-b border-line px-5 py-4">
        {/* The archived toggle widens what is searched, so it sits with the search box. */}
        <div className="flex items-center gap-4">
          {search}
          <div className="shrink-0">{archivedToggle}</div>
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line" />
          {sort}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <FilterFields filters={filters} onChange={onChange} projectGroups={projectGroups} />
          {canClear && (
            <Button variant="ghost" size="sm" icon={X} onClick={onClear} className="ml-auto">
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-line p-4">
      {search}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
        >
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded bg-fg px-1 font-mono text-[11px] font-medium leading-none tabular-nums text-canvas">
              {activeCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </Button>
        {sort}
      </div>

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        description="Changes apply to the list right away."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              icon={X}
              onClick={onClear}
              disabled={!canClear}
              className="mr-auto"
            >
              Clear all
            </Button>
            <Button onClick={() => setSheetOpen(false)}>
              {total === undefined ? 'Show tasks' : `Show ${pluralize(total, 'task')}`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <FilterFields
            filters={filters}
            onChange={onChange}
            projectGroups={projectGroups}
            stacked
          />
          {archivedToggle}
        </div>
      </Modal>
    </div>
  );
}
