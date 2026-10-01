import { cn } from '@/lib/cn';

/** Outlined tags: colour lives in a hairline border + text-safe tone, never a tinted fill. */
const COLORS = {
  gray: 'border-line-strong text-fg-muted',
  brand: 'border-brand-600/35 text-brand-700 dark:border-brand-400/40 dark:text-brand-300',
  blue: 'border-info/30 text-info',
  green: 'border-success/30 text-success',
  yellow: 'border-warning/35 text-warning',
  orange: 'border-caution/30 text-caution',
  red: 'border-danger/30 text-danger',
  // Ink: the strongest neutral (e.g. the team owner).
  purple: 'border-fg/30 text-fg',
};

const DOTS = {
  gray: 'bg-status-todo',
  brand: 'bg-brand-500',
  blue: 'bg-status-progress',
  green: 'bg-status-done',
  yellow: 'bg-priority-medium',
  orange: 'bg-priority-high',
  red: 'bg-priority-urgent',
  purple: 'bg-fg',
};

const SIZES = {
  sm: 'h-5 gap-1 rounded-sm px-1.5 text-[11px]',
  md: 'h-[22px] gap-1.5 rounded-sm px-2 text-xs',
};

/** Small outlined tag for statuses, roles and counts (numbers are set in mono). */
export function Badge({ color = 'gray', size = 'md', dot = false, className, children, ...props }) {
  const numeric = typeof children === 'number';

  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center whitespace-nowrap border bg-transparent',
        'font-medium leading-none',
        numeric && 'font-mono tabular-nums',
        COLORS[color] ?? COLORS.gray,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOTS[color] ?? DOTS.gray)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
