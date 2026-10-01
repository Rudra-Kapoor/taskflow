import { useRef } from 'react';
import { cn } from '@/lib/cn';

const SIZES = {
  sm: { button: 'h-7 px-2.5 text-xs', icon: 'h-3.5 w-3.5' },
  md: { button: 'h-8 px-3 text-[13px]', icon: 'h-4 w-4' },
};

/**
 * Pill-style single choice (e.g. Board / List view). Arrow keys move the selection.
 * Options: `{ value, label, icon?, title? }` - omit `label` for icon-only segments (give `title`).
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}) {
  const buttonsRef = useRef([]);
  const sizing = SIZES[size] ?? SIZES.md;
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const handleKeyDown = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const nextIndex = (index + step + options.length) % options.length;
    onChange(options[nextIndex].value);
    buttonsRef.current[nextIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5',
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label ? undefined : option.title}
            title={option.title}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'focus-ring inline-flex items-center justify-center gap-1.5 rounded-md font-medium',
              'transition-[color,background-color,box-shadow] duration-150',
              sizing.button,
              active
                ? 'bg-surface text-fg shadow-sm ring-1 ring-line dark:bg-surface-hover'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className={sizing.icon} aria-hidden="true" />}
            {option.label && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
