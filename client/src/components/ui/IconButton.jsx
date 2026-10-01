import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  ghost:
    'border-transparent text-fg-muted hover:bg-surface-hover hover:text-fg active:bg-surface-muted ' +
    'aria-expanded:bg-surface-hover aria-expanded:text-fg',
  secondary:
    'border-line-strong bg-surface text-fg-muted hover:border-fg-subtle/50 hover:bg-surface-hover ' +
    'hover:text-fg active:bg-surface-muted aria-expanded:bg-surface-hover aria-expanded:text-fg',
  danger:
    'border-transparent text-fg-muted hover:bg-danger/[0.08] hover:text-danger ' +
    'active:bg-danger/[0.12]',
};

const SIZES = {
  xs: { box: 'h-7 w-7 rounded-md', icon: 'h-3.5 w-3.5' },
  sm: { box: 'h-8 w-8 rounded-md', icon: 'h-4 w-4' },
  md: { box: 'h-9 w-9 rounded-md', icon: 'h-[18px] w-[18px]' },
  lg: { box: 'h-10 w-10 rounded-md', icon: 'h-5 w-5' },
};

/**
 * Square icon-only button. `label` is required: it becomes the accessible name and tooltip.
 * Extra `children` render inside the button (e.g. an absolutely positioned count badge).
 */
export const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    label,
    variant = 'ghost',
    size = 'md',
    type = 'button',
    className,
    children,
    ...props
  },
  ref,
) {
  const sizing = SIZES[size] ?? SIZES.md;

  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring relative inline-flex shrink-0 items-center justify-center border',
        'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant] ?? VARIANTS.ghost,
        sizing.box,
        className,
      )}
      {...props}
    >
      <Icon className={sizing.icon} aria-hidden="true" />
      {children}
    </button>
  );
});
