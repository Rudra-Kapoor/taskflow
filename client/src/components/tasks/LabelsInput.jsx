import { useRef, useState } from 'react';
import { LabelChip } from '@/components/ui';
import { cn } from '@/lib/cn';

export const MAX_LABELS = 10;
const MAX_LABEL_LENGTH = 30;
const NO_LABELS = [];

const normalize = (label) => label.trim().toLowerCase().slice(0, MAX_LABEL_LENGTH);

/**
 * Chip input for task labels: type and press Enter or comma (pasting "a, b" works too),
 * Backspace on an empty field removes the last chip. Labels are lower-cased and unique (max 10).
 * `variant="ghost"` drops the border until focused (task detail sidebar). `placeholder` replaces
 * the built-in typing hint (e.g. when the form already explains it).
 *
 * Edits apply to a local copy immediately, so quick successive edits build on each other even
 * when `value` comes back asynchronously (e.g. from the query cache); a new `value` wins.
 */
export function LabelsInput({
  value = NO_LABELS,
  onChange,
  disabled = false,
  variant = 'field',
  id,
  placeholder,
  className,
}) {
  const [labels, setLabels] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setLabels(value);
  }

  const full = labels.length >= MAX_LABELS;

  const commit = (next) => {
    setLabels(next);
    onChange(next);
  };

  const addLabels = (text) => {
    const next = [...labels];
    text
      .split(',')
      .map(normalize)
      .filter(Boolean)
      .forEach((label) => {
        if (!next.includes(label) && next.length < MAX_LABELS) next.push(label);
      });
    setDraft('');
    if (next.length !== labels.length) commit(next);
  };

  const removeLabel = (label) => commit(labels.filter((item) => item !== label));

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (draft.trim()) addLabels(draft);
    } else if (event.key === 'Backspace' && !draft && labels.length > 0) {
      event.preventDefault();
      removeLabel(labels[labels.length - 1]);
    }
  };

  const handleChange = (event) => {
    const text = event.target.value;
    if (text.includes(',')) addLabels(text);
    else setDraft(text);
  };

  if (disabled) {
    return labels.length ? (
      <div className={cn('flex flex-wrap gap-1', variant === 'ghost' && 'px-2 py-1', className)}>
        {labels.map((label) => (
          <LabelChip key={label} label={label} />
        ))}
      </div>
    ) : (
      <p className={cn('text-sm text-fg-muted', variant === 'ghost' && 'px-2 py-1', className)}>
        No labels
      </p>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'input-base flex min-h-9 cursor-text flex-wrap items-center gap-1 py-1.5',
        'focus-within:border-fg/60 focus-within:ring-2 focus-within:ring-brand-500/20',
        variant === 'ghost' &&
          'border-transparent bg-transparent px-1.5 shadow-none hover:border-transparent hover:bg-surface-hover focus-within:bg-surface focus-within:hover:border-fg/60',
        className,
      )}
    >
      {labels.map((label) => (
        <LabelChip key={label} label={label} onRemove={removeLabel} />
      ))}
      {full ? (
        <span className="px-1 text-xs text-fg-muted">Maximum of {MAX_LABELS} labels</span>
      ) : (
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && addLabels(draft)}
          maxLength={MAX_LABEL_LENGTH}
          placeholder={labels.length ? 'Add label…' : (placeholder ?? 'Type a label, then Enter')}
          aria-label={id ? undefined : 'Add label'}
          autoComplete="off"
          className="h-6 min-w-[7rem] flex-1 bg-transparent px-1 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
        />
      )}
    </div>
  );
}
