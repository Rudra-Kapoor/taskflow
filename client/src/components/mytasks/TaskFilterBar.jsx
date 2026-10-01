import { useMemo, useState } from 'react';
import { ArrowDownUp, CheckCircle2, SlidersHorizontal, X } from 'lucide-react';
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

/** Highlight of a control that currently narrows the results. */
const ACTIVE_CONTROL =
  'border-brand-300 bg-brand-50/70 font-medium text-brand-700 dark:border-brand-400/40 dark:bg-brand-500/10 dark:text-brand-200';

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
 * Native select that is highlighted while it narrows the results. `stacked` (filters sheet)
 * gives it a visible label above; inline it is compact (`width`) and labelled for assistive
 * tech only.
 */
function FilterSelect({
  label,
  value,
  onChange,
  stacked,
  width = 'w-auto min-w-[9rem]',
  children,
}) {
  const select = (
    <Select
      aria-label={stacked ? undefined : label}
      title={stacked ? undefined : label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(!stacked && ['h-8 text-[13px]', width], value && ACTIVE_CONTROL)}
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
        'inline-flex cursor-pointer select-none items-center gap-2.5 rounded-lg text-[13px] font-medium',
        'transition-colors duration-150',
        shown ? 'text-fg' : 'text-fg-muted hover:text-fg',
        stacked ? 'min-h-11 w-full border border-line px-3' : 'h-8 px-1.5',
      )}
    >
      <input
        type="checkbox"
        checked={shown}
        onChange={(event) => {
          setPending(event.target.checked);
          onChange(event.target.checked);
        }}
        className="focus-ring h-4 w-4 shrink-0 cursor-pointer rounded accent-brand-600"
      />
      Include archived projects
    </label>
  );
}

/** A filter without a select of its own (set by a link, e.g. from the dashboard), removable. */
function RemovableChip({ icon: Icon, label, onRemove }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 max-w-full items-center gap-1 rounded-full border pl-3 pr-0.5 text-[13px]',
        ACTIVE_CONTROL,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        title="Remove filter"
        className="focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-600 transition-colors hover:bg-brand-100 hover:text-brand-800 dark:text-brand-300 dark:hover:bg-brand-500/20 dark:hover:text-brand-100"
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
        width="w-48"
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
            icon={CheckCircle2}
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
    />
  );
  const sort = (
    <div className={cn('flex items-center gap-2', collapsed && 'min-w-0 flex-1')}>
      <ArrowDownUp className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      <Select
        aria-label="Sort tasks"
        value={filters.sort}
        onChange={(event) => onChange({ sort: event.target.value })}
        className={collapsed ? 'min-w-0 flex-1' : 'w-48'}
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
      <div className="space-y-3 border-b border-line p-5">
        {/* The archived toggle widens what is searched, so it sits with the search box. */}
        <div className="flex items-center gap-3">
          {search}
          <div className="shrink-0">{archivedToggle}</div>
          {sort}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          icon={SlidersHorizontal}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
        >
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 min-w-[20px] rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
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
