import { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Search field with icon and clear button; `onChange` receives the string value.
 * Escape clears the value. `trailing` (e.g. a <Kbd> hint) shows while the field is empty.
 * `className` styles the wrapper.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  inputClassName,
  autoFocus,
  inputRef,
  trailing,
  onKeyDown,
  'aria-label': ariaLabel,
  ...props
}) {
  const localRef = useRef(null);
  const ref = inputRef ?? localRef;
  const hasValue = Boolean(value);

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && hasValue) {
      event.preventDefault();
      event.stopPropagation();
      onChange('');
    }
  };

  return (
    <div className={cn('group relative', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle transition-colors group-focus-within:text-fg"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'input-base h-9 pl-9 [&::-webkit-search-cancel-button]:hidden',
          hasValue ? 'pr-9' : trailing ? 'pr-20' : 'pr-3',
          inputClassName,
        )}
        {...props}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
          aria-label="Clear search"
          className="focus-ring absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : (
        trailing && (
          <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {trailing}
          </div>
        )
      )}
    </div>
  );
}
