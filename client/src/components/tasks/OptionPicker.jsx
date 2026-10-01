import { cloneElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Popover, Spinner } from '@/components/ui';
import { cn } from '@/lib/cn';
import { mergeRefs } from '@/lib/dom';

const matches = (option, needle) =>
  `${option.label} ${option.keywords ?? ''}`.toLowerCase().includes(needle);

/**
 * Select-style picker: the `trigger` element (a button) opens a listbox in a popover.
 *
 * - `options`: `{ value, label, icon?, description?, keywords? }[]` (`icon` is a node)
 * - `searchable`: adds a filter field; focus stays in it while ↑ / ↓ move the highlight
 * - Keyboard: ↑ / ↓ (also open it from the trigger), Home / End, Enter or Space to pick,
 *   Escape closes and Tab moves on. The current value is marked with a check.
 */
export function OptionPicker({
  trigger,
  options,
  value,
  onChange,
  label,
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  loading = false,
  disabled = false,
  align = 'start',
  width = 'w-60',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;

  const triggerRef = trigger.ref;
  const mergedRef = useMemo(() => mergeRefs(anchorRef, triggerRef), [triggerRef]);

  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => matches(option, needle)) : options;
  }, [options, query]);

  const activeId = activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeId]);

  const openPicker = () => {
    setQuery('');
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };

  const choose = (option) => {
    if (!option) return;
    setOpen(false);
    anchorRef.current?.focus({ preventScroll: true });
    if (option.value !== value) onChange(option.value);
  };

  const moveActive = (step) => {
    const count = visibleOptions.length;
    if (count === 0) return;
    setActiveIndex((index) => (index + step + count) % count);
  };

  const handleKeyDown = (event) => {
    const editingText = event.target instanceof HTMLInputElement;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
      case 'End':
        if (editingText) return;
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? 0 : visibleOptions.length - 1);
        break;
      case 'Enter':
        event.preventDefault();
        choose(visibleOptions[activeIndex]);
        break;
      case ' ':
        if (editingText) return;
        event.preventDefault();
        choose(visibleOptions[activeIndex]);
        break;
    }
  };

  const triggerProps = trigger.props;
  const triggerElement = cloneElement(trigger, {
    ref: mergedRef,
    disabled: disabled || triggerProps.disabled,
    'aria-haspopup': 'listbox',
    'aria-expanded': open,
    'aria-controls': open ? listboxId : undefined,
    onClick: (event) => {
      triggerProps.onClick?.(event);
      if (event.defaultPrevented) return;
      if (open) setOpen(false);
      else openPicker();
    },
    onKeyDown: (event) => {
      triggerProps.onKeyDown?.(event);
      if (event.defaultPrevented || open) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openPicker();
      }
    },
  });

  return (
    <>
      {triggerElement}
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align={align}
        initialFocus="first"
        closeOnTab
        className={cn('flex max-h-[min(22rem,70vh)] max-w-[calc(100vw-1rem)] flex-col', width)}
      >
        {searchable && (
          <div className="shrink-0 border-b border-line p-1.5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle"
                aria-hidden="true"
              />
              <input
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listboxId}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-label={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="h-8 w-full rounded-md bg-transparent pl-8 pr-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-sm text-fg-muted">
            <Spinner size="sm" /> Loading…
          </div>
        ) : visibleOptions.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-fg-muted">{emptyText}</p>
        ) : (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            tabIndex={searchable ? -1 : 0}
            aria-activedescendant={searchable ? undefined : activeId}
            onKeyDown={searchable ? undefined : handleKeyDown}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1 outline-none"
          >
            {visibleOptions.map((option, index) => {
              const selected = option.value === value;
              return (
                <li
                  key={option.value || '__empty__'}
                  id={`${baseId}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex min-h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-fg',
                    index === activeIndex && 'bg-surface-hover',
                  )}
                >
                  {option.icon && <span className="flex shrink-0 items-center">{option.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate', selected && 'font-medium')}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block truncate text-xs text-fg-muted">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <Check
                      className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Popover>
    </>
  );
}
