import { useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * Underline tabs (ink indicator, mono counts). Tabs: `{ value, label, count?, icon? }`. Arrow keys move between tabs.
 * Pair panels with `id={`tabpanel-${value}`}` if you need explicit tab/panel wiring.
 */
export function Tabs({ tabs, value, onChange, className, 'aria-label': ariaLabel }) {
  const buttonsRef = useRef([]);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value),
  );

  const handleKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[nextIndex].value);
    buttonsRef.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'scrollbar-none flex items-center gap-5 overflow-x-auto border-b border-line',
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        const hasCount = tab.count !== undefined && tab.count !== null;
        return (
          <button
            key={tab.value}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'focus-ring relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t px-0.5',
              // Inset ring: the scrollable tab list would clip one drawn outside the tab.
              'focus-visible:ring-inset focus-visible:ring-offset-0',
              'text-[13px] font-medium transition-colors duration-150',
              active ? 'text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {tab.label}
            {hasCount && (
              <span
                className={cn(
                  'font-mono text-[11px] font-normal leading-none tabular-nums',
                  active ? 'text-fg-muted' : 'text-fg-subtle',
                )}
              >
                {tab.count}
              </span>
            )}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-x-0 bottom-0 h-0.5 transition-colors duration-150',
                active ? 'bg-fg' : 'bg-transparent',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
