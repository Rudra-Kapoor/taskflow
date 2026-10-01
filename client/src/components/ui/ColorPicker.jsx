import { useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COLOR_NAMES, PROJECT_COLORS } from '@/lib/constants';

const ARROW_STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Colour swatches as a radio group: one tab stop (the selected swatch), arrow keys move and
 * select, Home / End jump to the ends. `onChange` receives the hex value. 36px hit targets; five
 * per row on phones.
 */
export function ColorPicker({
  value,
  onChange,
  colors = PROJECT_COLORS,
  className,
  'aria-label': ariaLabel = 'Colour',
}) {
  const swatchesRef = useRef([]);
  const selected = value?.toLowerCase();
  const selectedIndex = colors.findIndex((color) => color.toLowerCase() === selected);
  const focusIndex = Math.max(0, selectedIndex);

  const select = (index) => {
    onChange(colors[index]);
    swatchesRef.current[index]?.focus();
  };

  const handleKeyDown = (event, index) => {
    let next;
    if (event.key in ARROW_STEPS) {
      next = (index + ARROW_STEPS[event.key] + colors.length) % colors.length;
    } else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = colors.length - 1;
    else return;
    event.preventDefault();
    select(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'grid grid-cols-[repeat(5,2.25rem)] justify-between gap-y-2 sm:flex sm:flex-wrap sm:gap-1',
        className,
      )}
    >
      {colors.map((color, index) => {
        const isSelected = index === selectedIndex;
        const name = COLOR_NAMES[color.toLowerCase()] ?? color;
        return (
          <button
            key={color}
            ref={(element) => {
              swatchesRef.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={name}
            title={name}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(color)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="focus-ring group flex h-9 w-9 items-center justify-center rounded-full"
          >
            <span
              style={{ backgroundColor: color, '--tw-ring-color': color }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full shadow-sm',
                'transition-transform duration-150 group-hover:scale-110',
                isSelected && 'ring-2 ring-offset-2 ring-offset-surface',
              )}
            >
              {isSelected && (
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden="true" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
