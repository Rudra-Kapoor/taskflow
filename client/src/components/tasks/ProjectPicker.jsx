import { useMemo } from 'react';
import { OptionPicker } from './OptionPicker';
import { PickerTrigger } from './PickerTrigger';

const FALLBACK_COLOR = '#6366f1';
const SEARCH_THRESHOLD = 6;

function ColorDot({ color }) {
  return (
    <span
      aria-hidden="true"
      className="h-2.5 w-2.5 shrink-0 rounded-[4px] shadow-sm"
      style={{ backgroundColor: color || FALLBACK_COLOR }}
    />
  );
}

/** Project select for the task form: colour dot, name and key (searchable for long lists). */
export function ProjectPicker({ value, onChange, projects, loading = false, id }) {
  const options = useMemo(
    () =>
      projects.map((project) => ({
        value: project._id,
        label: project.name,
        description: [project.key, project.team?.name].filter(Boolean).join(' · '),
        keywords: `${project.key} ${project.team?.name ?? ''}`,
        icon: <ColorDot color={project.color} />,
      })),
    [projects],
  );
  const selected = projects.find((project) => project._id === value);

  return (
    <OptionPicker
      trigger={
        <PickerTrigger id={id}>
          {selected ? (
            <>
              <ColorDot color={selected.color} />
              <span className="truncate">{selected.name}</span>
              <span className="shrink-0 font-mono text-xs text-fg-subtle">{selected.key}</span>
            </>
          ) : (
            <span className="truncate text-fg-subtle">
              {loading ? 'Loading projects…' : 'Select a project'}
            </span>
          )}
        </PickerTrigger>
      }
      options={options}
      value={value}
      onChange={onChange}
      label="Project"
      searchable={projects.length > SEARCH_THRESHOLD}
      searchPlaceholder="Search projects…"
      emptyText="No active projects"
      loading={loading}
      width="w-80"
    />
  );
}
