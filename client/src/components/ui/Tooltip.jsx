import { cloneElement, isValidElement, useId } from 'react';
import { cn } from '@/lib/cn';
import { joinIds } from '@/lib/dom';

const SIDES = {
  top: 'bottom-full mb-2 translate-y-1 group-hover/tooltip:translate-y-0',
  bottom: 'top-full mt-2 -translate-y-1 group-hover/tooltip:translate-y-0',
};

const ALIGNS = {
  center: 'left-1/2 -translate-x-1/2',
  start: 'left-0',
  end: 'right-0',
};

/**
 * Lightweight CSS-only tooltip (hover / keyboard focus). For icon buttons prefer the built-in
 * `title` of IconButton; use this for richer hints. `className` styles the wrapper,
 * `contentClassName` the bubble (e.g. a narrower max width inside a scrolling sidebar).
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  className,
  contentClassName,
}) {
  const id = useId();
  if (!content) return children;

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        'aria-describedby': joinIds(children.props['aria-describedby'], id),
      })
    : children;

  return (
    <span className={cn('group/tooltip relative inline-flex', className)}>
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          'pointer-events-none absolute z-50 w-max max-w-[16rem] rounded-md bg-slate-900 px-2 py-1',
          'text-xs font-medium leading-snug text-white opacity-0 shadow-lg transition duration-150',
          'group-hover/tooltip:opacity-100 group-hover/tooltip:delay-300',
          'group-has-[:focus-visible]/tooltip:translate-y-0 group-has-[:focus-visible]/tooltip:opacity-100',
          'dark:bg-slate-700',
          SIDES[side] ?? SIDES.top,
          ALIGNS[align] ?? ALIGNS.center,
          contentClassName,
        )}
      >
        {content}
      </span>
    </span>
  );
}
