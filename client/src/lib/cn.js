import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Custom tokens from tailwind.config.js, so conflicting classes resolve like built-in ones. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      colors: [
        'brand',
        'canvas',
        'surface',
        'surface-muted',
        'surface-hover',
        'line',
        'line-strong',
        'fg',
        'fg-muted',
        'fg-subtle',
      ],
    },
    classGroups: {
      'font-size': [{ text: ['2xs'] }],
      shadow: [{ shadow: ['xs', 'popover', 'inner-line'] }],
      ease: [{ ease: ['out-expo'] }],
      animate: [
        {
          animate: [
            'fade-in',
            'scale-in',
            'slide-up',
            'sheet-up',
            'slide-in-left',
            'slide-in-right',
            'dropdown-in',
            'shimmer',
            'float',
          ],
        },
      ],
    },
  },
});

/**
 * Joins class names conditionally (clsx) and resolves Tailwind conflicts (tailwind-merge): the
 * last class of a group wins, so `className` overrides a component's defaults.
 * @example cn('px-3 h-9', isActive && 'bg-brand-50', className) // className="h-8" -> "px-3 h-8"
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
